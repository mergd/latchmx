#!/bin/sh
set -eu

EXPECTED_SHA1="19565112834D5B34C9091724D1E10A6BBCC98299"
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SIGNING_DIR=$(mktemp -d /private/tmp/latchmx-android-signing.XXXXXX)
KEYSTORE="$SIGNING_DIR/upload.jks"

cleanup() {
  find "$SIGNING_DIR" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

: "${LATCH_ANDROID_UPLOAD_KEYSTORE_B64:?Run this command through ap; the saved Android keystore is unavailable.}"
: "${LATCH_ANDROID_UPLOAD_PASSWORD:?Run this command through ap; the saved Android keystore password is unavailable.}"

printf '%s' "$LATCH_ANDROID_UPLOAD_KEYSTORE_B64" | /usr/bin/base64 -D > "$KEYSTORE"
chmod 600 "$KEYSTORE"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export LATCH_ANDROID_UPLOAD_KEYSTORE="$KEYSTORE"
export LATCH_ANDROID_UPLOAD_ALIAS="${LATCH_ANDROID_UPLOAD_ALIAS:-latch-upload}"
export NODE_ENV=production

key_sha1=$(
  "$JAVA_HOME/bin/keytool" -list -v \
    -keystore "$KEYSTORE" \
    -alias "$LATCH_ANDROID_UPLOAD_ALIAS" \
    -storepass "$LATCH_ANDROID_UPLOAD_PASSWORD" 2>/dev/null \
    | sed -n 's/.*SHA1: //p' \
    | head -1 \
    | tr -d ':'
)

if [ "$key_sha1" != "$EXPECTED_SHA1" ]; then
  echo "Saved Android signing key does not match the Google Play upload certificate." >&2
  exit 1
fi

cd "$PROJECT_ROOT/android"
./gradlew --no-daemon --no-configuration-cache bundleRelease

AAB="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"
cert_entry=$(unzip -Z1 "$AAB" | grep -E '^META-INF/.*\.(RSA|DSA|EC)$' | head -1)
bundle_sha1=$(
  unzip -p "$AAB" "$cert_entry" \
    | "$JAVA_HOME/bin/keytool" -printcert 2>/dev/null \
    | sed -n 's/.*SHA1: //p' \
    | head -1 \
    | tr -d ':'
)

if [ "$bundle_sha1" != "$EXPECTED_SHA1" ]; then
  echo "Built Android bundle is signed with the wrong certificate." >&2
  exit 1
fi

echo "Android release bundle signed with the approved Google Play key: $AAB"
