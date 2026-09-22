import { expect, test } from 'bun:test';

import {
  appleUpdateFromLookup,
  compareStoreVersions,
} from '../src/lib/update-version';

test('compares published and installed dotted versions without string ordering', () => {
  expect(compareStoreVersions('1.10', '1.9')).toBe(1);
  expect(compareStoreVersions('1.0', '1.0.0')).toBe(0);
  expect(compareStoreVersions('1.0', '1.0.1')).toBe(-1);
  expect(compareStoreVersions('1.0-beta', '1.0')).toBeNull();
});

test('only offers a newer listing for this bundle and an App Store URL', () => {
  const listing = {
    results: [{
      bundleId: 'dev.william.latch',
      version: '1.2',
      trackViewUrl: 'https://apps.apple.com/us/app/latchmx/id6804158514',
    }],
  };
  expect(appleUpdateFromLookup(listing, 'dev.william.latch', '1.1')).toEqual({
    id: 'ios:1.2',
    url: 'https://apps.apple.com/us/app/latchmx/id6804158514',
  });
  expect(appleUpdateFromLookup(listing, 'dev.william.latch', '1.2')).toBeNull();
  expect(appleUpdateFromLookup(listing, 'another.bundle', '1.1')).toBeNull();
  expect(appleUpdateFromLookup({ results: [{ ...listing.results[0], trackViewUrl: 'https://example.com' }] }, 'dev.william.latch', '1.1')).toBeNull();
});
