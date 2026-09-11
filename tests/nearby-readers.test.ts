import { expect, test } from 'bun:test';

import { fetchNearbyReaderMetadata } from '../src/lib/bmx-nearby-readers';
import { observedReaderIdentifiers } from '../src/lib/nearby-reader-identifiers';
import { rankNearbyDoors } from '../src/lib/nearby-ranking';
import type { NearbyPeripheral } from '../modules/nearby-doors';
import type { Door } from '../src/lib/types';

const WAVELYNX_UUID = '3420D81A-AF2C-11E5-BF7F-FEFF819CDC9F';

test('loads only authorized GraphQL BLE reader identifiers', async () => {
  const responses = [
    {
      data: {
        tenants: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            { id: 'tenant-1', building: { capabilities: ['BLE_ACCESS_ENABLED'] } },
            { id: 'tenant-2', building: { capabilities: [] } },
          ],
        },
      },
    },
    {
      data: {
        nodes: [
          {
            accessPoints: {
              pageInfo: { hasNextPage: true, endCursor: 'access-point-page-2' },
              nodes: [
                {
                  legacyId: '42',
                  capabilities: ['BLUETOOTH'],
                  devices: {
                    nodes: [
                      {
                        __typename: 'CloudBasedAccessController',
                        readerSerialNumbers: ['08aabbccddeeff00'],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      data: {
        nodes: [
          {
            accessPoints: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  legacyId: '43',
                  capabilities: ['SWIPE_TO_OPEN'],
                  devices: {
                    nodes: [
                      {
                        __typename: 'Intercom',
                        serialNumber: 'M112-NOT-BLE',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ];
  const requests: { query: string; variables: Record<string, unknown> }[] = [];
  const fetchImplementation = async (_input: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    const payload = responses.shift();
    if (payload === undefined) {
      throw new Error('Unexpected request');
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const metadata = await fetchNearbyReaderMetadata(
    'secret-token',
    'https://example.test/graphql',
    fetchImplementation,
  );

  expect(requests).toHaveLength(3);
  expect(requests[1]?.variables.tenantId).toBe('tenant-1');
  expect(requests[2]?.variables.after).toBe('access-point-page-2');
  expect(metadata.get(42)).toEqual(['08AABBCCDDEEFF00']);
  expect(metadata.has(43)).toBeFalse();
});

test('extracts the WaveLynx serial from service data', () => {
  const peripheral = reader({
    name: null as unknown as string,
    serviceData: [
      {
        uuid: WAVELYNX_UUID.toLowerCase(),
        hex: '08aabbccddeeff00cafebabe',
        bytes: 12,
      },
    ],
  });

  expect(observedReaderIdentifiers(peripheral)).toContain(
    '08AABBCCDDEEFF00',
  );
  expect(rankNearbyDoors([door('08AABBCCDDEEFF00')], [peripheral])).toHaveLength(1);
});

test('still matches intercom readers by their advertised serial name', () => {
  const peripheral = reader({
    name: 'M112-ABCDEF',
    advertisedName: 'M112-ABCDEF',
  });

  expect(rankNearbyDoors([door('M112-ABCDEF')], [peripheral])).toHaveLength(1);
});

test('does not treat unrelated service data as a reader serial', () => {
  const peripheral = reader({
    serviceData: [
      {
        uuid: '0000180F-0000-1000-8000-00805F9B34FB',
        hex: '08AABBCCDDEEFF00',
        bytes: 8,
      },
    ],
  });

  expect(rankNearbyDoors([door('08AABBCCDDEEFF00')], [peripheral])).toHaveLength(0);
});

function reader(overrides: Partial<NearbyPeripheral>): NearbyPeripheral {
  return {
    id: 'reader-1',
    name: '',
    advertisedName: '',
    peripheralName: '',
    rssi: -65,
    samples: 5,
    connectable: true,
    serviceUuids: [],
    overflowServiceUuids: [],
    solicitedServiceUuids: [],
    serviceData: [],
    ...overrides,
  };
}

function door(identifier: string): Door {
  return {
    id: 'ap-42',
    remoteId: 42,
    kind: 'access_point',
    name: 'Test Door',
    buildingId: 1,
    buildingName: 'Test Building',
    tenantId: 1,
    heldOpen: false,
    disabled: false,
    lockout: false,
    hours: [],
    timeZone: 'America/Los_Angeles',
    nearbyIdentifiers: [identifier],
  };
}
