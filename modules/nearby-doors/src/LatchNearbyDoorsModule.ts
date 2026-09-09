import type { NearbyPeripheral } from './LatchNearbyDoors.types';

export default {
  async scanAsync(_durationMilliseconds: number): Promise<NearbyPeripheral[]> {
    return [];
  },
  async stopAsync(): Promise<void> {},
};
