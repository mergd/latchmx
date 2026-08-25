import { useEffect, useRef, useState, type RefObject } from 'react';
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

type Step = 'instruct' | 'paste';

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
  const [step, setStep] = useState<Step>('instruct');
  const [browsing, setBrowsing] = useState(false);
  const [code, setCode] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStep('instruct');
      setBrowsing(false);
      setCode('');
      setKeyboardInset(0);
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
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || browsing || step !== 'paste') {
      return;
    }
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [browsing, step, visible]);

  const goToPortal = async () => {
    setStep('paste');
    if (Platform.OS !== 'web') {
      setBrowsing(true);
    }
    try {
      await onOpenLogin();
    } finally {
      setBrowsing(false);
    }
  };

  const submit = () => {
    const trimmed = code.trim();
    if (busy || trimmed.length === 0) {
      return;
    }
    Keyboard.dismiss();
    void onInstall(trimmed);
  };

  const lift = keyboardInset > 0 ? keyboardInset : insets.bottom;
  const centered = Platform.OS === 'web' && keyboardInset === 0;

  return (
    <Modal
      visible={visible && !browsing}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
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
          {renderStep(step, {
            busy,
            code,
            error,
            onCancel,
            onChangeCode: setCode,
            onGoToPortal: () => {
              void goToPortal();
            },
            onSubmit: submit,
            inputRef,
          })}
        </View>
      </View>
    </Modal>
  );
}

function renderStep(
  step: Step,
  props: {
    busy: boolean;
    code: string;
    error: string | null;
    onCancel: () => void;
    onChangeCode: (value: string) => void;
    onGoToPortal: () => void;
    onSubmit: () => void;
    inputRef: RefObject<TextInput | null>;
  },
) {
  switch (step) {
    case 'instruct':
      return (
        <>
          <Text style={styles.title}>Copy the value</Text>
          <Text style={styles.body}>
            ButterflyMX will ask you to sign in, then show a value. Copy it,
            come back here, and paste.
          </Text>
          {props.error !== null ? <Text style={styles.error}>{props.error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed ? styles.btnPressed : null]}
              onPress={props.onCancel}
              disabled={props.busy}
            >
              <Text style={styles.btnLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed ? styles.btnPressed : null,
              ]}
              onPress={props.onGoToPortal}
              disabled={props.busy}
            >
              <Text style={styles.btnPrimaryLabel}>Go to portal</Text>
            </Pressable>
          </View>
        </>
      );
    case 'paste':
      return (
        <>
          <Text style={styles.title}>Paste the value</Text>
          <Text style={styles.body}>
            Paste the value you copied, then tap Install.
          </Text>
          <Pressable
            onPress={props.onGoToPortal}
            hitSlop={8}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkLabel}>Open portal again</Text>
          </Pressable>
          {props.error !== null ? <Text style={styles.error}>{props.error}</Text> : null}
          <TextInput
            ref={props.inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            placeholder="Authorization code"
            placeholderTextColor={color.muted}
            style={styles.input}
            value={props.code}
            editable={!props.busy}
            returnKeyType="done"
            onChangeText={props.onChangeCode}
            onSubmitEditing={props.onSubmit}
          />
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed ? styles.btnPressed : null]}
              onPress={props.onCancel}
              disabled={props.busy}
            >
              <Text style={styles.btnLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed ? styles.btnPressed : null,
                props.busy || props.code.trim().length === 0 ? styles.btnBusy : null,
              ]}
              onPress={props.onSubmit}
              disabled={props.busy || props.code.trim().length === 0}
            >
              <Text style={styles.btnPrimaryLabel}>
                {props.busy ? 'Installing' : 'Install'}
              </Text>
            </Pressable>
          </View>
        </>
      );
    default: {
      const _never: never = step;
      return _never;
    }
  }
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
  btnPrimary: {
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
  btnPrimaryLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 15,
  },
});
