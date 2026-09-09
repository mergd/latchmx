import { expect, test } from 'bun:test';

import { nearbyIdentifiersForAccessPoint } from '../src/lib/bmx-doors';
import { rankNearbyDoors, readerNameMatches } from '../src/lib/nearby-ranking';

function door(id, name, nearbyIdentifiers) {
  return {
    id,
    remoteId: Number(id),
    kind: 'access_point',
    name,
    buildingId: 1,
    buildingName: 'Building',
    tenantId: 1,
    heldOpen: false,
    disabled: false,
    lockout: false,
    hours: [],
    timeZone: 'America/Los_Angeles',
    nearbyIdentifiers,
  };
}

test('extracts only explicit reader identifiers associated with an access point', () => {
  const point = {
    id: 10,
    name: 'Front door',
    building_id: 1,
    device_ids: [3],
    intercom_devices: [{ serial_number: 'M108-ABC12345' }],
    cloud_based_access_controller_reader_serial_numbers: ['0011aabb'],
  };
  const devices = [
    {
      id: 3,
      name: 'M112-NAME0001',
      building_id: 1,
      serial_number: 'reader-99aa88',
    },
    {
      id: 4,
      name: 'Unrelated',
      building_id: 1,
      serial_number: 'must-not-match',
    },
  ];

  expect(nearbyIdentifiersForAccessPoint(point, devices)).toEqual([
    '0011AABB',
    'M108-ABC12345',
    'READER-99AA88',
    'M112-NAME0001',
  ]);
});

test('matches exact reader names without fuzzy or suffix matching', () => {
  expect(readerNameMatches('M108-ABC12345', 'm108-abc12345')).toBe(true);
  expect(readerNameMatches('ABC12345', 'M108-ABC12345')).toBe(false);
  expect(readerNameMatches('Front Door', 'M108-FRONT-DOOR')).toBe(false);
  expect(readerNameMatches('12345', 'M108-12345')).toBe(false);
});

test('ranks only eligible nearby readers and caps ambiguous suggestions at two', () => {
  const doors = [
    door('1', 'Front', ['M108-FRONT0001']),
    door('2', 'Garage', ['M112-GARAGE001']),
    door('3', 'Roof', ['MP108-ROOF0001']),
  ];
  const peripherals = [
    { id: 'a', name: 'M108-FRONT0001', rssi: -61, samples: 4 },
    { id: 'b', name: 'M112-GARAGE001', rssi: -67, samples: 4 },
    { id: 'c', name: 'MP108-ROOF0001', rssi: -72, samples: 2 },
    { id: 'd', name: 'M108-UNKNOWN', rssi: -20, samples: 20 },
  ];

  expect(
    rankNearbyDoors(doors, peripherals).map(({ door: item }) => item.name),
  ).toEqual(['Front', 'Garage']);
});

test('ignores matching readers whose signal is too weak', () => {
  expect(
    rankNearbyDoors(
      [door('1', 'Front', ['M108-FRONT0001'])],
      [{ id: 'a', name: 'M108-FRONT0001', rssi: -96, samples: 10 }],
    ),
  ).toEqual([]);
});
