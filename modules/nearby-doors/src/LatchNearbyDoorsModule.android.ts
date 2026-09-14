import { NativeModule, requireNativeModule } from 'expo';

import type { NearbyPeripheral } from './LatchNearbyDoors.types';

declare class LatchNearbyDoorsModule extends NativeModule {
  scanAsync(
    durationMilliseconds: number,
    includeUnnamed: boolean,
  ): Promise<NearbyPeripheral[]>;
  stopAsync(): Promise<void>;
}

export default requireNativeModule<LatchNearbyDoorsModule>('LatchNearbyDoors');
