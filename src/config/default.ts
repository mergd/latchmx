import type { BuildingConfig } from '@/config/types';

const fallback: BuildingConfig = {
  id: 'default',
  match: {},
  hero: {
    uri: 'https://bmx.fldr.zip/buildings/default.jpg',
  },
  groups: [
    {
      id: 'entrance',
      label: 'Entrance',
      match: ['entrance', 'front desk', 'vestibule', 'front door', 'main door', 'gate'],
    },
    {
      id: 'lobby',
      label: 'Lobby',
      match: ['lobby', '1st floor', 'first floor', 'ground'],
    },
    {
      id: 'garage',
      label: 'Garage',
      match: ['garage', 'parking', 'loading'],
    },
    {
      id: 'elevator',
      label: 'Elevators',
      match: ['elevator', 'lift'],
    },
    {
      id: 'amenities',
      label: 'Amenities',
      match: [
        'gym',
        'fitness',
        'pool',
        'roof',
        'lounge',
        'mail',
        'package',
        'bike',
        'pet',
        'spa',
        'yoga',
        'bbq',
        'terrace',
      ],
    },
  ],
};

export default fallback;
