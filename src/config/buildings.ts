import fallback from '@/config/default';
import solaire from '@/config/solaire';
import type { BuildingConfig } from '@/config/types';

export type { BuildingConfig, DoorGroupConfig } from '@/config/types';
export {
  HIDDEN_GROUP_ID,
  HIDDEN_GROUP_LABEL,
  OTHER_GROUP_ID,
  OTHER_GROUP_LABEL,
} from '@/config/types';

export const fallbackBuilding: BuildingConfig = fallback;

export const buildings: BuildingConfig[] = [solaire];
