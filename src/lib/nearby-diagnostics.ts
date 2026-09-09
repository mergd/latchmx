import { storageGet, storageRemove, storageSet } from './storage';

export const NEARBY_DIAGNOSTICS_KEY = 'latch.nearby-diagnostics.enabled';

export async function diagnosticsEnabled(): Promise<boolean> {
  return (await storageGet(NEARBY_DIAGNOSTICS_KEY)) === 'true';
}

export async function setDiagnosticsEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await storageSet(NEARBY_DIAGNOSTICS_KEY, 'true');
  } else {
    await storageRemove(NEARBY_DIAGNOSTICS_KEY);
  }
}
