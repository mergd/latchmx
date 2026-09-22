import * as Application from 'expo-application';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { getAvailableAppUpdate } from '@/lib/app-updates';
import { useI18n } from '@/lib/i18n/context';
import { storageGet, storageSet } from '@/lib/storage';
import type { AvailableUpdate } from '@/lib/update-version';
import { ConfirmDialog } from './confirm-dialog';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REPROMPT_INTERVAL_MS = 7 * CHECK_INTERVAL_MS;

export function UpdateNotice() {
  const { t } = useI18n();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const checking = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    let mounted = true;
    const version = Application.nativeApplicationVersion ?? 'unknown';
    const build = Application.nativeBuildVersion ?? 'unknown';
    const checkKey = `latch.update.checked.${Platform.OS}.${version}.${build}`;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const now = Date.now();
        const checkedAt = Number(await storageGet(checkKey));
        if (Number.isFinite(checkedAt) && checkedAt > 0 &&
            now >= checkedAt && now - checkedAt < CHECK_INTERVAL_MS) return;
        await storageSet(checkKey, String(now));

        const available = await getAvailableAppUpdate();
        if (!mounted || available === null) return;
        const dismissedAt = Number(await storageGet(`latch.update.dismissed.${available.id}`));
        if (Number.isFinite(dismissedAt) && dismissedAt > 0 &&
            now >= dismissedAt && now - dismissedAt < REPROMPT_INTERVAL_MS) return;
        if (mounted) setUpdate(available);
      } catch {
        // Store lookups are advisory and should never interrupt door access.
      } finally {
        checking.current = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const dismiss = () => {
    if (update === null) return;
    void storageSet(`latch.update.dismissed.${update.id}`, String(Date.now()));
    setUpdate(null);
  };

  const openStore = async () => {
    if (update === null) return;
    try {
      await Linking.openURL(update.url);
      dismiss();
    } catch {
      // Keep the notice visible so the user can retry.
    }
  };

  return (
    <ConfirmDialog
      visible={update !== null}
      title={t('update.title')}
      body={t('update.body')}
      confirmLabel={t('update.action')}
      cancelLabel={t('update.later')}
      onCancel={dismiss}
      onConfirm={() => { void openStore(); }}
    />
  );
}
