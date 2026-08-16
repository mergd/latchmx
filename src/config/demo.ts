import type { BuildingConfig } from '@/config/types';

const demo: BuildingConfig = {
  id: 'demo',
  match: {
    buildingIds: [1],
    nameIncludes: ['marlowe'],
  },
  groups: [
    {
      id: 'entrance',
      label: 'Entrance',
      match: ['front', 'vestibule'],
    },
    {
      id: 'garage',
      label: 'Garage',
      match: ['garage'],
    },
  ],
};

export default demo;
