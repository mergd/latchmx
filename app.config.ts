import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Latch',
  slug: 'butterflymx',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'latch',
  userInterfaceStyle: 'dark',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'dev.william.latch',
    supportsTablet: false,
  },
  android: {
    package: 'dev.william.latch',
    adaptiveIcon: {
      backgroundColor: '#0B1A33',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: process.env.EXPO_WEB_OUTPUT === 'static' ? 'static' : 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B1A33',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    bmxEnv: process.env.BMX_ENV ?? 'production',
    bmxClientId: process.env.BMX_CLIENT_ID ?? '',
    bmxClientSecret: process.env.BMX_CLIENT_SECRET ?? '',
    bmxRedirectUri:
      process.env.BMX_REDIRECT_URI ?? 'urn:ietf:wg:oauth:2.0:oob',
  },
};

export default config;
