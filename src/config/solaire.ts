import type { BuildingConfig } from '@/config/types';

const solaire: BuildingConfig = {
  id: 'solaire',
  match: {
    buildingIds: [37112],
    nameIncludes: ['solaire', '299 fremont', 'fremont'],
  },
  hide: [
    'Front Desk',
    'Front Desk & Bike Repair',
    'Front Desk Breezeway & Exit Stair Up',
    '1st Floor Lobby Elevator Stairwell Up',
    'Elevator Lobby A & Elevator Lobby B',
  ],
  groups: [
    {
      id: 'entrance',
      label: 'Entrance',
      match: ['main entrance', 'front desk', 'vestibule'],
    },
    {
      id: 'lobby',
      label: 'Lobby',
      match: ['lobby', '1st floor'],
    },
    {
      id: 'courtyard',
      label: 'Courtyard',
      match: ['courtyard', 'alleyway', 'folsom'],
    },
    {
      id: 'garage',
      label: 'Garage',
      match: ['garage', 'loading dock', 'parking'],
    },
    {
      id: 'floor6',
      label: '6th floor',
      match: ['6th', 'floor 6', 'sixth', 'yoga', 'fitness'],
    },
    {
      id: 'floor8',
      label: '8th floor',
      match: ['8th', 'eighth', 'bbq'],
    },
    {
      id: 'rooftop',
      label: 'Rooftop',
      match: ['rooftop', '33rd', 'fl 33'],
    },
    {
      id: 'bike',
      label: 'Bike',
      match: ['bike'],
    },
  ],
};

export default solaire;
