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
import { mockBuildingName, mockDoors } from '@/lib/mock-building';
import { storageGet, storageRemove, storageSet } from '@/lib/storage';
import type { AuthTokens, Door, SessionMode } from '@/lib/types';
import { nextGroup, resolveGroup } from '@/lib/zones';

const TOKEN_KEY = 'latch.tokens';
const ZONE_KEY = 'latch.zones';

type SessionContextValue = {
  mode: SessionMode;
  doors: Door[];
  buildingName: string;
  canSignIn: boolean;
  bootError: string | null;
  unlock: (door: Door) => Promise<void>;
  enterDemo: () => void;
  openSignIn: () => Promise<void>;
  completeSignIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshDoors: () => Promise<void>;
  zoneByDoorId: Record<string, string>;
  cycleDoorZone: (door: Door) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SessionMode>('loading');
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [doors, setDoors] = useState<Door[]>(mockDoors);
  const [buildingName, setBuildingName] = useState(mockBuildingName);
  const [bootError, setBootError] = useState<string | null>(null);
  const [zoneByDoorId, setZoneByDoorId] = useState<Record<string, string>>(
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
        if (!cancelled) {
          setZoneByDoorId(parseZones(storedZones));
        }
        let parsed = parseTokens(stored);
        if (parsed === null) {
          parsed = await readLocalDevSession();
          if (parsed !== null) {
            await persistTokens(parsed);
          }
        }
        if (cancelled) {
          return;
        }
        if (parsed === null) {
          setMode('demo');
          return;
        }
        setTokens(parsed);
        await loadLiveDoors(parsed);
        setBootError(null);
      } catch (error) {
        if (!cancelled) {
          setTokens(null);
          setMode('demo');
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
      if (mode === 'demo') {
        await wait(420);
        return;
      }
      if (tokens === null) {
        throw new Error('Sign in to unlock live doors.');
      }
      const fresh = await ensureFreshTokens(tokens);
      if (fresh.accessToken !== tokens.accessToken) {
        await persistTokens(fresh);
      }
      await releaseDoor(fresh.accessToken, door);
    },
    [mode, persistTokens, tokens],
  );

  const enterDemo = useCallback(() => {
    setDoors(mockDoors);
    setBuildingName(mockBuildingName);
    setMode('demo');
  }, []);

  const openSignIn = useCallback(async () => {
    if (!hasBmxCredentials()) {
      throw new Error('ButterflyMX credentials are missing.');
    }
    const url = authorizationUrl(bmxConfig.redirectUri);
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
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

  const signOut = useCallback(async () => {
    await persistTokens(null);
    enterDemo();
  }, [enterDemo, persistTokens]);

  const cycleDoorZone = useCallback((door: Door) => {
    setZoneByDoorId((current) => {
      const next = {
        ...current,
        [door.id]: nextGroup(door, resolveGroup(door, current)),
      };
      void storageSet(ZONE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
      enterDemo,
      openSignIn,
      completeSignIn,
      signOut,
      refreshDoors,
      zoneByDoorId,
      cycleDoorZone,
    }),
    [
      buildingName,
      bootError,
      cycleDoorZone,
      doors,
      enterDemo,
      mode,
      openSignIn,
      completeSignIn,
      refreshDoors,
      signOut,
      unlock,
      zoneByDoorId,
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

async function readLocalDevSession(): Promise<AuthTokens | null> {
  if (!__DEV__) {
    return null;
  }
  try {
    const response = await fetch('/dev-session.json');
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as AuthTokens;
    return parseTokens(JSON.stringify(payload));
  } catch {
    return null;
  }
}

async function ensureFreshTokens(tokens: AuthTokens): Promise<AuthTokens> {
  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens;
  }
  return refreshAccessToken(tokens.refreshToken);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
