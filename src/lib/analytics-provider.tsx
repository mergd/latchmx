import { usePathname } from 'expo-router';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';

import { getPosthog } from '@/lib/analytics';
import { useSession } from '@/lib/session';

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useSession();
  if (isDemo) return children;
  const posthog = getPosthog();
  if (posthog === null) {
    return children;
  }
  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureTouches: true, captureScreens: false }}
    >
      <Identify />
      <ScreenViews />
      {children}
    </PostHogProvider>
  );
}

function Identify() {
  const { account, mode } = useSession();
  const client = usePostHog();

  useEffect(() => {
    if (!client || mode !== 'signed_in') {
      return;
    }
    const email = account?.email?.trim();
    if (email === undefined || email.length === 0) {
      return;
    }
    client.identify(email, {
      ...(account?.name ? { name: account.name } : {}),
      email,
    });
  }, [account, client, mode]);

  return null;
}

function ScreenViews() {
  const pathname = usePathname();
  const client = usePostHog();

  useEffect(() => {
    if (!client || !pathname) {
      return;
    }
    client.screen(pathname);
  }, [client, pathname]);

  return null;
}
