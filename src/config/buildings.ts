import demo from '@/config/demo';
import solaire from '@/config/solaire';
import type { BuildingConfig } from '@/config/types';

export type { BuildingConfig, DoorGroupConfig } from '@/config/types';
export { OTHER_GROUP_ID, OTHER_GROUP_LABEL } from '@/config/types';

export const buildings: BuildingConfig[] = [solaire, demo];
