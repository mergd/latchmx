import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { FlapLoader } from '@/components/flap-loader';
import { authorizationCodeFromUrl } from '@/lib/bmx-api';
import { color, type } from '@/lib/theme';

type AuthLoginDrawerProps = {
  visible: boolean;
  url: string;
  onClose: () => void;
  onCapturedCode: (code: string) => void;
};

const chromeMobileUa =
  'Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const safariMobileUa =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export function AuthLoginDrawer({
  visible,
  url,
  onClose,
  onCapturedCode,
}: AuthLoginDrawerProps) {
  const insets = useSafeAreaInsets();
  const captured = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) {
      return;
    }
    captured.current = null;
    setLoading(true);
  }, [visible]);

  const userAgent = Platform.OS === 'ios' ? safariMobileUa : chromeMobileUa;
  const source = useMemo(() => ({ uri: url }), [url]);

  const considerUrl = useCallback(
    (nextUrl: string) => {
      const code = authorizationCodeFromUrl(nextUrl);
      if (code === null || captured.current === code) {
        return true;
      }
      captured.current = code;
      onCapturedCode(code);
      return false;
    },
    [onCapturedCode],
  );

  const onNav = useCallback(
    (event: WebViewNavigation) => {
      considerUrl(event.url);
    },
    [considerUrl],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>ButterflyMX</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close login"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed ? styles.closePressed : null]}
            >
              <X color={color.text} size={18} strokeWidth={1.75} />
            </Pressable>
          </View>
          <View style={styles.webWrap}>
            {visible ? (
              <WebView
                source={source}
                userAgent={userAgent}
                style={styles.web}
                onLoadStart={() => {
                  setLoading(true);
                }}
                onLoadEnd={() => {
                  setLoading(false);
                }}
                onNavigationStateChange={onNav}
                onShouldStartLoadWithRequest={(request) => considerUrl(request.url)}
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                javaScriptEnabled
                domStorageEnabled
                setSupportMultipleWindows={false}
              />
            ) : null}
            {loading ? (
              <View style={styles.loading} pointerEvents="none">
                <FlapLoader size={48} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.overlay,
  },
  sheet: {
    height: '92%',
    backgroundColor: color.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(242, 241, 236, 0.22)',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 22,
    lineHeight: 26,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 241, 236, 0.1)',
  },
  closePressed: {
    opacity: 0.78,
  },
  webWrap: {
    flex: 1,
    backgroundColor: color.canvas,
    marginHorizontal: 10,
    marginBottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.canvas,
  },
});
