import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { IconButton } from '@/components/icon-button';
import { SignInForm } from '@/components/sign-in-form';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export default function SettingsScreen() {
  const { account, mode, signOut } = useSession();
  const name = account?.name?.trim() ?? '';
  const email = account?.email?.trim() ?? '';

  return (
    <AppShell>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton
            icon={ChevronLeft}
            label="Back"
            onPress={() => {
              router.back();
            }}
          />
          <Text style={styles.title}>Account</Text>
        </View>
        {mode === 'signed_in' && (name.length > 0 || email.length > 0) ? (
          <View style={styles.identity}>
            {name.length > 0 ? <Text style={styles.accountName}>{name}</Text> : null}
            {email.length > 0 ? (
              <Text style={name.length > 0 ? styles.accountEmail : styles.accountName}>
                {email}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {mode === 'signed_in' ? (
        <Pressable
          style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.rowLabel}>Sign out</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <SignInForm />
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  title: {
    flex: 1,
    color: color.text,
    fontFamily: type.title,
    fontSize: 34,
    lineHeight: 38,
  },
  form: {
    paddingHorizontal: 20,
  },
  identity: {
    paddingTop: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  accountName: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 18,
  },
  accountEmail: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
  },
  row: {
    marginHorizontal: 12,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    cursor: 'pointer',
  },
  rowPressed: {
    backgroundColor: color.fill,
  },
  rowLabel: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
});
