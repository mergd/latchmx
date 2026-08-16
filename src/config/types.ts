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
  groups: DoorGroupConfig[];
};

export const OTHER_GROUP_ID = 'other';
export const OTHER_GROUP_LABEL = 'Other';
