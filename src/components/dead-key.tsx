import { AppShell } from '@/components/app-shell';
import { StatusScreen } from '@/components/status-screen';
import { isKeyDeadCopy, localizeError } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';

export function DeadKey({ detail }: { detail?: string | null }) {
  const { t } = useI18n();
  const raw =
    detail !== null && detail !== undefined && detail.trim().length > 0
      ? detail.trim()
      : null;
  const body = raw !== null && !isKeyDeadCopy(raw) ? localizeError(raw) : null;

  return (
    <AppShell>
      <StatusScreen title={t('errors.keyDeadTitle')} body={body} />
    </AppShell>
  );
}
