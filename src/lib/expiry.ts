import { formatLocaleDate, formatLocaleTime, t } from '@/lib/i18n';

export type ExpiryCopy = {
  until: string;
  when: string;
  remaining: string;
  urgent: boolean;
  dead: boolean;
};

export function expiryCopy(expiresAt: number, now: number): ExpiryCopy {
  if (now === 0) {
    const stamp = untilStamp(expiresAt, expiresAt);
    return {
      until: stamp.until,
      when: stamp.when,
      remaining: '',
      urgent: false,
      dead: false,
    };
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return {
      until: t('expiry.expired'),
      when: t('expiry.expired'),
      remaining: t('expiry.expired'),
      urgent: true,
      dead: true,
    };
  }
  const stamp = untilStamp(expiresAt, now);
  return {
    until: stamp.until,
    when: stamp.when,
    remaining: remainingLabel(left),
    urgent: left < 5 * 60_000,
    dead: false,
  };
}

export function expiryDialogBody(expiresAt: number, now: number, url: string): string {
  const copy = expiryCopy(expiresAt, now);
  if (copy.dead) {
    return t('expiry.alreadyExpired');
  }
  return t('expiry.diesAt', { when: copy.when, url });
}

function untilStamp(expiresAt: number, now: number): { until: string; when: string } {
  const time = formatLocaleTime(expiresAt, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameLocalDay(expiresAt, now)) {
    return { until: t('expiry.untilTime', { time }), when: time };
  }
  if (localDayKey(expiresAt) === localDayKey(now + 24 * 60 * 60 * 1000)) {
    return {
      until: t('expiry.untilTomorrow', { time }),
      when: t('expiry.untilTomorrow', { time }),
    };
  }
  const day = formatLocaleDate(expiresAt, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return {
    until: t('expiry.untilDay', { day, time }),
    when: t('expiry.untilDay', { day, time }),
  };
}

export function approxRemaining(left: number): string {
  if (left <= 0) {
    return t('expiry.expired');
  }
  if (left < 60 * 60_000) {
    return `~${Math.max(1, Math.round(left / 60_000))}m`;
  }
  return `~${Math.max(1, Math.floor(left / 3_600_000))}h`;
}

function remainingLabel(left: number): string {
  return t('expiry.remainingLeft', { remaining: approxRemaining(left) });
}

function sameLocalDay(left: number, right: number): boolean {
  return localDayKey(left) === localDayKey(right);
}

function localDayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
