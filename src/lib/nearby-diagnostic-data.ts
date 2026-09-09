import type { NearbyPeripheral } from '../../modules/nearby-doors';

import type { NearbyDoorMatch } from './nearby-ranking';

export function nearbyScanProperties(
  peripherals: NearbyPeripheral[],
  matches: NearbyDoorMatch[],
  eligibleDoorCount: number,
  elapsedMilliseconds: number,
) {
  const rssis = peripherals.map((item) => item.rssi).sort((a, b) => b - a);
  const matchedRssis = matches.map((item) => item.rssi).sort((a, b) => b - a);
  return {
    elapsed_ms: Math.max(0, Math.round(elapsedMilliseconds)),
    peripheral_count: peripherals.length,
    eligible_door_count: eligibleDoorCount,
    matched_door_count: matches.length,
    strongest_rssi: rssis[0] ?? null,
    strongest_match_rssi: matchedRssis[0] ?? null,
    confidence_margin_db:
      matchedRssis.length >= 2 ? matchedRssis[0]! - matchedRssis[1]! : null,
    max_sample_count: peripherals.reduce(
      (maximum, item) => Math.max(maximum, item.samples),
      0,
    ),
  };
}

export function nearbyErrorCode(error: unknown): string {
  const record = error as { code?: unknown } | null;
  if (typeof record?.code === 'string' && /^ERR_[A-Z_]+$/.test(record.code)) {
    return record.code;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('permission') || message.includes('allow bluetooth')) {
    return 'bluetooth_unauthorized';
  }
  if (
    message.includes('turn on bluetooth') ||
    message.includes('powered off')
  ) {
    return 'bluetooth_off';
  }
  if (message.includes('unsupported')) {
    return 'bluetooth_unsupported';
  }
  if (message.includes('cancel')) {
    return 'scan_cancelled';
  }
  return 'bluetooth_unavailable';
}

export function redactReaderName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return '••••';
  }
  const prefix = /^([A-Za-z]+\d*)[-_]/.exec(trimmed)?.[0] ?? '';
  return `${prefix}•••${trimmed.slice(-4)}`;
}

export function sanitizedReaderSamples(
  peripherals: NearbyPeripheral[],
  matchedReaderIds: ReadonlySet<string>,
) {
  return peripherals.map((item) => ({
    reader_hint: redactReaderName(item.name),
    rssi: item.rssi,
    samples: item.samples,
    matched: matchedReaderIds.has(item.id),
  }));
}
