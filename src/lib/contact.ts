export function contactHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.includes('@')) {
    return `mailto:${trimmed}`;
  }
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length >= 7) {
    return `tel:${digits}`;
  }
  return null;
}
