import type { Account, Door } from './types';

export const mockBuildingName = 'The Marlowe';

// The original demo building, with IDs that cannot address production doors.
export const mockDoors: Door[] = [
  'Front entrance',
  'Vestibule',
  'Garage',
  'Package room',
  'Amenities',
  'Unit lock',
].map((name, index) => ({
  id: `demo-door-${index + 1}`,
  remoteId: -(index + 1),
  kind: index === 5 ? 'device' : 'access_point',
  name,
  buildingId: -1,
  buildingName: mockBuildingName,
  tenantId: -1,
  heldOpen: false,
  disabled: false,
  lockout: false,
  hours: [],
  timeZone: 'America/Los_Angeles',
}));

export const mockAccount: Account = {
  id: 'demo-resident',
  kind: 'resident',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  buildingName: mockBuildingName,
  createdAt: 0,
};
