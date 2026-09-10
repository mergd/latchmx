import type { NearbyPeripheral } from './LatchNearbyDoors.types';

export default {
  async scanAsync(
    _durationMilliseconds: number,
    _includeUnnamed: boolean,
  ): Promise<NearbyPeripheral[]> {
    return [];
  },
  async stopAsync(): Promise<void> {},
};
