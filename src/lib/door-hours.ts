import { asRecord } from '@/lib/bmx-json';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type DoorWeekday = (typeof WEEKDAYS)[number];

export type DoorHoursWindow = {
  weekdays: DoorWeekday[];
  from: string;
  to: string;
};

const DAY_LABEL: Record<DoorWeekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const WEEKDAY_SET = new Set<string>(WEEKDAYS);
const WEEKDAY_ALIASES: Record<string, DoorWeekday> = {
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
  sunday: 'sun',
};

export function parseHoursList(value: unknown): DoorHoursWindow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const windows: DoorHoursWindow[] = [];
  for (const item of value) {
    const window = parseWindow(item);
    if (window !== null && !isAlwaysOpen(window)) {
      windows.push(window);
    }
  }
  return windows;
}

export function hoursLabel(windows: DoorHoursWindow[]): string | null {
  if (windows.length === 0) {
    return null;
  }
  return windows.map(formatWindow).join(' · ');
}

export function scheduleLines(windows: DoorHoursWindow[]): string[] {
  return windows.map(formatWindow);
}

export type HoursKind = 'lockout' | 'held_open';

export function hoursStatus(
  windows: DoorHoursWindow[],
  at = Date.now(),
  timeZone = 'America/Los_Angeles',
  kind: HoursKind = 'held_open',
): { unlocked: boolean; hint: string } | null {
  if (windows.length === 0) {
    return null;
  }
  const now = zonedClock(at, timeZone);
  if (now === null) {
    if (kind === 'held_open') {
      return { unlocked: false, hint: '' };
    }
    const label = hoursLabel(windows);
    return label === null ? null : { unlocked: false, hint: label };
  }
  const current = currentWindow(windows, now.weekday, now.minutes);
  if (current !== null) {
    return { unlocked: true, hint: '' };
  }
  if (kind === 'held_open') {
    return { unlocked: false, hint: '' };
  }
  const next = nextOpen(windows, now.weekday, now.minutes);
  if (next === null) {
    const label = hoursLabel(windows);
    return label === null ? null : { unlocked: false, hint: label };
  }
  if (next.weekday === now.weekday) {
    return { unlocked: false, hint: `Opens ${formatClock(next.from)}` };
  }
  const tomorrow = WEEKDAYS[(WEEKDAYS.indexOf(now.weekday) + 1) % 7];
  if (next.weekday === tomorrow) {
    return { unlocked: false, hint: `Opens ${formatClock(next.from)}` };
  }
  return {
    unlocked: false,
    hint: `Opens ${DAY_LABEL[next.weekday]} ${formatClock(next.from)}`,
  };
}

export function isWithinHours(
  windows: DoorHoursWindow[],
  at = Date.now(),
  timeZone = 'America/Los_Angeles',
): boolean {
  if (windows.length === 0) {
    return true;
  }
  const now = zonedClock(at, timeZone);
  if (now === null) {
    return true;
  }
  return windows.some((window) => covers(window, now.weekday, now.minutes));
}

function parseWindow(value: unknown): DoorHoursWindow | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const from = parseClock(
    record.from ?? record.start ?? record.start_time ?? record.open,
  );
  const to = parseClock(record.to ?? record.end ?? record.end_time ?? record.close);
  const weekdays = parseWeekdays(
    record.weekdays ?? record.days ?? record.day,
  );
  if (from === null || to === null || weekdays.length === 0) {
    return null;
  }
  return { weekdays, from, to };
}

function parseClock(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  const match =
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed) ??
    /^(\d{1,2}):(\d{2})\s*([ap]m)$/i.exec(trimmed);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  } else if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (hour > 23 || minute > 59) {
    return null;
  }
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function parseWeekdays(value: unknown): DoorWeekday[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const days: DoorWeekday[] = [];
  const seen = new Set<DoorWeekday>();
  for (const item of raw) {
    const day = weekdayFromUnknown(item);
    if (day === null || seen.has(day)) {
      continue;
    }
    seen.add(day);
    days.push(day);
  }
  return days.sort(
    (left, right) => WEEKDAYS.indexOf(left) - WEEKDAYS.indexOf(right),
  );
}

function weekdayFromUnknown(value: unknown): DoorWeekday | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return WEEKDAYS[(value + 6) % 7] ?? WEEKDAYS[value] ?? null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  if (WEEKDAY_SET.has(key)) {
    return key as DoorWeekday;
  }
  return WEEKDAY_ALIASES[key] ?? null;
}

