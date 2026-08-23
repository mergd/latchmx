import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

const TOKEN = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://e.fldr.zip';

const SUPER = {
  product: 'latch',
  surface: Platform.OS === 'web' ? 'web' : Platform.OS,
};

let client: PostHog | null = null;

function canUseAnalytics(): boolean {
  if (TOKEN.length === 0) {
    return false;
  }
  if (Platform.OS !== 'web') {
    return true;
  }
  return typeof window !== 'undefined';
}

export function getPosthog(): PostHog | null {
  if (!canUseAnalytics()) {
    return null;
  }
  if (client === null) {
    client = new PostHog(TOKEN, {
      host: HOST,
      customStorage: AsyncStorage,
      enableSessionReplay: Platform.OS === 'web',
      sessionReplayConfig: { maskAllTextInputs: true },
      errorTracking: {
        autocapture: { uncaughtExceptions: true, unhandledRejections: true },
      },
    });
    client.register(SUPER);
  }
  return client;
}

export function capture(
  event: string,
  properties?: Parameters<PostHog['capture']>[1],
) {
  getPosthog()?.capture(event, properties);
}

export function resetAnalytics() {
  const posthog = getPosthog();
  if (posthog === null) {
    return;
  }
  posthog.reset();
  posthog.register(SUPER);
}
