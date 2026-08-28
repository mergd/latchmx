import { router, usePathname } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

import {
  guestFromInvite,
  loadAccount,
  persistAccount,
  residentFromProfile,
} from '@/lib/account';
import { capture, resetAnalytics } from '@/lib/analytics';
import {
  authorizationCodeFromUrl,
  authorizationUrl,
  exchangeAuthorizationCode,
  extractAuthorizationCode,
  fetchDoors,
  refreshAccessToken,
  releaseDoor,
} from '@/lib/bmx-api';
import { bmxConfig, hasBmxCredentials } from '@/lib/config';
import { createDemoStore, DEMO_ENABLED_STORAGE, isDemoSecret } from '@/lib/demo';
import { mockAccount, mockBuildingName, mockDoors } from '@/lib/mock-building';
import {
  createKey as createKeyRequest,
  fetchGuestSession,
  guestUnlock,
  isDeadKeyError,
  listKeys as listKeysRequest,
  pingGuestSession,
  revokeKey as revokeKeyRequest,
} from '@/lib/keys';
import { storageGet, storageRemove, storageSet } from '@/lib/storage';
import {
  DOOR_OPEN_MS,
  type Account,
  type AccountProfile,
  type AuthTokens,
  type CreatedKey,
  type Door,
  type GuestInvite,
  type IssuedKey,
  type KeyTtl,
  type SessionMode,
} from '@/lib/types';
import {
  emptyArrangement,
  nextGroup,
  parseArrangement,
  placeDoor,
  placeGroup,
  resolveGroup,
  type DoorArrangement,
} from '@/lib/zones';

const TOKEN_KEY = 'latch.tokens';
const demoStore = createDemoStore(
  { get: storageGet, set: storageSet },
  () => Crypto.randomUUID(),
  () => Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'latch://',
);
const SPLASH_FALLBACK_MS = 8000;
const LOAD_DOORS_MS = 15_000;

