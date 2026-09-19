import { expect, mock, test } from 'bun:test';
import fs from 'node:fs';

let fonts = [false, null];
let hidden = 0;
const effects = [];
const jsx = (type, props) => ({ type, props });
mock.module('react/jsx-runtime', () => ({ jsx, jsxs: jsx }));
mock.module('react/jsx-dev-runtime', () => ({ jsxDEV: jsx }));
mock.module('react', () => ({
  useEffect: effect => effects.push(effect),
}));
mock.module('react-native', () => ({ Platform: { OS: 'android' }, StyleSheet: { create: x => x }, Text: 'Text', View: 'View', Pressable: 'Pressable' }));
mock.module('react-native-reanimated', () => ({}));
mock.module('../src/lib/ignore-extension-noise', () => ({}));
mock.module('@expo-google-fonts/fraunces', () => ({ Fraunces_600SemiBold: 1, useFonts: () => fonts }));
mock.module('@expo-google-fonts/outfit', () => ({ Outfit_400Regular: 2 }));
mock.module('expo-router', () => ({ Stack: 'Stack' }));
mock.module('expo-router/js-stack', () => ({ Stack: 'JsStack' }));
mock.module('expo-splash-screen', () => ({ preventAutoHideAsync: async () => {}, hideAsync: async () => { hidden++; } }));
mock.module('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
mock.module('react-native-gesture-handler', () => ({ GestureHandlerRootView: 'Root' }));
for (const [path, name] of [
  ['../src/components/status-screen','StatusScreen'], ['../src/components/demo-notice','DemoNotice'],
  ['../src/lib/analytics-provider','AnalyticsProvider'], ['../src/lib/i18n/provider','LocaleProvider'],
  ['../src/lib/session','SessionProvider'],
]) mock.module(path, () => ({ [name]: name }));
mock.module('../src/lib/i18n', () => ({ t: x => x }));
mock.module('../src/lib/screen-slide', () => ({ slideInOut: {} }));
mock.module('../src/lib/title', () => ({ APP_NAME: 'LatchMX' }));
mock.module('../src/lib/theme', () => ({ color: {}, type: {} }));
const { default: RootLayout, ErrorBoundary } = await import('../src/app/_layout');

test('stalled fonts do not block mounting and layout dismisses the splash', () => {
  const root = RootLayout();
  expect(root.type).toBe('Root');
  expect(hidden).toBe(0);
  root.props.onLayout();
  expect(hidden).toBe(1);
});
test('loaded or failed fonts mount immediately', () => {
  fonts = [true, null];
  expect(RootLayout().type).toBe('Root');
  fonts = [false, new Error('font unavailable')];
  expect(RootLayout().type).toBe('Root');
});
test('root error boundary reveals its retry screen', () => {
  effects.length = 0;
  const before = hidden;
  const result = ErrorBoundary({ error: new Error('boot failed'), retry() {} });
  effects.splice(0).forEach(effect => effect());
  expect(result.type).toBe('View');
  expect(hidden).toBe(before + 1);
});

test('resident onboarding is persisted and login toast only follows an interactive sign in', () => {
  const home = fs.readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');
  const welcome = fs.readFileSync(new URL('../src/components/resident-welcome.tsx', import.meta.url), 'utf8');
  expect(home).toContain("previous !== 'signed_out' || mode !== 'signed_in'");
  expect(home).toContain('<LoginToast visible={!guest && showLoginToast} />');
  expect(home).toContain('{!guest && introduceResident ? <ResidentWelcome /> : null}');
  expect(welcome).toContain("const INTRO_KEY = 'latch.resident-intro.v1'");
  expect(welcome).toContain("storageSet(INTRO_KEY, 'true')");
});
