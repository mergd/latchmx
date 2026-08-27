import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthCodeDialog } from '@/components/auth-code-dialog';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export function SignInForm() {
  const { openSignIn, signInUrl, completeSignIn, canSignIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onOpenLogin = useCallback(async () => {
    setMessage(null);
    try {
      await openSignIn();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not open ButterflyMX.',
      );
    }
  }, [openSignIn]);

  const onInstall = useCallback(
    async (code: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await completeSignIn(code);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Sign-in failed.');
      } finally {
        setBusy(false);
      }
    },
    [completeSignIn],
  );

  return (
    <View style={styles.wrap}>
      {message !== null && !awaitingCode ? (
        <Text style={styles.error}>{message}</Text>
      ) : null}
      {!canSignIn ? (
        <Text style={styles.error}>
          This build isn’t set up for ButterflyMX sign-in.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        style={[styles.primary, !canSignIn ? styles.primaryDisabled : null]}
        onPress={() => {
          if (!canSignIn) {
            return;
          }
          setMessage(null);
          setAwaitingCode(true);
        }}
        disabled={!canSignIn}
      >
        <Text style={styles.primaryLabel}>Sign in</Text>
      </Pressable>
      <AuthCodeDialog
        visible={awaitingCode}
        busy={busy}
        error={message}
        signInUrl={signInUrl}
        onOpenLogin={onOpenLogin}
        onCancel={() => {
          setAwaitingCode(false);
          setMessage(null);
        }}
        onInstall={onInstall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  primary: {
    backgroundColor: color.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    cursor: 'pointer',
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
});
