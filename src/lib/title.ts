export const APP_NAME = 'LatchMX';

export function latchTitle(page?: string): string {
  const trimmed = page?.trim() ?? '';
  if (trimmed.length === 0 || trimmed === APP_NAME) {
    return APP_NAME;
  }
  if (trimmed.includes(APP_NAME)) {
    return trimmed;
  }
  return `${trimmed} · ${APP_NAME}`;
}
