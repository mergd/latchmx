import { storageGet, storageSet } from './storage';
import {
  decayedPreference,
  nearbyDoorPreferenceKey,
  type NearbyDoorPreference,
  type NearbyDoorPreferences,
} from './nearby-preference-model';
import type { Door } from './types';

const STORAGE_KEY = 'latch.nearby-door-preferences.v1';

export type { NearbyDoorPreferences } from './nearby-preference-model';

export async function loadNearbyDoorPreferences(): Promise<NearbyDoorPreferences> {
  const raw = await storageGet(STORAGE_KEY);
  if (raw === null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, NearbyDoorPreference] => {
        const value = entry[1];
        return (
          value !== null &&
          typeof value === 'object' &&
          Number.isFinite((value as NearbyDoorPreference).score) &&
          Number.isFinite((value as NearbyDoorPreference).updatedAt)
        );
      }),
    );
  } catch {
    return {};
  }
}

export async function recordNearbyDoorSelection(
  preferences: NearbyDoorPreferences,
  door: Door,
  now = Date.now(),
): Promise<NearbyDoorPreferences> {
  const key = nearbyDoorPreferenceKey(door);
  const next = {
    ...preferences,
    [key]: {
      score: decayedPreference(preferences[key], now) + 1,
      updatedAt: now,
    },
  };
  await storageSet(STORAGE_KEY, JSON.stringify(next));
  return next;
}
