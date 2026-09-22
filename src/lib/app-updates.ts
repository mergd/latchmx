import * as Application from 'expo-application';
import { Platform } from 'react-native';

import LatchAppUpdates from '../../modules/app-updates';
import { appleUpdateFromLookup, type AvailableUpdate } from './update-version';

const IOS_BUNDLE_ID = 'dev.william.latch';
const ANDROID_PACKAGE = 'dev.fldr.latch';
const APPLE_APP_ID = '6804158514';

export async function getAvailableAppUpdate(): Promise<AvailableUpdate | null> {
  if (__DEV__) return null;

  if (Platform.OS === 'ios') {
    if (Application.applicationId !== IOS_BUNDLE_ID) return null;
    const releaseType = await Application.getIosApplicationReleaseTypeAsync();
    if (releaseType !== Application.ApplicationReleaseType.APP_STORE) return null;
    // TestFlight and development apps use StoreKit's sandbox environment.
    // If StoreKit can't verify the app transaction, don't show a store prompt.
    if (await LatchAppUpdates.getStoreEnvironmentAsync() !== 'production') return null;
    const installedVersion = Application.nativeApplicationVersion;
    if (!installedVersion) return null;

    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${APPLE_APP_ID}&country=us`,
    );
    if (!response.ok) return null;
    return appleUpdateFromLookup(
      await response.json(),
      IOS_BUNDLE_ID,
      installedVersion,
    );
  }

  if (Platform.OS === 'android') {
    if (Application.applicationId !== ANDROID_PACKAGE) return null;
    const versionCode = await LatchAppUpdates.getPlayUpdateAsync();
    if (versionCode === null || !Number.isSafeInteger(versionCode) || versionCode <= 0) return null;
    return {
      id: `android:${versionCode}`,
      url: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    };
  }

  return null;
}
