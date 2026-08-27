import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { PageTitle } from '@/components/page-title';
import { SignInForm } from '@/components/sign-in-form';
import { build, buildStamp } from '@/lib/build';
import { openFeedback } from '@/lib/feedback';
import { hapticSuccess } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';

export default function SettingsScreen() {
  const { account, buildingName, mode, signOut } = useSession();
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const name = account?.name?.trim() ?? '';
  const email = account?.email?.trim() ?? '';
  const identity =
    account !== null
      ? {
          name: name.length > 0 ? name : account.kind === 'guest' ? 'Guest' : 'Signed in',
          email,
          hint:
            account.kind === 'guest'
              ? 'Guest pass'
              : (account.buildingName ?? buildingName),
        }
      : mode === 'signed_in'
        ? {
            name: name.length > 0 ? name : buildingName.length > 0 ? buildingName : 'Signed in',
            email,
            hint: buildingName,
          }
        : null;

  useEffect(() => {
    if (!copied) {
      return;
    }
    const id = setTimeout(() => {
      setCopied(false);
    }, 1400);
    return () => {
      clearTimeout(id);
    };
  }, [copied]);

  const onCopyBuild = async () => {
    const value = build.hash.length > 0 ? build.hash : buildStamp();
    await Clipboard.setStringAsync(value);
    setCopied(true);
    void hapticSuccess();
  };

  return (
    <AppShell>
      <PageTitle title={latchTitle('Account')} />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton
              icon={CaretLeftIcon}
              label="Back"
              onPress={() => {
                router.back();
              }}
            />
            <Text style={styles.title}>Account</Text>
          </View>
          {identity !== null ? (
            <View style={styles.identity}>
              <Text style={styles.accountName}>{identity.name}</Text>
              {identity.email.length > 0 ? (
                <Text style={styles.accountEmail}>{identity.email}</Text>
              ) : identity.hint.length > 0 ? (
                <Text style={styles.accountEmail}>{identity.hint}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {mode === 'signed_in' ? (
          <SettingsRow
            label="Keys"
            onPress={() => {
              router.push('/keys');
            }}
          />
        ) : mode === 'signed_out' ? (
          <View style={styles.form}>
            <SignInForm />
          </View>
        ) : null}
        <SettingsRow
          label="Send feedback"
          onPress={() => {
            void openFeedback();
          }}
        />
        {mode === 'signed_in' ? (
          <SettingsRow
            label="Sign out"
            onPress={() => {
              setPendingSignOut(true);
            }}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy build ${buildStamp()}`}
          onPress={() => {
            void onCopyBuild();
          }}
          style={({ pressed }) => [styles.build, pressed ? styles.buildPressed : null]}
        >
          <Text style={styles.buildName}>
            Latch {build.version}
            {build.native !== null && build.native.length > 0 ? ` (${build.native})` : ''}
          </Text>
          <Text style={styles.buildHash}>{copied ? 'Copied' : buildStamp()}</Text>
        </Pressable>
      </View>
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

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
    paddingBottom: 28,
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
  build: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    gap: 4,
    cursor: 'pointer',
  },
  buildPressed: {
    opacity: 0.7,
  },
  buildName: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  buildHash: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 0.8,
    opacity: 0.72,
  },
});
