import 'react-native-reanimated';
import '@/lib/ignore-extension-noise';
import { Fraunces_600SemiBold, useFonts } from '@expo-google-fonts/fraunces';
import { Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnalyticsProvider } from '@/lib/analytics-provider';
import { slideInOut } from '@/lib/screen-slide';
import { SessionProvider } from '@/lib/session';
import { color, type } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Latch hit a snag</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Pressable onPress={retry} style={styles.retry}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Outfit_400Regular,
  });

  if (!fontsLoaded && fontError == null) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SessionProvider>
        <AnalyticsProvider>
          <StatusBar style="light" />
          <View style={styles.page}>
            <View style={styles.frame}>
              <AppStack />
            </View>
          </View>
        </AnalyticsProvider>
      </SessionProvider>
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
    maxWidth: 430,
    overflow: 'hidden',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: color.canvas,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 28,
  },
  errorBody: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  retry: {
    alignSelf: 'flex-start',
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
