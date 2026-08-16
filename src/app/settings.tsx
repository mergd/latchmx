import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppShell } from '@/components/app-shell';
import { StatusPill } from '@/components/status-pill';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export default function SettingsScreen() {
  const { mode, canSignIn, openSignIn, completeSignIn, signOut, enterDemo } =
    useSession();
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
      router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Account</Text>
            <StatusPill mode={mode} />
          </View>

          <Text style={styles.lede}>{accountLine(mode, canSignIn)}</Text>

          {message !== null ? <Text style={styles.error}>{message}</Text> : null}

          <View style={styles.actions}>
            {canSignIn && mode !== 'signed_in' ? (
              <>
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
              </>
            ) : null}

            {mode === 'signed_in' ? (
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  void signOut();
                }}
              >
                <Text style={styles.secondaryLabel}>Sign out</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.ghost}
                onPress={() => {
                  enterDemo();
                  router.back();
                }}
              >
                <Text style={styles.ghostLabel}>Demo</Text>
              </Pressable>
            )}

            <Pressable style={styles.ghost} onPress={() => router.back()}>
              <Text style={styles.ghostLabel}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

function accountLine(mode: 'loading' | 'demo' | 'signed_in', canSignIn: boolean): string {
  switch (mode) {
    case 'loading':
      return 'Checking session.';
    case 'demo':
      return canSignIn
        ? 'Sign in with ButterflyMX, then paste the code.'
        : 'Restart Expo after adding credentials.';
    case 'signed_in':
      return 'Connected to ButterflyMX.';
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 26,
    lineHeight: 30,
  },
  lede: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    marginTop: 12,
    fontSize: 14,
  },
  actions: {
    marginTop: 20,
    gap: 8,
  },
  input: {
    backgroundColor: color.well,
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
    color: color.canvas,
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
  ghost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
});
