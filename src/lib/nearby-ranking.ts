import type { NearbyPeripheral } from '../../modules/nearby-doors';
import type { Door } from './types';

export type NearbyDoorMatch = {
  door: Door;
  rssi: number;
  samples: number;
};

export function rankNearbyDoors(
  doors: Door[],
  peripherals: NearbyPeripheral[],
): NearbyDoorMatch[] {
  const matches: NearbyDoorMatch[] = [];
  for (const door of doors) {
    let best: NearbyPeripheral | null = null;
    for (const peripheral of peripherals) {
      if (
        peripheral.rssi < -90 ||
        !(door.nearbyIdentifiers ?? []).some((identifier) =>
          readerNameMatches(identifier, peripheral.name),
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
  return matches
    .sort(
      (left, right) =>
        right.rssi +
          Math.min(right.samples, 5) -
          (left.rssi + Math.min(left.samples, 5)) ||
        left.door.name.localeCompare(right.door.name),
    )
    .slice(0, 2);
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
