import { expect, test } from 'bun:test';

import {
  nearbyErrorCode,
  nearbyScanProperties,
  redactReaderName,
  sanitizedReaderSamples,
} from '../src/lib/nearby-diagnostic-data.ts';

test('PostHog scan properties contain aggregates without reader identifiers', () => {
  const properties = nearbyScanProperties(
    [
      { id: 'private-id', name: 'M112-SECRET1234', rssi: -49, samples: 6 },
      { id: 'other-id', name: 'Other reader', rssi: -72, samples: 2 },
    ],
    [
      { door: { name: 'Front door' }, rssi: -49, samples: 6 },
      { door: { name: 'Garage' }, rssi: -61, samples: 3 },
    ],
    4,
    2200.7,
  );

  expect(properties).toEqual({
    elapsed_ms: 2201,
    peripheral_count: 2,
    eligible_door_count: 4,
    matched_door_count: 2,
    strongest_rssi: -49,
    strongest_match_rssi: -49,
    confidence_margin_db: 12,
    max_sample_count: 6,
  });
  expect(JSON.stringify(properties)).not.toContain('SECRET');
  expect(JSON.stringify(properties)).not.toContain('Front door');
});

test('diagnostic reader samples retain only a redacted hint', () => {
  const samples = sanitizedReaderSamples(
    [{ id: 'private-id', name: 'M112-SECRET1234', rssi: -49, samples: 6 }],
    new Set(['private-id']),
  );
  expect(samples).toEqual([
    { reader_hint: 'M112-•••1234', rssi: -49, samples: 6, matched: true },
  ]);
  expect(JSON.stringify(samples)).not.toContain('SECRET');
  expect(JSON.stringify(samples)).not.toContain('private-id');
});

test('reader names are redacted and errors collapse to bounded codes', () => {
  expect(redactReaderName('M112-SECRET1234')).toBe('M112-•••1234');
  expect(redactReaderName('tiny')).toBe('••••');
  expect(nearbyErrorCode({ code: 'ERR_BLUETOOTH_OFF' })).toBe(
    'ERR_BLUETOOTH_OFF',
  );
  expect(nearbyErrorCode(new Error('unexpected private detail'))).toBe(
    'bluetooth_unavailable',
  );
});
