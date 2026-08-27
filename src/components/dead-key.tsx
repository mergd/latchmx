import { AppShell } from '@/components/app-shell';
import { StatusScreen } from '@/components/status-screen';

export function DeadKey({ detail }: { detail?: string | null }) {
  const body =
    detail !== null &&
    detail !== undefined &&
    detail.trim().length > 0 &&
    !/this key is dead/i.test(detail)
      ? detail.trim()
      : null;

  return (
    <AppShell>
      <StatusScreen title="This key is dead" body={body} />
    </AppShell>
  );
}
