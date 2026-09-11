import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthCodeDialog } from '@/components/auth-code-dialog';
import { AuthLoginDrawer } from '@/components/auth-login-drawer';
import { errorText } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export function SignInForm() {
  const { t } = useI18n();
  const { openSignIn, signInUrl, completeSignIn, canSignIn, startDemo } = useSession();
  const [busy, setBusy] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const web = Platform.OS === 'web';

  const onOpenLogin = useCallback(async () => {
    setMessage(null);
    try {
      await openSignIn();
    } catch (error) {
      setMessage(
        errorText(error, 'errors.openButterfly'),
      );
    }
  }, [openSignIn]);

  const onInstall = useCallback(
    async (code: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await completeSignIn(code);
        setAwaitingCode(false);
      } catch (error) {
        if (!web) {
          setAwaitingCode(false);
        }
        setMessage(errorText(error, 'errors.signInFailedShort'));
      } finally {
        setBusy(false);
      }
    },
    [completeSignIn, web],
  );

  return (
    <View style={styles.wrap}>
      {message !== null && (!awaitingCode || !web) ? (
        <Text style={styles.error}>{message}</Text>
      ) : null}
      {!canSignIn ? (
        <Text style={styles.error}>
          {t('auth.notConfigured')}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.signIn')}
        style={[styles.primary, !canSignIn ? styles.primaryDisabled : null]}
        onPress={() => {
          if (!canSignIn) {
            return;
          }
          setMessage(null);
          setAwaitingCode(true);
        }}
        disabled={!canSignIn || busy}
      >
        <Text style={styles.primaryLabel}>{busy ? t('auth.signingIn') : t('auth.signIn')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.tryDemo')}
        disabled={busy || awaitingCode}
        onPress={() => { void startDemo(); }}
        style={styles.demo}
      >
        <Text style={styles.demoLabel}>{t('auth.tryDemo')}</Text>
      </Pressable>
      {!awaitingCode ? null : web ? (
        <AuthCodeDialog
          visible
          busy={busy}
          error={message}
          onOpenLogin={onOpenLogin}
          onCancel={() => {
            setAwaitingCode(false);
            setMessage(null);
          }}
          onInstall={onInstall}
        />
      ) : (
        <AuthLoginDrawer
          visible
          busy={busy}
          url={signInUrl}
          onClose={() => {
            if (busy) {
              return;
            }
            setAwaitingCode(false);
            setMessage(null);
          }}
          onCapturedCode={(code) => {
            void onInstall(code);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  demo: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
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
