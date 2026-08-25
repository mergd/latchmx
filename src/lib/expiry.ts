export type ExpiryCopy = {
  until: string;
  remaining: string;
  urgent: boolean;
  dead: boolean;
};

export function expiryCopy(expiresAt: number, now: number): ExpiryCopy {
  if (now === 0) {
    return {
      until: untilLabel(expiresAt, expiresAt),
      remaining: '',
      urgent: false,
      dead: false,
    };
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return {
      until: 'Expired',
      remaining: 'Expired',
      urgent: true,
      dead: true,
    };
  }
  return {
    until: untilLabel(expiresAt, now),
    remaining: remainingLabel(left),
    urgent: left < 5 * 60_000,
    dead: false,
  };
}

export function expiryDialogBody(expiresAt: number, now: number, url: string): string {
  const copy = expiryCopy(expiresAt, now);
  if (copy.dead) {
    return 'This key already expired.';
  }
  const when = copy.until.replace(/^Until /, '');
  return `Dies at ${when}. Anyone with the link can open doors until then.\n\n${url}`;
}

function untilLabel(expiresAt: number, now: number): string {
  const time = new Date(expiresAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameLocalDay(expiresAt, now)) {
    return `Until ${time}`;
  }
  if (localDayKey(expiresAt) === localDayKey(now + 24 * 60 * 60 * 1000)) {
    return `Until tomorrow ${time}`;
  }
  const day = new Date(expiresAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `Until ${day}, ${time}`;
}

function remainingLabel(left: number): string {
  if (left < 60_000) {
    return `${Math.max(1, Math.ceil(left / 1000))}s left`;
  }
  if (left < 60 * 60_000) {
    return `${Math.ceil(left / 60_000)}m left`;
  }
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.ceil((left % 3_600_000) / 60_000);
  if (minutes === 60) {
    return `${hours + 1}h left`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
}

function sameLocalDay(left: number, right: number): boolean {
  return localDayKey(left) === localDayKey(right);
}

function localDayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
