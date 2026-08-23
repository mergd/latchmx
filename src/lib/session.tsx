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
import { Platform } from 'react-native';

import { capture, resetAnalytics } from '@/lib/analytics';
import {
  authorizationCodeFromUrl,
  authorizationUrl,
  exchangeAuthorizationCode,
  fetchDoors,
  refreshAccessToken,
  releaseDoor,
} from '@/lib/bmx-api';
import { bmxConfig, hasBmxCredentials } from '@/lib/config';
import { storageGet, storageRemove, storageSet } from '@/lib/storage';
import {
  DOOR_OPEN_MS,
  type Account,
  type AuthTokens,
  type Door,
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
const ZONE_KEY = 'latch.zones';
const LAYOUT_KEY = 'latch.layout';
const HIDDEN_KEY = 'latch.hidden';
const SPLASH_FALLBACK_MS = 8000;
const LOAD_DOORS_MS = 15_000;

type SessionContextValue = {
  mode: SessionMode;
  account: Account | null;
  doors: Door[];
  buildingName: string;
  canSignIn: boolean;
  bootError: string | null;
  unlock: (door: Door) => Promise<void>;
  openSignIn: () => Promise<void>;
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
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
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

  const loadLiveDoors = useCallback(async (current: AuthTokens) => {
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
    setDoors(snapshot.doors);
    setAccount(snapshot.account);
    setBuildingName(snapshot.doors[0]?.buildingName ?? 'Your building');
    setMode('signed_in');
  }, [persistTokens]);

  useEffect(() => {
    const seq = ++bootSeq.current;

    async function hydrate() {
      try {
        const stored = await storageGet(TOKEN_KEY, { secure: true });
        const storedZones = await storageGet(ZONE_KEY);
        const storedLayout = await storageGet(LAYOUT_KEY);
        const storedHidden = await storageGet(HIDDEN_KEY);
        if (seq !== bootSeq.current) {
          return;
        }
        setZoneByDoorId(parseZones(storedZones));
        setArrangement(parseArrangement(storedLayout));
        setHiddenByDoorId(parseHidden(storedHidden));
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
  }, [loadLiveDoors]);

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
      if (tokens === null) {
        throw new Error('Sign in to unlock.');
      }
      if (door.heldOpen || (openUntilByDoorId[door.id] ?? 0) > Date.now()) {
        return;
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
    [openUntilByDoorId, persistTokens, tokens],
  );

  const signOut = useCallback(async () => {
    capture('signed_out');
    resetAnalytics();
    await persistTokens(null);
    setAccount(null);
    setDoors([]);
    setBuildingName('');
    setMode('signed_out');
  }, [persistTokens]);

  const openSignIn = useCallback(async () => {
    if (!hasBmxCredentials()) {
      throw new Error('ButterflyMX credentials are missing.');
    }
    const url = authorizationUrl(bmxConfig.redirectUri);
    if (Platform.OS === 'web') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    await Linking.openURL(url);
  }, []);

  const completeSignIn = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length === 0) {
        throw new Error('Paste the authorization code from ButterflyMX.');
      }
      if (signInInFlight.current?.code === trimmed) {
        return signInInFlight.current.promise;
      }
      const promise = (async () => {
        const nextTokens = await exchangeAuthorizationCode(
          trimmed,
          bmxConfig.redirectUri,
        );
        await persistTokens(nextTokens);
        await loadLiveDoors(nextTokens);
        capture('signed_in');
      })();
      signInInFlight.current = { code: trimmed, promise };
      try {
        await promise;
      } finally {
        if (signInInFlight.current?.code === trimmed) {
          signInInFlight.current = null;
        }
      }
    },
    [loadLiveDoors, persistTokens],
  );

  useEffect(() => {
    if (mode === 'loading') {
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
      void completeSignIn(code).catch(() => {
        return;
      });
    };

    void Linking.getInitialURL().then(consume);
    const subscription = Linking.addEventListener('url', (event) => {
      consume(event.url);
    });
    return () => {
      subscription.remove();
    };
  }, [completeSignIn, mode]);

  const persistArrangement = useCallback((next: DoorArrangement) => {
    setArrangement(next);
    void storageSet(LAYOUT_KEY, JSON.stringify(next));
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

  const hideDoors = useCallback((items: Door[]) => {
    setHiddenByDoorId((current) => {
      const next = { ...current };
      for (const door of items) {
        next[door.id] = true;
      }
      void storageSet(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    persistArrangement(emptyArrangement);
    setZoneByDoorId({});
    setHiddenByDoorId({});
    void storageSet(ZONE_KEY, JSON.stringify({}));
    void storageSet(HIDDEN_KEY, JSON.stringify({}));
  }, [persistArrangement]);

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
    [arrangement, persistArrangement],
  );

  const refreshDoors = useCallback(async () => {
    if (tokens === null || mode !== 'signed_in') {
      return;
    }
    await loadLiveDoors(tokens);
  }, [loadLiveDoors, mode, tokens]);

  const value = useMemo<SessionContextValue>(
    () => {
      const live = Array.isArray(doors)
        ? { doors, account }
        : unpackLiveBuilding(doors);
      return {
        mode,
        account: live.account,
        doors: live.doors,
        buildingName,
        canSignIn: hasBmxCredentials(),
        bootError,
        unlock,
        openSignIn,
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
      };
    },
    [
      account,
      buildingName,
      bootError,
      cycleDoorZone,
      doors,
      mode,
      openSignIn,
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
  account: Account | null;
} {
  if (Array.isArray(result)) {
    return { doors: result as Door[], account: null };
  }
  if (typeof result !== 'object' || result === null) {
    return { doors: [], account: null };
  }
  const record = result as { doors?: unknown; account?: Account | null };
  return {
    doors: Array.isArray(record.doors) ? record.doors : [],
    account: record.account ?? null,
  };
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
