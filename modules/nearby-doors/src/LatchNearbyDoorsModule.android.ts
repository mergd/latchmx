import { NativeModule, requireNativeModule } from 'expo';

import type {
  NearbyDoorsEvents,
  NearbyPeripheral,
} from './LatchNearbyDoors.types';

declare class LatchNearbyDoorsModule extends NativeModule<NearbyDoorsEvents> {
  scanAsync(
    durationMilliseconds: number,
    includeUnnamed: boolean,
  ): Promise<NearbyPeripheral[]>;
  startContinuousAsync(includeUnnamed: boolean): Promise<void>;
  stopAsync(): Promise<void>;
}

export default requireNativeModule<LatchNearbyDoorsModule>('LatchNearbyDoors');
