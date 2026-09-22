import { NativeModule, requireNativeModule } from 'expo';

import type { AppUpdatesModule } from './index';

declare class LatchAppUpdatesModule extends NativeModule implements AppUpdatesModule {
  getStoreEnvironmentAsync(): Promise<'production' | 'nonproduction' | 'unknown'>;
  getPlayUpdateAsync(): Promise<number | null>;
}

export default requireNativeModule<LatchAppUpdatesModule>('LatchAppUpdates');
