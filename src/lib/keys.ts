import { Platform } from 'react-native';

import { asRecord } from '@/lib/bmx-json';
import { bmxConfig } from '@/lib/config';
import type {
  CreatedKey,
  Door,
  GuestSession,
  IssuedKey,
  KeyTtl,
} from '@/lib/types';

export async function createKey(input: {
  accessToken: string;
  refreshToken: string;
  ttl: KeyTtl;
  doorIds: string[];
  label: string;
  note: string;
  inviterName: string;
}): Promise<CreatedKey> {
  const payload = await keysRequest('/api/keys', {
    method: 'POST',
    accessToken: input.accessToken,
    body: {
      refreshToken: input.refreshToken,
      ttl: input.ttl,
      doorIds: input.doorIds,
      label: input.label,
      note: input.note,
      inviterName: input.inviterName,
    },
  });
  const created = parseCreated(payload);
  if (created === null) {
    throw new Error('Could not create that key.');
  }
  return created;
}

export async function listKeys(accessToken: string): Promise<IssuedKey[]> {
  const payload = await keysRequest('/api/keys', {
    method: 'GET',
    accessToken,
  });
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map(parseIssued)
    .filter((key): key is IssuedKey => key !== null);
}

export async function revokeKey(
  accessToken: string,
  keyId: string,
): Promise<void> {
  await keysRequest(`/api/keys/${keyId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function fetchGuestSession(secret: string): Promise<GuestSession> {
  const payload = await keysRequest('/api/guest', {
    method: 'GET',
    accessToken: secret,
  });
  const record = asRecord(payload);
  if (
    record === null ||
    !Array.isArray(record.doors) ||
    typeof record.buildingName !== 'string' ||
    typeof record.expiresAt !== 'number'
  ) {
    throw new Error('This key is dead.');
  }
  return {
    doors: record.doors as Door[],
    buildingName: record.buildingName,
    expiresAt: record.expiresAt,
    invite: {
      label:
        typeof record.label === 'string' && record.label.length > 0
          ? record.label
          : 'Guest invite',
      note: typeof record.note === 'string' ? record.note : null,
      inviterName:
        typeof record.inviterName === 'string' ? record.inviterName : null,
    },
  };
}

export async function guestUnlock(secret: string, door: Door): Promise<void> {
  await keysRequest('/api/guest/unlock', {
    method: 'POST',
    accessToken: secret,
    body: { doorId: door.id },
  });
}

async function keysRequest(
  path: string,
  input: {
    method: 'GET' | 'POST' | 'DELETE';
    accessToken: string;
    body?: unknown;
  },
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.accessToken}`,
  };
  if (input.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${keysApiOrigin()}${path}`, {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { error: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      typeof record?.error === 'string' ? record.error : 'Request failed.';
    throw new Error(message);
  }
  return payload;
}

export function keysApiOrigin(): string {
  if (Platform.OS === 'web') {
    const origin =
      typeof globalThis.location?.origin === 'string'
        ? globalThis.location.origin
        : '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return bmxConfig.proxyOrigin;
    }
    if (origin.length > 0) {
      return origin;
    }
  }
  return bmxConfig.proxyOrigin;
}

function parseCreated(value: unknown): CreatedKey | null {
  const issued = parseIssued(value);
  const record = asRecord(value);
  if (issued === null || record === null || typeof record.url !== 'string') {
    return null;
  }
  return { ...issued, url: record.url };
}

function parseIssued(value: unknown): IssuedKey | null {
  const record = asRecord(value);
  if (
    record === null ||
    typeof record.id !== 'string' ||
    typeof record.expiresAt !== 'number' ||
    typeof record.createdAt !== 'number' ||
    typeof record.revoked !== 'boolean' ||
    typeof record.doorCount !== 'number' ||
    typeof record.label !== 'string'
  ) {
    return null;
  }
  return {
    id: record.id,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    revoked: record.revoked,
    doorCount: record.doorCount,
    label: record.label,
    note: typeof record.note === 'string' ? record.note : null,
    inviterName:
      typeof record.inviterName === 'string' ? record.inviterName : null,
    url: typeof record.url === 'string' ? record.url : null,
  };
}
