import type { Door } from '@/lib/types';

export const mockBuildingName = 'The Marlowe';

export const mockDoors: Door[] = [
  {
    id: 'ap-front',
    remoteId: 1,
    kind: 'access_point',
    name: 'Front entrance',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
  {
    id: 'ap-vestibule',
    remoteId: 2,
    kind: 'access_point',
    name: 'Vestibule',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
  {
    id: 'ap-garage',
    remoteId: 3,
    kind: 'access_point',
    name: 'Garage',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
  {
    id: 'ap-package',
    remoteId: 4,
    kind: 'access_point',
    name: 'Package room',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
  {
    id: 'ap-amenities',
    remoteId: 5,
    kind: 'access_point',
    name: 'Amenities',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
  {
    id: 'dev-unit',
    remoteId: 6,
    kind: 'device',
    name: 'Unit lock',
    buildingId: 1,
    buildingName: mockBuildingName,
    tenantId: 1,
  },
];
