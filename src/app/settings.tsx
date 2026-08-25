import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { SignInForm } from '@/components/sign-in-form';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export default function SettingsScreen() {
  const { account, buildingName, mode, signOut } = useSession();
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const name = account?.name?.trim() ?? '';
  const email = account?.email?.trim() ?? '';
  const identity =
    name.length > 0 || email.length > 0
      ? { name, email }
      : buildingName.length > 0
        ? { name: buildingName, email: '' }
        : { name: 'Signed in', email: '' };

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
        {mode === 'signed_in' ? (
          <View style={styles.identity}>
            <Text style={styles.accountName}>{identity.name}</Text>
            {identity.email.length > 0 ? (
              <Text style={styles.accountEmail}>{identity.email}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {mode === 'signed_in' ? (
        <>
          <Pressable
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            onPress={() => {
              router.push('/keys');
            }}
          >
            <Text style={styles.rowLabel}>Keys</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            onPress={() => {
              setPendingSignOut(true);
            }}
          >
            <Text style={styles.rowLabel}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.form}>
          <SignInForm />
        </View>
      )}
      <ConfirmDialog
        visible={pendingSignOut}
        title="Sign out?"
        body="You’ll need a ButterflyMX authorization code to get back in."
        confirmLabel="Sign out"
        onCancel={() => {
          setPendingSignOut(false);
        }}
        onConfirm={() => {
          setPendingSignOut(false);
          void signOut();
        }}
      />
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
