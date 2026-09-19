import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { migrateAppDelegate, sceneManifest } = require('../plugins/with-ios-scene-lifecycle.cjs');
const legacy = `class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?
  func launch() {
#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  // Existing linking and factory configuration must survive.
}`;

test('scene manifest registers a single window scene and preserves unrelated scene roles', () => {
  const manifest = sceneManifest({ UISceneConfigurations: { external: ['existing'] } });
  expect(manifest.UIApplicationSupportsMultipleScenes).toBe(false);
  expect(manifest.UISceneConfigurations.external).toEqual(['existing']);
  expect(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName)
    .toBe('$(PRODUCT_MODULE_NAME).SceneDelegate');
});

test('React Native starts only after a UIWindowScene supplies the window', () => {
  const migrated = migrateAppDelegate(legacy);
  expect(migrated).not.toContain('UIWindow(frame: UIScreen.main.bounds)');
  expect(migrated.match(/factory.startReactNative\(/g)).toHaveLength(1);
  expect(migrated.indexOf('factory.startReactNative(')).toBeGreaterThan(migrated.indexOf('class SceneDelegate'));
  expect(migrated).toContain('UIWindow(windowScene: windowScene)');
  expect(migrated).toContain('configurationForConnecting connectingSceneSession: UISceneSession');
  expect(migrated).toContain('configuration.delegateClass = SceneDelegate.self');
  expect(migrated).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  expect(migrated).toContain('// Existing linking and factory configuration must survive.');
});

test('migration is idempotent and rejects unexpected Expo templates', () => {
  const migrated = migrateAppDelegate(legacy);
  expect(migrateAppDelegate(migrated)).toBe(migrated);
  expect(() => migrateAppDelegate('class AppDelegate {}')).toThrow('Expo AppDelegate template changed');
});

test('cold launch links reach React Native initial URL and warm links reach existing handlers', () => {
  const migrated = migrateAppDelegate(legacy);
  expect(migrated).toContain('launchOptions[.url] = context.url');
  expect(migrated).toContain('"UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType');
  expect(migrated).toContain('"UIApplicationLaunchOptionsUserActivityKey": activity');
  expect(migrated).toContain('appDelegate.application(UIApplication.shared, open: context.url, options: options)');
  expect(migrated).toContain('appDelegate.application(UIApplication.shared, continue: userActivity');
});

test('scene callbacks keep Expo subscribers informed of active and background transitions', () => {
  const migrated = migrateAppDelegate(legacy);
  for (const method of ['applicationDidBecomeActive', 'applicationWillResignActive', 'applicationDidEnterBackground', 'applicationWillEnterForeground']) {
    expect(migrated).toContain(`?.${method}(UIApplication.shared)`);
  }
});
