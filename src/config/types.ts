export type DoorGroupConfig = {
  id: string;
  label: string;
  match: string[];
};

export type BuildingConfig = {
  id: string;
  match: {
    buildingIds?: number[];
    nameIncludes?: string[];
  };
  hide?: string[];
  show?: string[];
  lockout?: string[];
  displayName?: string;
  address?: string;
  mapsQuery?: string;
  hero?: {
    uri: string;
  };
  groups: DoorGroupConfig[];
};

export const OTHER_GROUP_ID = 'other';
export const OTHER_GROUP_LABEL = 'Other';

export const HIDDEN_GROUP_ID = 'hidden';
export const HIDDEN_GROUP_LABEL = 'Hidden';

