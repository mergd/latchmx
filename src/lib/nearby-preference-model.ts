import type { Door } from './types';

const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

export type NearbyDoorPreference = {
  score: number;
  updatedAt: number;
};

export type NearbyDoorPreferences = Record<string, NearbyDoorPreference>;

export function nearbyDoorPreferenceKey(door: Door): string {
  return `${door.buildingId}:${door.kind}:${door.remoteId}`;
}

export function decayedPreference(
  preference: NearbyDoorPreference | undefined,
  now = Date.now(),
): number {
  if (
    preference === undefined ||
    !Number.isFinite(preference.score) ||
    !Number.isFinite(preference.updatedAt) ||
    preference.score <= 0
  ) {
    return 0;
  }
  const elapsed = Math.max(0, now - preference.updatedAt);
  return preference.score * Math.pow(0.5, elapsed / HALF_LIFE_MS);
}

export function preferenceBonusDb(
  preference: NearbyDoorPreference | undefined,
  now = Date.now(),
): number {
  return Math.min(24, 7 * Math.log2(1 + decayedPreference(preference, now)));
}
