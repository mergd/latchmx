import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
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

  const persistTokens = useCallback(async (next: AuthTokens | null) => {
    setTokens(next);
    if (next === null) {
      await storageRemove(TOKEN_KEY);
      return;
    }
    await storageSet(TOKEN_KEY, JSON.stringify(next));
  }, []);

  const loadLiveDoors = useCallback(async (current: AuthTokens) => {
    const fresh = await ensureFreshTokens(current);
    if (fresh.accessToken !== current.accessToken) {
      await persistTokens(fresh);
    }
    const snapshot = unpackLiveBuilding(await fetchDoors(fresh.accessToken));
    setDoors(snapshot.doors);
    setAccount(snapshot.account);
    setBuildingName(snapshot.doors[0]?.buildingName ?? 'Your building');
    setMode('signed_in');
  }, [persistTokens]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const stored = await storageGet(TOKEN_KEY);
        const storedZones = await storageGet(ZONE_KEY);
        const storedLayout = await storageGet(LAYOUT_KEY);
        const storedHidden = await storageGet(HIDDEN_KEY);
        if (!cancelled) {
          setZoneByDoorId(parseZones(storedZones));
          setArrangement(parseArrangement(storedLayout));
          setHiddenByDoorId(parseHidden(storedHidden));
        }
        let parsed = parseTokens(stored);
        if (cancelled) {
          return;
        }
        if (parsed === null) {
          setMode('signed_out');
          return;
        }
        setTokens(parsed);
        await loadLiveDoors(parsed);
        setBootError(null);
      } catch (error) {
        if (!cancelled) {
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
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [loadLiveDoors, persistTokens]);

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
      await releaseDoor(fresh.accessToken, door);
      setOpenUntilByDoorId((current) => ({
        ...current,
        [door.id]: Date.now() + DOOR_OPEN_MS,
      }));
    },
    [openUntilByDoorId, persistTokens, tokens],
  );

  const signOut = useCallback(async () => {
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
      const nextTokens = await exchangeAuthorizationCode(
        trimmed,
        bmxConfig.redirectUri,
      );
      await persistTokens(nextTokens);
      await loadLiveDoors(nextTokens);
    },
    [loadLiveDoors, persistTokens],
  );

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
  const parsed = JSON.parse(raw) as AuthTokens;
  if (
    typeof parsed.accessToken !== 'string' ||
    typeof parsed.refreshToken !== 'string' ||
    typeof parsed.expiresAt !== 'number'
  ) {
    return null;
  }
  return parsed;
}

function parseZones(raw: string | null): Record<string, string> {
  if (raw === null) {
    return {};
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const next: Record<string, string> = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.length > 0) {
      next[id] = value;
    }
  }
  return next;
}

function parseHidden(raw: string | null): Record<string, boolean> {
  if (raw === null) {
    return {};
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const next: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (value === true) {
      next[id] = true;
    }
  }
  return next;
}

async function ensureFreshTokens(tokens: AuthTokens): Promise<AuthTokens> {
  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens;
  }
  return refreshAccessToken(tokens.refreshToken);
}
