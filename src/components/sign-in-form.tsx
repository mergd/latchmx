import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export function SignInForm() {
  const { openSignIn, completeSignIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const onOpenSignIn = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await openSignIn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open sign-in.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmitCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await completeSignIn(code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.lede}>
        Sign in with ButterflyMX, then paste the one-time code they show.
      </Text>
      {message !== null ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        style={styles.primary}
        onPress={() => {
          void onOpenSignIn();
        }}
        disabled={busy}
      >
        <Text style={styles.primaryLabel}>
          {busy ? 'Opening ButterflyMX' : 'Sign in'}
        </Text>
      </Pressable>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Authorization code"
        placeholderTextColor={color.muted}
        style={styles.input}
        value={code}
        onChangeText={setCode}
      />
      <Pressable
        style={styles.secondary}
        onPress={() => {
          void onSubmitCode();
        }}
        disabled={busy}
      >
        <Text style={styles.secondaryLabel}>Connect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  lede: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    opacity: 0.78,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  input: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  primary: {
    backgroundColor: color.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
  secondary: {
    backgroundColor: color.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
});
