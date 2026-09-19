const fs = require('node:fs');
const path = require('node:path');
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const marker = '// LatchMX scene lifecycle';
const sceneDelegate = fs.readFileSync(path.join(__dirname, 'ios/SceneDelegate.swift'), 'utf8');
const sceneConfiguration = `
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.sceneClass = UIWindowScene.self
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

function migrateAppDelegate(source) {
  if (source.includes(marker)) return source;
  const bootstrap = /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)\s+#endif/;
  const factoryProperty = '  var reactNativeFactory: RCTReactNativeFactory?';
  if (!bootstrap.test(source) || !source.includes(factoryProperty)) {
    throw new Error('iOS scene migration: Expo AppDelegate template changed; review native startup before building.');
  }
  return source
    .replace(factoryProperty, `${factoryProperty}\n  var reactNativeLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?\n${sceneConfiguration}`)
    .replace(bootstrap, '    reactNativeLaunchOptions = launchOptions')
    + `\n${marker}\n${sceneDelegate}`;
}

function sceneManifest(existing = {}) {
  return {
    ...existing,
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      ...existing.UISceneConfigurations,
      UIWindowSceneSessionRoleApplication: [{
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      }],
    },
  };
}

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = sceneManifest(mod.modResults.UIApplicationSceneManifest);
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('iOS scene migration requires the Swift Expo AppDelegate.');
    }
    mod.modResults.contents = migrateAppDelegate(mod.modResults.contents);
    return mod;
  });
}

module.exports = withIosSceneLifecycle;
module.exports.migrateAppDelegate = migrateAppDelegate;
module.exports.sceneManifest = sceneManifest;
