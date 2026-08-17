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
import { DOOR_OPEN_MS, type AuthTokens, type Door, type SessionMode } from '@/lib/types';
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

type SessionContextValue = {
  mode: SessionMode;
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
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SessionMode>('loading');
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [doors, setDoors] = useState<Door[]>([]);
  const [buildingName, setBuildingName] = useState('');
  const [bootError, setBootError] = useState<string | null>(null);
  const [zoneByDoorId, setZoneByDoorId] = useState<Record<string, string>>(
    {},
  );
  const [arrangement, setArrangement] = useState<DoorArrangement>(emptyArrangement);
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
    const nextDoors = await fetchDoors(fresh.accessToken);
    setDoors(nextDoors);
    setBuildingName(nextDoors[0]?.buildingName ?? 'Your building');
    setMode('signed_in');
  }, [persistTokens]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const stored = await storageGet(TOKEN_KEY);
        const storedZones = await storageGet(ZONE_KEY);
        const storedLayout = await storageGet(LAYOUT_KEY);
        if (!cancelled) {
          setZoneByDoorId(parseZones(storedZones));
          setArrangement(parseArrangement(storedLayout));
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

  const dropGroup = useCallback(
    (groupIds: string[], draggedId: string, beforeId: string | null) => {
      persistArrangement(placeGroup(arrangement, groupIds, draggedId, beforeId));
    },
    [arrangement, persistArrangement],
  );

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
    () => ({
      mode,
      doors,
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
      dropGroup,
      dropDoor,
    }),
    [
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
      dropGroup,
      dropDoor,
      openUntilByDoorId,
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

async function ensureFreshTokens(tokens: AuthTokens): Promise<AuthTokens> {
  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens;
  }
  return refreshAccessToken(tokens.refreshToken);
}
