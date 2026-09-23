import type { NearbyPeripheral } from '../../modules/nearby-doors';
import { observedReaderIdentifiers } from './nearby-reader-identifiers';
import {
  decayedPreference,
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

export type RetainedNearbyDoor = {
  match: NearbyDoorMatch;
  index: number;
  until: number;
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
  // Signal still chooses which four doors qualify, but never determines
  // their visible order. The order only changes when the set changes.
  return matches
    .sort(
      (left, right) =>
        personalizedScore(right, strongest, preferences, now) -
          personalizedScore(left, strongest, preferences, now) ||
        left.door.name.localeCompare(right.door.name) ||
        left.door.id.localeCompare(right.door.id),
    )
    .slice(0, MAX_NEARBY_DOOR_SUGGESTIONS)
    .sort(
      (left, right) =>
        preferenceScore(right, preferences, now) -
          preferenceScore(left, preferences, now) ||
        left.door.name.localeCompare(right.door.name) ||
        left.door.id.localeCompare(right.door.id),
    );
}

export function retainNearbyDoors(
  matches: NearbyDoorMatch[],
  retained: RetainedNearbyDoor[],
  openUntilByDoorId: Record<string, number>,
  now = Date.now(),
): NearbyDoorMatch[] {
  const visible = [...matches];
  for (const held of [...retained].sort((left, right) => left.index - right.index)) {
    if (Math.max(held.until, openUntilByDoorId[held.match.door.id] ?? 0) <= now) {
      continue;
    }
    const liveIndex = visible.findIndex(
      ({ door }) => door.id === held.match.door.id,
    );
    const match = liveIndex < 0 ? held.match : visible.splice(liveIndex, 1)[0]!;
    visible.splice(Math.min(held.index, visible.length), 0, match);
  }
  return visible.slice(0, MAX_NEARBY_DOOR_SUGGESTIONS);
}

function preferenceScore(
  match: NearbyDoorMatch,
  preferences: NearbyDoorPreferences,
  now: number,
): number {
  return decayedPreference(
    preferences[nearbyDoorPreferenceKey(match.door)],
    now,
  );
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

function signalScore(match: NearbyDoorMatch): number {
  return match.rssi + Math.min(match.samples, 5);
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
