import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { LanguageDialog } from '@/components/language-dialog';
import { PageTitle } from '@/components/page-title';
import { SignInForm } from '@/components/sign-in-form';
import { build, buildStamp } from '@/lib/build';
import { openFeedback } from '@/lib/feedback';
import { hapticSuccess } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/lib/session';
import { APP_NAME, latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';

const LANGUAGE_NAMES = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  pt: 'Português',
  hi: 'हिन्दी',
  ne: 'नेपाली',
} as const;

export default function SettingsScreen() {
  const { t, locale, preference } = useI18n();
  const { account, buildingName, mode, isDemo, signOut } = useSession();
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const name = account?.name?.trim() ?? '';
  const email = account?.email?.trim() ?? '';
  const identity =
    account !== null
      ? {
          name:
            name.length > 0
              ? name
              : account.kind === 'guest'
                ? t('settings.guest')
                : t('settings.signedIn'),
          email,
          hint:
            account.kind === 'guest'
              ? t('settings.guestPass')
              : (account.buildingName ?? buildingName),
        }
      : mode === 'signed_in'
        ? {
            name:
              name.length > 0
                ? name
                : buildingName.length > 0
                  ? buildingName
                  : t('settings.signedIn'),
            email,
            hint: buildingName,
          }
        : null;
  const languageValue =
    preference === 'system'
      ? t('language.systemValue', { language: LANGUAGE_NAMES[locale] })
      : LANGUAGE_NAMES[locale];

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
      <PageTitle title={latchTitle(t('settings.account'))} />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton
              icon={CaretLeftIcon}
              label={t('common.back')}
              onPress={() => {
                router.back();
              }}
            />
            <Text style={styles.title}>{t('settings.account')}</Text>
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
            label={t('settings.keys')}
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
          label={t('language.label')}
          value={languageValue}
          onPress={() => {
            setLanguageOpen(true);
          }}
        />
        <SettingsRow
          label={t('settings.sendFeedback')}
          onPress={() => {
            void openFeedback();
          }}
        />
        {mode === 'signed_in' ? (
          <SettingsRow
            label={isDemo ? t('auth.exitDemo') : t('auth.signOut')}
            onPress={() => {
              setPendingSignOut(true);
            }}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.copyBuild', { stamp: buildStamp() })}
          onPress={() => {
            void onCopyBuild();
          }}
          style={({ pressed }) => [styles.build, pressed ? styles.buildPressed : null]}
        >
          <Text style={styles.buildName}>
            {APP_NAME} {build.version}
            {build.native !== null && build.native.length > 0 ? ` (${build.native})` : ''}
          </Text>
          <Text style={styles.buildHash}>{copied ? t('common.copied') : buildStamp()}</Text>
        </Pressable>
      </View>
      <LanguageDialog
        visible={languageOpen}
        onClose={() => {
          setLanguageOpen(false);
        }}
      />
      <ConfirmDialog
        visible={pendingSignOut}
        title={isDemo ? t('auth.exitDemoTitle') : t('auth.signOutTitle')}
        body={isDemo ? t('auth.exitDemoBody') : t('auth.signOutBody')}
        confirmLabel={isDemo ? t('auth.exitDemo') : t('auth.signOut')}
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

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value !== undefined ? <Text style={styles.rowValue}>{value}</Text> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  rowValue: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
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