function isAlwaysOpen(window: DoorHoursWindow): boolean {
  return window.from === window.to && window.weekdays.length === 7;
}

function formatWindow(window: DoorHoursWindow): string {
  return `${formatDays(window.weekdays)} ${formatClock(window.from)}–${formatClock(window.to)}`;
}

function formatDays(days: DoorWeekday[]): string {
  if (days.length === 7) {
    return 'Daily';
  }
  if (sameDays(days, ['mon', 'tue', 'wed', 'thu', 'fri'])) {
    return 'Weekdays';
  }
  if (sameDays(days, ['sat', 'sun'])) {
    return 'Weekends';
  }
  const indexes = days
    .map((day) => WEEKDAYS.indexOf(day))
    .filter((index) => index >= 0);
  if (indexes.length === 0) {
    return '';
  }
  if (indexes.length === 1) {
    return DAY_LABEL[WEEKDAYS[indexes[0]] ?? 'mon'];
  }
  const contiguous = indexes.every(
    (index, offset) => offset === 0 || index === (indexes[offset - 1] ?? 0) + 1,
  );
  if (contiguous) {
    const first = WEEKDAYS[indexes[0]];
    const last = WEEKDAYS[indexes[indexes.length - 1]];
    if (first !== undefined && last !== undefined) {
      return `${DAY_LABEL[first]}–${DAY_LABEL[last]}`;
    }
  }
  return indexes
    .map((index) => {
      const day = WEEKDAYS[index];
      return day === undefined ? '' : DAY_LABEL[day];
    })
    .filter((label) => label.length > 0)
    .join(', ');
}

function formatClock(value: string): string {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (hour === 0 && minute === 0) {
    return 'midnight';
  }
  const suffix = hour >= 12 ? 'pm' : 'am';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${twelve}${suffix}` : `${twelve}:${minute.toString().padStart(2, '0')}${suffix}`;
}

function sameDays(left: DoorWeekday[], right: DoorWeekday[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((day, index) => day === right[index]);
}

function currentWindow(
  windows: DoorHoursWindow[],
  weekday: DoorWeekday,
  minutes: number,
): DoorHoursWindow | null {
  return windows.find((window) => covers(window, weekday, minutes)) ?? null;
}

function nextOpen(
  windows: DoorHoursWindow[],
  weekday: DoorWeekday,
  minutes: number,
): { weekday: DoorWeekday; from: string } | null {
  const start = WEEKDAYS.indexOf(weekday);
  for (let offset = 0; offset < 8; offset += 1) {
    const day = WEEKDAYS[(start + offset) % 7];
    if (day === undefined) {
      continue;
    }
    const starts = windows.flatMap((window) => {
      if (!window.weekdays.includes(day)) {
        return [];
      }
      const from = clockToMinutes(window.from);
      if (offset === 0 && minutes >= from) {
        return [];
      }
      return [{ from: window.from, minutes: from }];
    });
    starts.sort((left, right) => left.minutes - right.minutes);
    const first = starts[0];
    if (first !== undefined) {
      return { weekday: day, from: first.from };
    }
  }
  return null;
}

function covers(
  window: DoorHoursWindow,
  weekday: DoorWeekday,
  minutes: number,
): boolean {
  const from = clockToMinutes(window.from);
  const to = clockToMinutes(window.to);
  if (from === to) {
    return window.weekdays.includes(weekday);
  }
  if (from < to) {
    return (
      window.weekdays.includes(weekday) && minutes >= from && minutes < to
    );
  }
  if (minutes >= from && window.weekdays.includes(weekday)) {
    return true;
  }
  return minutes < to && window.weekdays.includes(previousWeekday(weekday));
}

function clockToMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(':');
  return Number(hourRaw) * 60 + Number(minuteRaw);
}

function previousWeekday(day: DoorWeekday): DoorWeekday {
  const index = WEEKDAYS.indexOf(day);
  return WEEKDAYS[(index + 6) % 7] ?? 'sun';
}

function zonedClock(
  at: number,
  timeZone: string,
): { weekday: DoorWeekday; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(at));
    const weekdayRaw =
      parts.find((part) => part.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const weekday = weekdayFromUnknown(weekdayRaw);
    if (weekday === null || Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }
    return { weekday, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}
