import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, type } from '@/lib/theme';

type AuthCodeDialogProps = {
  visible: boolean;
  busy: boolean;
  error: string | null;
  onOpenLogin: () => Promise<void>;
  onCancel: () => void;
  onInstall: (code: string) => Promise<void>;
};

export function AuthCodeDialog({
  visible,
  busy,
  error,
  onOpenLogin,
  onCancel,
  onInstall,
}: AuthCodeDialogProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const openedLogin = useRef(false);
  const [code, setCode] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setCode('');
      setKeyboardInset(0);
      openedLogin.current = false;
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    const open = setTimeout(() => {
      if (openedLogin.current) {
        return;
      }
      openedLogin.current = true;
      void onOpenLogin();
    }, 500);
    return () => {
      show.remove();
      hide.remove();
      clearTimeout(open);
    };
  }, [onOpenLogin, visible]);

  const lift = keyboardInset > 0 ? keyboardInset : insets.bottom;
  const centered = Platform.OS === 'web' && keyboardInset === 0;

  const submit = () => {
    const trimmed = code.trim();
    if (busy || trimmed.length === 0) {
      return;
    }
    Keyboard.dismiss();
    void onInstall(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={[
          styles.backdrop,
          centered ? styles.backdropCenter : styles.backdropSheet,
          { paddingBottom: centered ? 28 : lift + 12 },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onCancel}
        />
        <View style={styles.card}>
          <Text style={styles.title}>Paste the code</Text>
          <Text style={styles.body}>
            ButterflyMX will ask you to sign in, then show an authorization
            code. Copy that code, paste it here, and tap Install.
          </Text>
          <Pressable
            onPress={() => {
              void onOpenLogin();
            }}
            hitSlop={8}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkLabel}>Open ButterflyMX sign-in</Text>
          </Pressable>
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            placeholder="Authorization code"
            placeholderTextColor={color.muted}
            style={styles.input}
            value={code}
            autoFocus
            editable={!busy}
            returnKeyType="done"
            onChangeText={setCode}
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed ? styles.btnPressed : null]}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.btnLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnInstall,
                pressed ? styles.btnPressed : null,
                busy || code.trim().length === 0 ? styles.btnBusy : null,
              ]}
              onPress={submit}
              disabled={busy || code.trim().length === 0}
            >
              <Text style={styles.btnInstallLabel}>
                {busy ? 'Installing' : 'Install'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    paddingHorizontal: 16,
  },
  backdropCenter: {
    justifyContent: 'center',
    paddingVertical: 28,
  },
  backdropSheet: {
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: color.surface,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 24,
    lineHeight: 28,
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  loginLink: {
    alignSelf: 'flex-start',
    cursor: 'pointer',
  },
  loginLinkLabel: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 15,
    textDecorationLine: 'underline',
    textDecorationColor: color.accent,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  input: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  btnInstall: {
    backgroundColor: color.accent,
  },
  btnBusy: {
    opacity: 0.7,
  },
  btnPressed: {
    opacity: 0.78,
  },
  btnLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
  btnInstallLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 15,
  },
});
