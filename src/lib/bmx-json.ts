export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

export function errorMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  const errors = record?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = asRecord(errors[0]);
    if (typeof first?.messages === 'string') {
      return first.messages;
    }
  }
  if (typeof record?.error_description === 'string') {
    return record.error_description;
  }
  return fallback;
}
