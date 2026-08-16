import type { BuildingConfig } from '@/config/types';

const solaire: BuildingConfig = {
  id: 'solaire',
  match: {
    buildingIds: [37112],
    nameIncludes: ['solaire', '299 fremont', 'fremont'],
  },
  groups: [
    {
      id: 'entrance',
      label: 'Entrance',
      match: ['front desk', 'lobby', 'folsom', 'vestibule', 'main entrance'],
    },
    {
      id: 'garage',
      label: 'Garage',
      match: ['garage', 'loading dock', 'parking'],
    },
    {
      id: 'floor6',
      label: '6th floor',
      match: ['6th', 'floor 6', 'sixth'],
    },
  ],
};

export default solaire;
