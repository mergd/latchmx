import type { KeyTtl } from '../src/lib/types';

const ZONE = 'America/Los_Angeles';

export function expiresAtForTtl(ttl: KeyTtl, now = Date.now()): number {
  switch (ttl) {
    case '1h':
      return now + 60 * 60 * 1000;
    case '24h':
      return now + 24 * 60 * 60 * 1000;
    case 'tonight': {
      const end = endOfDayInZone(now, ZONE);
      return Math.max(end, now + 60 * 60 * 1000);
    }
    default: {
      const _never: never = ttl;
      return _never;
    }
  }
}

function endOfDayInZone(now: number, timeZone: string): number {
  const today = localDate(now, timeZone);
  let lo = now;
  let hi = now + 48 * 60 * 60 * 1000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (localDate(mid, timeZone) === today) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function localDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}