type SessionContextValue = {
  isDemo: boolean;
  startDemo: () => Promise<void>;
  mode: SessionMode;
  account: Account | null;
  doors: Door[];
  buildingName: string;
  canSignIn: boolean;
  bootError: string | null;
  unlock: (door: Door) => Promise<void>;
  openSignIn: () => Promise<void>;
  signInUrl: string;
  completeSignIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshDoors: () => Promise<void>;
  zoneByDoorId: Record<string, string>;
  cycleDoorZone: (door: Door) => void;
  openUntilByDoorId: Record<string, number>;
  arrangement: DoorArrangement;
  reorderGroups: (groupIds: string[]) => void;
  reorderDoors: (groupId: string, doorIds: string[]) => void;
  dropGroup: (
    groupIds: string[],
    draggedId: string,
    beforeId: string | null,
  ) => void;
  dropDoor: (
    door: Door,
    fromGroupId: string,
    toGroupId: string,
    fromDoorIds: string[],
    toDoorIds: string[],
    beforeId: string | null,
  ) => void;
  hiddenByDoorId: Record<string, boolean>;
  hideDoor: (door: Door) => void;
  showDoor: (door: Door) => void;
  hideDoors: (doors: Door[]) => void;
  resetLayout: () => void;
  guestExpiresAt: number | null;
  guestInvite: GuestInvite | null;
  createKey: (input: {
    ttl: KeyTtl;
    label: string;
    note: string;
    inviterName: string;
    contact: string;
  }) => Promise<CreatedKey>;
  listKeys: () => Promise<IssuedKey[]>;
  revokeKey: (keyId: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<boolean | null>(null);
  const guestSecret = useGuestSecret();
  useEffect(() => {
    void storageGet(DEMO_ENABLED_STORAGE).then(value => setDemo(value === 'true'));
  }, []);
  const startDemo = useCallback(async () => {
    await storageSet(DEMO_ENABLED_STORAGE, 'true');
    setDemo(true);
    router.replace('/');
  }, []);
  const exitDemo = useCallback(async () => {
    await storageRemove(DEMO_ENABLED_STORAGE);
    setDemo(false);
    router.replace('/');
  }, []);
  if (demo === null) return null;
  const isDemo = guestSecret !== null ? isDemoSecret(guestSecret) : demo;
  return (
    <SessionState key={isDemo ? 'demo' : 'live'} demo={isDemo} startDemo={startDemo} exitDemo={exitDemo}>
      {children}
    </SessionState>
  );
}

function SessionState({ children, demo, startDemo, exitDemo }: {
  children: ReactNode; demo: boolean; startDemo: () => Promise<void>; exitDemo: () => Promise<void>;
}) {
  const ZONE_KEY = demo ? 'latch.demo.zones' : 'latch.zones';
  const LAYOUT_KEY = demo ? 'latch.demo.layout' : 'latch.layout';
  const HIDDEN_KEY = demo ? 'latch.demo.hidden' : 'latch.hidden';
  const [mode, setMode] = useState<SessionMode>('loading');
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [doors, setDoors] = useState<Door[]>([]);
  const [buildingName, setBuildingName] = useState('');
  const [bootError, setBootError] = useState<string | null>(null);
  const [zoneByDoorId, setZoneByDoorId] = useState<Record<string, string>>(
    {},
  );
  const [arrangement, setArrangement] = useState<DoorArrangement>(emptyArrangement);
  const [hiddenByDoorId, setHiddenByDoorId] = useState<Record<string, boolean>>(
    {},
  );
  const [openUntilByDoorId, setOpenUntilByDoorId] = useState<Record<string, number>>(
    {},
  );
  const [guestExpiresAt, setGuestExpiresAt] = useState<number | null>(null);
  const [guestInvite, setGuestInvite] = useState<GuestInvite | null>(null);
  const guestSecret = useGuestSecret();
  const bootSeq = useRef(0);
  const seenAuthUrl = useRef<string | null>(null);
  const signInInFlight = useRef<{
    code: string;
    promise: Promise<void>;
  } | null>(null);

  const persistTokens = useCallback(async (next: AuthTokens | null) => {
    setTokens(next);
    if (next === null) {
      await storageRemove(TOKEN_KEY, { secure: true });
      return;
    }
    await storageSet(TOKEN_KEY, JSON.stringify(next), { secure: true });
  }, []);

  const loadGuest = useCallback(async (secret: string) => {
    const seq = bootSeq.current;
    try {
      const snapshot = await (demo ? demoStore.guest(secret) : fetchGuestSession(secret));
      if (seq !== bootSeq.current) {
        return;
      }
      setDoors(snapshot.doors);
      setBuildingName(snapshot.buildingName);
      setGuestExpiresAt(snapshot.expiresAt);
      setGuestInvite(snapshot.invite);
      setBootError(null);
      setMode('guest');
      if (demo) {
        setOpenUntilByDoorId({});
        setAccount({ ...mockAccount, kind: 'guest', name: snapshot.invite.label });
        return;
      }
      const stored = await loadAccount();
      if (seq !== bootSeq.current) {
        return;
      }
      const next = guestFromInvite(stored, snapshot.invite, snapshot.buildingName);
      setAccount(next);
      await persistAccount(next);
    } catch (error) {
      if (seq !== bootSeq.current) {
        return;
      }
      setDoors([]);
      setGuestExpiresAt(null);
      setGuestInvite(null);
      setMode('guest');
      if (demo) {
        setAccount(null);
        setBootError(error instanceof Error ? error.message : 'This key is dead.');
        return;
      }
      const stored = await loadAccount();
      if (seq !== bootSeq.current) {
        return;
      }
      if (stored?.kind === 'guest') {
        setAccount(stored);
      } else {
        setAccount(null);
      }
      setBootError(error instanceof Error ? error.message : 'This key is dead.');
    }
  }, [demo]);

  const loadLiveDoors = useCallback(async (current: AuthTokens) => {
    if (demo) return;
    const seq = bootSeq.current;
    const fresh = await ensureFreshTokens(current);
    if (seq !== bootSeq.current) {
      return;
    }
    if (fresh.accessToken !== current.accessToken) {
      await persistTokens(fresh);
    }
    if (seq !== bootSeq.current) {
      return;
    }
    const snapshot = unpackLiveBuilding(await fetchDoors(fresh.accessToken));
    if (seq !== bootSeq.current) {
      return;
    }
    const nextBuilding = snapshot.doors[0]?.buildingName ?? 'Your building';
    setDoors(snapshot.doors);
    setBuildingName(nextBuilding);
    setBootError(null);
    setMode('signed_in');
    const stored = await loadAccount();
    if (seq !== bootSeq.current) {
      return;
    }
    const next = residentFromProfile(stored, snapshot.account, nextBuilding);
    setAccount(next);
    await persistAccount(next);
  }, [demo, persistTokens]);

  useEffect(() => {
    const seq = ++bootSeq.current;

    async function hydrate() {
      if (guestSecret !== null) {
        await loadGuest(guestSecret);
        return;
      }
      try {
        const stored = demo ? null : await storageGet(TOKEN_KEY, { secure: true });
        const storedZones = await storageGet(ZONE_KEY);
        const storedLayout = await storageGet(LAYOUT_KEY);
        const storedHidden = await storageGet(HIDDEN_KEY);
        const storedAccount = demo ? mockAccount : await loadAccount();
        if (seq !== bootSeq.current) {
          return;
        }
        setZoneByDoorId(parseZones(storedZones));
        setArrangement(parseArrangement(storedLayout));
        setHiddenByDoorId(parseHidden(storedHidden));
        if (storedAccount?.kind === 'resident') {
          setAccount(storedAccount);
        }
        if (demo) {
          setDoors(mockDoors);
          setBuildingName(mockBuildingName);
          setGuestExpiresAt(null);
          setGuestInvite(null);
          setOpenUntilByDoorId({});
          setBootError(null);
          setMode('signed_in');
          return;
        }
        const parsed = parseTokens(stored);
        if (parsed === null) {
          setMode('signed_out');
          return;
        }
        setTokens(parsed);
        try {
          await withTimeout(
            loadLiveDoors(parsed),
            LOAD_DOORS_MS,
            'Timed out loading your building.',
          );
          if (seq !== bootSeq.current) {
            return;
          }
          setBootError(null);
        } catch (error) {
          if (seq !== bootSeq.current) {
            return;
          }
          bootSeq.current += 1;
          setMode('signed_in');
          setBootError(
            error instanceof Error
              ? error.message
              : 'Could not load your building.',
          );
        }
      } catch (error) {
        if (seq !== bootSeq.current) {
          return;
        }
        setTokens(null);
        setAccount(null);
        setDoors([]);
        setBuildingName('');
        setMode('signed_out');
        setBootError(
          error instanceof Error
            ? error.message
            : 'Could not load your building.',
        );
      }
    }

    void hydrate();
    return () => {
      if (bootSeq.current === seq) {
        bootSeq.current += 1;
      }
    };
  }, [demo, ZONE_KEY, LAYOUT_KEY, HIDDEN_KEY, guestSecret, loadGuest, loadLiveDoors]);

  useEffect(() => {
    if (guestSecret === null || mode !== 'guest' || bootError !== null) {
      return;
    }
    const check = () => {
      void (demo ? demoStore.guest(guestSecret) : pingGuestSession(guestSecret)).catch((error: unknown) => {
        if (!isDeadKeyError(error)) {
          return;
        }
        setDoors([]);
        setGuestExpiresAt(null);
        setGuestInvite(null);
        setBootError(
          error instanceof Error ? error.message : 'This key is dead.',
        );
      });
    };
    const interval = setInterval(check, 4000);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      clearInterval(interval);
      app.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [bootError, demo, guestSecret, mode]);

  useEffect(() => {
    if (mode === 'loading') {
      return;
    }
    void SplashScreen.hideAsync();
  }, [mode]);

  useEffect(() => {
    const id = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, SPLASH_FALLBACK_MS);
    return () => {
      clearTimeout(id);
    };
  }, []);

  const unlock = useCallback(
    async (door: Door) => {
      if (door.disabled) {
        throw new Error('This door is closed right now.');
      }
      if (door.heldOpen || (openUntilByDoorId[door.id] ?? 0) > Date.now()) {
        return;
      }
      if (demo) {
        await demoStore.unlock(door, guestSecret);
        setOpenUntilByDoorId(current => ({ ...current, [door.id]: Date.now() + DOOR_OPEN_MS }));
        return;
      }
      if (guestSecret !== null) {
        try {
          await guestUnlock(guestSecret, door);
          setOpenUntilByDoorId((current) => ({
            ...current,
            [door.id]: Date.now() + DOOR_OPEN_MS,
          }));
          capture('guest_door_unlocked', {
            door_id: door.id,
            door_name: door.name,
            building_id: door.buildingId,
          });
        } catch (error) {
          capture('guest_door_unlock_failed', {
            door_id: door.id,
            door_name: door.name,
            building_id: door.buildingId,
          });
          if (isDeadKeyError(error)) {
            setDoors([]);
            setGuestExpiresAt(null);
            setGuestInvite(null);
            setBootError(error instanceof Error ? error.message : 'This key is dead.');
          }
          throw error;
        }
        return;
      }
      if (tokens === null) {
        throw new Error('Sign in to unlock.');
      }
      const fresh = await ensureFreshTokens(tokens);
      if (fresh.accessToken !== tokens.accessToken) {
        await persistTokens(fresh);
      }
      try {
        await releaseDoor(fresh.accessToken, door);
        setOpenUntilByDoorId((current) => ({
          ...current,
          [door.id]: Date.now() + DOOR_OPEN_MS,
        }));
        capture('door_unlocked', {
          door_id: door.id,
          door_name: door.name,
          building_id: door.buildingId,
        });
      } catch (error) {
        capture('door_unlock_failed', {
          door_id: door.id,
          door_name: door.name,
          building_id: door.buildingId,
        });
        throw error;
      }
    },
    [demo, guestSecret, openUntilByDoorId, persistTokens, tokens],
  );

  const signOut = useCallback(async () => {
    if (demo) {
      await exitDemo();
      return;
    }
    capture('signed_out');
    resetAnalytics();
    await persistTokens(null);
    await persistAccount(null);
    setAccount(null);
    setDoors([]);
    setBuildingName('');
    setGuestInvite(null);
    setBootError(null);
    setMode('signed_out');
  }, [demo, exitDemo, persistTokens]);

  const signInUrl = useMemo(
    () => (hasBmxCredentials() ? authorizationUrl(bmxConfig.redirectUri) : ''),
    [],
  );

  const openSignIn = useCallback(async () => {
    if (signInUrl.length === 0) {
      throw new Error('ButterflyMX credentials are missing.');
    }
    if (Platform.OS !== 'web') {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = signInUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [signInUrl]);

  const completeSignIn = useCallback(
    async (code: string) => {
      if (demo) throw new Error('Exit demo before signing in.');
      const secret = extractAuthorizationCode(code);
      if (secret.length === 0) {
        throw new Error('Paste the authorization code from ButterflyMX.');
      }
      if (signInInFlight.current?.code === secret) {
        return signInInFlight.current.promise;
      }
      const promise = (async () => {
        const nextTokens = await exchangeAuthorizationCode(
          secret,
          bmxConfig.redirectUri,
        );
        await persistTokens(nextTokens);
        await loadLiveDoors(nextTokens);
        setBootError(null);
        capture('signed_in');
      })();
      signInInFlight.current = { code: secret, promise };
      try {
        await promise;
      } finally {
        if (signInInFlight.current?.code === secret) {
          signInInFlight.current = null;
        }
      }
    },
    [demo, loadLiveDoors, persistTokens],
  );

  useEffect(() => {
    if (demo || mode === 'loading' || guestSecret !== null) {
      return;
    }

    const consume = (url: string | null) => {
      if (url === null || url === seenAuthUrl.current) {
        return;
      }
      const code = authorizationCodeFromUrl(url);
      if (code === null) {
        return;
      }
      seenAuthUrl.current = url;
      void completeSignIn(code).catch((error) => {
        setBootError(
          error instanceof Error ? error.message : 'Could not complete sign-in.',
        );
      });
    };

    void Linking.getInitialURL().then(consume);
    const subscription = Linking.addEventListener('url', (event) => {
      consume(event.url);
    });
    return () => {
      subscription.remove();
    };
  }, [completeSignIn, demo, guestSecret, mode]);

  const persistArrangement = useCallback((next: DoorArrangement) => {
    setArrangement(next);
    void storageSet(LAYOUT_KEY, JSON.stringify(next));
  }, [LAYOUT_KEY]);

  const cycleDoorZone = useCallback((door: Door) => {
    setZoneByDoorId((current) => {
      const from = resolveGroup(door, current);
      const to = nextGroup(door, from);
      const next = {
        ...current,
        [door.id]: to,
      };
      void storageSet(ZONE_KEY, JSON.stringify(next));
      setArrangement((layout) => {
        const without = {
          ...layout.doorOrder,
          [from]: (layout.doorOrder[from] ?? []).filter((id) => id !== door.id),
        };
        const updated: DoorArrangement = {
          ...layout,
          doorOrder: {
            ...without,
            [to]: [...(without[to] ?? []).filter((id) => id !== door.id), door.id],
          },
        };
        void storageSet(LAYOUT_KEY, JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  }, [LAYOUT_KEY, ZONE_KEY]);

  const reorderGroups = useCallback(
    (groupIds: string[]) => {
      persistArrangement({ ...arrangement, groupOrder: groupIds });
    },
    [arrangement, persistArrangement],
  );

  const reorderDoors = useCallback(
    (groupId: string, doorIds: string[]) => {
      persistArrangement({
        ...arrangement,
        doorOrder: { ...arrangement.doorOrder, [groupId]: doorIds },
      });
    },
    [arrangement, persistArrangement],
  );

  const dropGroup = useCallback(
    (groupIds: string[], draggedId: string, beforeId: string | null) => {
      persistArrangement(placeGroup(arrangement, groupIds, draggedId, beforeId));
    },
    [arrangement, persistArrangement],
  );

  const hideDoor = useCallback((door: Door) => {
    setHiddenByDoorId((current) => {
      const next = { ...current, [door.id]: true };
      void storageSet(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, [HIDDEN_KEY]);

  const showDoor = useCallback((door: Door) => {
    setHiddenByDoorId((current) => {
      if (current[door.id] !== true) {
        return current;
      }
      const next = { ...current };
      delete next[door.id];
      void storageSet(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, [HIDDEN_KEY]);

  const hideDoors = useCallback((items: Door[]) => {
    setHiddenByDoorId((current) => {
      const next = { ...current };
      for (const door of items) {
        next[door.id] = true;
      }
      void storageSet(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, [HIDDEN_KEY]);

  const resetLayout = useCallback(() => {
    persistArrangement(emptyArrangement);
    setZoneByDoorId({});
    setHiddenByDoorId({});
    void storageSet(ZONE_KEY, JSON.stringify({}));
    void storageSet(HIDDEN_KEY, JSON.stringify({}));
  }, [HIDDEN_KEY, ZONE_KEY, persistArrangement]);

  const dropDoor = useCallback(
    (
      door: Door,
      fromGroupId: string,
      toGroupId: string,
      fromDoorIds: string[],
      toDoorIds: string[],
      beforeId: string | null,
    ) => {
      if (fromGroupId !== toGroupId) {
        setZoneByDoorId((current) => {
          const next = { ...current, [door.id]: toGroupId };
          void storageSet(ZONE_KEY, JSON.stringify(next));
          return next;
        });
      }
      persistArrangement(
        placeDoor(
          arrangement,
          fromGroupId,
          toGroupId,
          fromDoorIds,
          toDoorIds,
          door.id,
          beforeId,
        ),
      );
    },
    [ZONE_KEY, arrangement, persistArrangement],
  );

  const refreshDoors = useCallback(async () => {
    if (guestSecret !== null) {
      await loadGuest(guestSecret);
      return;
    }
    if (demo) {
      setDoors(mockDoors);
      setBootError(null);
      return;
    }
    if (tokens === null || mode !== 'signed_in') {
      return;
    }
    try {
      await loadLiveDoors(tokens);
    } catch (error) {
      setBootError(
        error instanceof Error ? error.message : 'Could not load your building.',
      );
    }
  }, [demo, guestSecret, loadGuest, loadLiveDoors, mode, tokens]);

  const createKey = useCallback(
    async ({
      ttl,
      label,
      note,
      inviterName,
      contact,
    }: {
      ttl: KeyTtl;
      label: string;
      note: string;
      inviterName: string;
      contact: string;
    }) => {
      if (demo) {
        if (guestSecret !== null) throw new Error('Return to the demo to create an invite.');
        return demoStore.create({
          ttl, label, note, inviterName: inviterName.trim() || mockAccount.name || '', contact,
          doorIds: doors.filter(door => hiddenByDoorId[door.id] !== true).map(door => door.id),
        });
      }
      if (tokens === null) {
        throw new Error('Sign in to create a key.');
      }
      const fresh = await ensureFreshTokens(tokens);
      if (fresh.accessToken !== tokens.accessToken) {
        await persistTokens(fresh);
      }
      const doorIds = doors
        .filter((door) => hiddenByDoorId[door.id] !== true)
        .map((door) => door.id);
      const created = await createKeyRequest({
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        ttl,
        doorIds,
        label,
        note,
        inviterName:
          inviterName.trim() ||
          account?.name?.trim() ||
          account?.email?.trim() ||
          '',
        contact: contact.trim(),
      });
      capture('key_created', { ttl, door_count: doorIds.length });
      return created;
    },
    [account, demo, guestSecret, doors, hiddenByDoorId, persistTokens, tokens],
  );

  const listKeys = useCallback(async () => {
    if (demo) return guestSecret === null ? demoStore.list() : [];
    if (tokens === null) {
      throw new Error('Sign in to see keys.');
    }
    const fresh = await ensureFreshTokens(tokens);
    if (fresh.accessToken !== tokens.accessToken) {
      await persistTokens(fresh);
    }
    return listKeysRequest(fresh.accessToken);
  }, [demo, guestSecret, persistTokens, tokens]);

  const revokeKey = useCallback(
    async (keyId: string) => {
      if (demo) {
        if (guestSecret !== null) throw new Error('Return to the demo to revoke an invite.');
        return demoStore.revoke(keyId);
      }
      if (tokens === null) {
        throw new Error('Sign in to revoke a key.');
      }
      const fresh = await ensureFreshTokens(tokens);
      if (fresh.accessToken !== tokens.accessToken) {
        await persistTokens(fresh);
      }
      await revokeKeyRequest(fresh.accessToken, keyId);
      capture('key_revoked');
    },
    [demo, guestSecret, persistTokens, tokens],
  );

  const value = useMemo<SessionContextValue>(
    () => {
      const liveDoors = Array.isArray(doors) ? doors : unpackLiveBuilding(doors).doors;
      return {
        isDemo: demo,
        startDemo,
        mode,
        account,
        doors: liveDoors,
        buildingName,
        canSignIn: hasBmxCredentials(),
        bootError,
        unlock,
        openSignIn,
        signInUrl,
        completeSignIn,
        signOut,
        refreshDoors,
        zoneByDoorId,
        cycleDoorZone,
        openUntilByDoorId,
        arrangement,
        reorderGroups,
        reorderDoors,
        dropGroup,
        dropDoor,
        hiddenByDoorId,
        hideDoor,
        showDoor,
        hideDoors,
        resetLayout,
        guestExpiresAt,
        guestInvite,
        createKey,
        listKeys,
        revokeKey,
      };
    },
    [
      demo,
      startDemo,
      account,
      buildingName,
      bootError,
      createKey,
      cycleDoorZone,
      doors,
      guestExpiresAt,
      guestInvite,
      listKeys,
      revokeKey,
      mode,
      openSignIn,
      signInUrl,
      completeSignIn,
      refreshDoors,
      signOut,
      unlock,
      zoneByDoorId,
      arrangement,
      reorderGroups,
      reorderDoors,
      dropGroup,
      dropDoor,
      openUntilByDoorId,
      hiddenByDoorId,
      hideDoor,
      showDoor,
      hideDoors,
      resetLayout,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used within SessionProvider.');
  }
  return value;
}

function unpackLiveBuilding(result: unknown): {
  doors: Door[];
  account: AccountProfile | null;
} {
  if (Array.isArray(result)) {
    return { doors: result as Door[], account: null };
  }
  if (typeof result !== 'object' || result === null) {
    return { doors: [], account: null };
  }
  const record = result as { doors?: unknown; account?: AccountProfile | null };
  return {
    doors: Array.isArray(record.doors) ? record.doors : [],
    account: parseAccountProfile(record.account),
  };
}

function parseAccountProfile(value: unknown): AccountProfile | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as { name?: unknown; email?: unknown };
  const name = typeof record.name === 'string' ? record.name : null;
  const email = typeof record.email === 'string' ? record.email : null;
  if (name === null && email === null) {
    return null;
  }
  return { name, email };
}

function parseTokens(raw: string | null): AuthTokens | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseZones(raw: string | null): Record<string, string> {
  if (raw === null) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.length > 0) {
        next[id] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function parseHidden(raw: string | null): Record<string, boolean> {
  if (raw === null) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (value === true) {
        next[id] = true;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function useGuestSecret(): string | null {
  const pathname = usePathname();
  return /^\/k\/([^/]+)$/.exec(pathname)?.[1] ?? null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

async function ensureFreshTokens(tokens: AuthTokens): Promise<AuthTokens> {
  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens;
  }
  return refreshAccessToken(tokens.refreshToken);
}
