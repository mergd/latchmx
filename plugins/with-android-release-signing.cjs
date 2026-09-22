const { withAppBuildGradle } = require('expo/config-plugins');

const variableMarker = "def latchUploadKeystore = System.getenv('LATCH_ANDROID_UPLOAD_KEYSTORE')";
const releaseConfigMarker = 'storeFile file(latchUploadKeystore)';
const releaseBuildMarker = 'if (latchUploadKeystore) {';

function addReleaseSigning(source) {
  let result = source;

  if (!result.includes(variableMarker)) {
    const projectRoot = /^(def projectRoot = .*\n)/m;
    if (!projectRoot.test(result)) {
      throw new Error('Android release signing: Expo Gradle template changed near projectRoot.');
    }
    result = result.replace(
      projectRoot,
      `$1${variableMarker}\n` +
        "def latchUploadAlias = System.getenv('LATCH_ANDROID_UPLOAD_ALIAS') ?: 'latch-upload'\n",
    );
  }

  if (!result.includes(releaseConfigMarker)) {
    const signingConfigs = /^(\s*)signingConfigs \{\n(\s*)debug \{/m;
    if (!signingConfigs.test(result)) {
      throw new Error('Android release signing: Expo Gradle template changed near signingConfigs.');
    }
    result = result.replace(
      signingConfigs,
      `$1signingConfigs {\n` +
        `$2if (latchUploadKeystore) {\n` +
        `$2    release {\n` +
        `$2        storeFile file(latchUploadKeystore)\n` +
        `$2        storePassword System.getenv('LATCH_ANDROID_UPLOAD_PASSWORD')\n` +
        `$2        keyAlias latchUploadAlias\n` +
        `$2        keyPassword System.getenv('LATCH_ANDROID_UPLOAD_PASSWORD')\n` +
        `$2    }\n` +
        `$2}\n` +
        `$2debug {`,
    );
  }

  if (!result.includes(`${releaseBuildMarker}\n                signingConfig signingConfigs.release`)) {
    const releaseSigning = /(\s*release \{\n\s*\/\/ Caution! In production, you need to generate your own keystore file\.\n\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\n)\s*signingConfig signingConfigs\.debug\n/;
    if (!releaseSigning.test(result)) {
      throw new Error('Android release signing: Expo Gradle template changed near release build type.');
    }
    result = result.replace(
      releaseSigning,
      `$1            if (latchUploadKeystore) {\n` +
        `                signingConfig signingConfigs.release\n` +
        `            }\n`,
    );
  }

  return result;
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = addReleaseSigning(mod.modResults.contents);
    return mod;
  });
}

module.exports = withAndroidReleaseSigning;
module.exports.addReleaseSigning = addReleaseSigning;
