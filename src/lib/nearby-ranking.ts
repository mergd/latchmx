import type { NearbyPeripheral } from '../../modules/nearby-doors';
import { observedReaderIdentifiers } from './nearby-reader-identifiers';
import {
  nearbyDoorPreferenceKey,
  preferenceBonusDb,
  type NearbyDoorPreferences,
} from './nearby-preference-model';
import type { Door } from './types';

const MIN_NEARBY_RSSI = -100;
const MAX_NEARBY_DOOR_SUGGESTIONS = 4;
const HABIT_ELIGIBILITY_WINDOW_DB = 20;

export type NearbyDoorMatch = {
  door: Door;
  rssi: number;
  samples: number;
};

export function rankNearbyDoors(
  doors: Door[],
  peripherals: NearbyPeripheral[],
  preferences: NearbyDoorPreferences = {},
  now = Date.now(),
): NearbyDoorMatch[] {
  const matches: NearbyDoorMatch[] = [];
  for (const door of doors) {
    let best: NearbyPeripheral | null = null;
    for (const peripheral of peripherals) {
      const observed = observedReaderIdentifiers(peripheral);
      if (
        !Number.isFinite(peripheral.rssi) ||
        peripheral.rssi >= 0 ||
        peripheral.rssi < MIN_NEARBY_RSSI ||
        !(door.nearbyIdentifiers ?? []).some((identifier) =>
          observed.some((candidate) =>
            readerNameMatches(identifier, candidate),
          ),
        )
      ) {
        continue;
      }
      if (
        best === null ||
        peripheral.rssi + Math.min(peripheral.samples, 5) >
          best.rssi + Math.min(best.samples, 5)
      ) {
        best = peripheral;
      }
    }
    if (best !== null) {
      matches.push({ door, rssi: best.rssi, samples: best.samples });
    }
  }
  const strongest = matches.reduce(
    (score, match) => Math.max(score, signalScore(match)),
    Number.NEGATIVE_INFINITY,
  );
  return matches
    .sort(
      (left, right) =>
        personalizedScore(right, strongest, preferences, now) -
          personalizedScore(left, strongest, preferences, now) ||
        left.door.name.localeCompare(right.door.name),
    )
    .slice(0, MAX_NEARBY_DOOR_SUGGESTIONS);
}

export function stabilizeNearbyDoors(
  current: NearbyDoorMatch[],
  next: NearbyDoorMatch[],
  switchMarginDb = 6,
): NearbyDoorMatch[] {
  const currentLeader = current[0];
  const nextLeader = next[0];
  if (currentLeader === undefined || nextLeader === undefined) {
    return next;
  }
  const currentIndex = next.findIndex(
    ({ door }) => door.id === currentLeader.door.id,
  );
  if (
    currentIndex <= 0 ||
    nearbyScore(nextLeader) - nearbyScore(next[currentIndex]!) >= switchMarginDb
  ) {
    return next;
  }
  return [next[currentIndex]!, ...next.filter((_, index) => index !== currentIndex)];
}

function nearbyScore(match: NearbyDoorMatch): number {
  return signalScore(match);
}

function signalScore(match: NearbyDoorMatch): number {
  return match.rssi + Math.min(match.samples, 5);
}

function personalizedScore(
  match: NearbyDoorMatch,
  strongest: number,
  preferences: NearbyDoorPreferences,
  now: number,
): number {
  const signal = signalScore(match);
  if (signal < strongest - HABIT_ELIGIBILITY_WINDOW_DB) {
    return signal;
  }
  return (
    signal +
    preferenceBonusDb(preferences[nearbyDoorPreferenceKey(match.door)], now)
  );
}

export function readerNameMatches(
  identifier: string,
  advertisedName: string,
): boolean {
  const allowed = canonical(identifier);
  const nearby = canonical(advertisedName);
  if (allowed.length < 6 || nearby.length === 0) {
    return false;
  }
  return allowed === nearby;
}

function canonical(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
