import 'react-native-reanimated';
import '@/lib/ignore-extension-noise';
import { Fraunces_600SemiBold, useFonts } from '@expo-google-fonts/fraunces';
import { Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { StatusScreen } from '@/components/status-screen';
import { DemoNotice } from '@/components/demo-notice';
import { AnalyticsProvider } from '@/lib/analytics-provider';
import { t } from '@/lib/i18n';
import { LocaleProvider } from '@/lib/i18n/provider';
import { slideInOut } from '@/lib/screen-slide';
import { SessionProvider } from '@/lib/session';
import { APP_NAME } from '@/lib/title';
import { color, type } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync().catch(console.warn);

function hideSplash() {
  void SplashScreen.hideAsync().catch(console.warn);
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const title = t('app.snag', { name: APP_NAME });
  useEffect(() => {
    hideSplash();
    if (Platform.OS === 'web') {
      document.title = title;
    }
  }, [title]);

  return (
    <View style={styles.errorScreen}>
      <StatusScreen title={title} body={error.message} tabTitle={false}>
        <Pressable onPress={retry} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.tryAgain')}</Text>
        </Pressable>
      </StatusScreen>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Outfit_400Regular,
  });
  const [fontWaitExpired, setFontWaitExpired] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError != null) return;
    const timer = setTimeout(() => setFontWaitExpired(true), 4000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && fontError == null && !fontWaitExpired) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={hideSplash}>
      <LocaleProvider>
        <SessionProvider>
          <AnalyticsProvider>
            <StatusBar style="light" />
            <View style={styles.page}>
              <View style={styles.frame}>
                <AppStack />
                <DemoNotice />
              </View>
            </View>
          </AnalyticsProvider>
        </SessionProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  if (Platform.OS === 'web') {
    return (
      <JsStack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          cardStyle: { backgroundColor: color.canvas, flex: 1 },
          ...slideInOut,
        }}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.canvas },
        animation: 'slide_from_right',
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  page: {
    flex: 1,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    overflow: 'hidden',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  retry: {
    marginTop: 6,
    backgroundColor: color.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
});
