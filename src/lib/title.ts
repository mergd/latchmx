export function latchTitle(page?: string): string {
  const trimmed = page?.trim() ?? '';
  if (trimmed.length === 0 || trimmed === 'Latch') {
    return 'Latch';
  }
  if (/\bLatch\b/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} · Latch`;
}
