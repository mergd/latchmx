import { expect, test } from 'bun:test';
import type { ButterflyMxClient } from '@mergd/butterflymx';

import { enrichDoorSchedules, loadDoors } from '../src/lib/bmx-doors';
import { fetchNearbyReaderMetadata } from '../src/lib/bmx-nearby-readers';
import { observedReaderIdentifiers } from '../src/lib/nearby-reader-identifiers';
import {
  rankNearbyDoors,
  stabilizeNearbyDoors,
} from '../src/lib/nearby-ranking';
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

test('returns up to four nearby doors in signal-strength order', () => {
  const doors = Array.from({ length: 5 }, (_, index) => ({
    ...door(`READER-${index}`),
    id: `ap-${index}`,
    name: `Door ${index}`,
  }));
  const peripherals = Array.from({ length: 5 }, (_, index) =>
    reader({
      id: `reader-${index}`,
      name: `READER-${index}`,
      advertisedName: `READER-${index}`,
      rssi: -80 + index * 5,
    }),
  );

  const matches = rankNearbyDoors(doors, peripherals);

  expect(matches).toHaveLength(4);
  expect(matches.map(({ door: match }) => match.name)).toEqual([
    'Door 4',
    'Door 3',
    'Door 2',
    'Door 1',
  ]);
});

test('keeps an optimistic first match until another door is clearly stronger', () => {
  const first = { door: door('FIRST'), rssi: -65, samples: 1 };
  const slightlyStronger = {
    door: { ...door('SECOND'), id: 'ap-2' },
    rssi: -62,
    samples: 2,
  };
  const clearlyStronger = { ...slightlyStronger, rssi: -52 };

  expect(stabilizeNearbyDoors([first], [slightlyStronger, first])[0]?.door.id)
    .toBe(first.door.id);
  expect(stabilizeNearbyDoors([first], [clearlyStronger, first])[0]?.door.id)
    .toBe(clearlyStronger.door.id);
});

test('habit strongly reorders doors that are already similarly nearby', () => {
  const usual = { ...door('USUAL-7'), id: 'ap-7', remoteId: 7, name: 'Usual elevator' };
  const strongest = { ...door('STRONG-8'), id: 'ap-8', remoteId: 8, name: 'Other elevator' };
  const now = 1_800_000_000_000;
  const matches = rankNearbyDoors(
    [strongest, usual],
    [
      reader({ id: 'strong', name: 'STRONG-8', advertisedName: 'STRONG-8', rssi: -58 }),
      reader({ id: 'usual', name: 'USUAL-7', advertisedName: 'USUAL-7', rssi: -70 }),
    ],
    {
      '1:access_point:7': { score: 10, updatedAt: now },
    },
    now,
  );

  expect(matches[0]?.door.id).toBe(usual.id);
});

test('habit cannot promote a clearly distant reader over the nearby one', () => {
  const usual = { ...door('USUAL-7'), id: 'ap-7', remoteId: 7, name: 'Usual elevator' };
  const strongest = { ...door('STRONG-8'), id: 'ap-8', remoteId: 8, name: 'Other elevator' };
  const now = 1_800_000_000_000;
  const matches = rankNearbyDoors(
    [strongest, usual],
    [
      reader({ id: 'strong', name: 'STRONG-8', advertisedName: 'STRONG-8', rssi: -55 }),
      reader({ id: 'usual', name: 'USUAL-7', advertisedName: 'USUAL-7', rssi: -82 }),
    ],
    {
      '1:access_point:7': { score: 100, updatedAt: now },
    },
    now,
  );

  expect(matches[0]?.door.id).toBe(strongest.id);
});

test('core door loading uses per-building endpoints without fetching schedules', async () => {
  const requestedPaths: string[] = [];
  const client = buildingClient(async (path) => {
    requestedPaths.push(path);
    return [];
  });

  const snapshot = await loadDoors(client);

  expect(requestedPaths).toEqual([]);
  expect(snapshot.doors).toHaveLength(1);
  expect(snapshot.doors[0]).toMatchObject({
    name: '6th Floor Resident Lounge',
    lockout: true,
    disabled: true,
    sourceDisabled: false,
    schedulePending: true,
  });
});

test('lockout doors fail closed until schedule enrichment succeeds', async () => {
  const client = buildingClient(async () => []);
  const core = await loadDoors(client);

  const enriched = await enrichDoorSchedules(client, core.doors);

  expect(enriched[0]).toMatchObject({
    lockout: true,
    disabled: false,
    sourceDisabled: false,
    schedulePending: false,
  });
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

function buildingClient(
  request: (path: string) => Promise<unknown>,
): ButterflyMxClient {
  return {
    tenants: {
      list: async () => [
        {
          id: 7,
          building_id: 37112,
          building_name: 'Solaire',
        },
      ],
    },
    buildings: {
      list: async () => [
        {
          id: 37112,
          name: 'Solaire',
          time_zone: 'America/Los_Angeles',
        },
      ],
    },
    accessPoints: {
      list: async () => [
        {
          id: 42,
          building_id: 37112,
          name: '6th Floor Resident Lounge',
        },
      ],
    },
    devices: { list: async () => [] },
    request,
  } as unknown as ButterflyMxClient;
}
