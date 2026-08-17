import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { SignInForm } from '@/components/sign-in-form';
import { StatusPill } from '@/components/status-pill';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export default function SettingsScreen() {
  const { mode, signOut } = useSession();

  return (
    <AppShell>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <StatusPill mode={mode} />
      </View>

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
        <SignInForm />
      )}

      <Pressable style={styles.ghost} onPress={() => router.back()}>
        <Text style={styles.ghostLabel}>Back</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 6,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 26,
    lineHeight: 30,
  },
  secondary: {
    marginHorizontal: 16,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
});
