import { execSync } from 'child_process';
import type { ExpoConfig } from 'expo/config';

function resolveGitHash(): string {
  const eas = process.env.EAS_BUILD_GIT_COMMIT_HASH?.trim();
  if (eas !== undefined && eas.length > 0) {
    return eas;
  }
  try {
    return execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function gitIsDirty(): boolean {
  if (process.env.EAS_BUILD === 'true') {
    return false;
  }
  try {
    return (
      execSync('git status --porcelain', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().length > 0
    );
  } catch {
    return false;
  }
}

const config: ExpoConfig = {
  name: 'LatchMX',
  slug: 'butterflymx',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'latch',
  userInterfaceStyle: 'dark',
  owner: 'williamexpo',
  autolinking: {
    ios: {
      buildFromSource: ['react-native-reanimated', 'react-native-worklets'],
    },
  },
  ios: {
    buildNumber: '15',
    icon: './assets/images/icon.png',
    bundleIdentifier: 'dev.william.latch',
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'dev.fldr.latch',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#0E0E0D',
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
        backgroundColor: '#0E0E0D',
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
    eas: {
      projectId: '5ff7bf4f-a83d-4d59-8a95-adc95bdf8c1b',
    },
    bmxEnv: process.env.BMX_ENV ?? 'production',
    bmxClientId: process.env.BMX_CLIENT_ID ?? '',
    bmxRedirectUri:
      process.env.BMX_REDIRECT_URI ?? 'urn:ietf:wg:oauth:2.0:oob',
    bmxProxyOrigin: process.env.BMX_PROXY_ORIGIN ?? 'https://bmx.fldr.zip',
    buildHash: resolveGitHash(),
    buildDirty: gitIsDirty(),
    feedbackEmail: process.env.FEEDBACK_EMAIL ?? 'hello@fldr.zip',
  },
};

export default config;
