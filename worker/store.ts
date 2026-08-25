import type { AuthTokens } from '../src/lib/types';

import { unwrapString, wrapString } from './crypto';
import type { Env } from './env';
import { wrapSecret } from './env';

export type KeyRecord = {
  id: string;
  ownerId: string;
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
  doorIds: string[];
  unlockWindowStart: number;
  unlocksInWindow: number;
};

export type OwnerRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function putOwner(
  env: Env,
  ownerId: string,
  tokens: AuthTokens,
): Promise<void> {
  const secret = wrapSecret(env);
  const record: OwnerRecord = {
    accessToken: await wrapString(secret, tokens.accessToken),
    refreshToken: await wrapString(secret, tokens.refreshToken),
    expiresAt: tokens.expiresAt,
  };
  await env.KEYS.put(`owner:${ownerId}`, JSON.stringify(record));
}

export async function getOwner(env: Env, ownerId: string): Promise<AuthTokens | null> {
  const raw = await env.KEYS.get(`owner:${ownerId}`);
  if (raw === null) {
    return null;
  }
  const parsed = JSON.parse(raw) as OwnerRecord;
  const secret = wrapSecret(env);
  return {
    accessToken: await unwrapString(secret, parsed.accessToken),
    refreshToken: await unwrapString(secret, parsed.refreshToken),
    expiresAt: parsed.expiresAt,
  };
}

export async function putKey(env: Env, record: KeyRecord, hash: string): Promise<void> {
  const ttl = kvTtl(record.expiresAt);
  await Promise.all([
    env.KEYS.put(`key:${record.id}`, JSON.stringify(record), ttl),
    env.KEYS.put(`hash:${hash}`, record.id, ttl),
  ]);
}

export async function updateKey(env: Env, record: KeyRecord): Promise<void> {
  await env.KEYS.put(`key:${record.id}`, JSON.stringify(record), kvTtl(record.expiresAt));
}

export async function getKey(env: Env, id: string): Promise<KeyRecord | null> {
  const raw = await env.KEYS.get(`key:${id}`);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as KeyRecord;
}

export async function getKeyIdByHash(env: Env, hash: string): Promise<string | null> {
  return env.KEYS.get(`hash:${hash}`);
}

export async function listOwnerKeyIds(env: Env, ownerId: string): Promise<string[]> {
  const raw = await env.KEYS.get(`ownerkeys:${ownerId}`);
  if (raw === null) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((id): id is string => typeof id === 'string');
}

export async function addOwnerKeyId(
  env: Env,
  ownerId: string,
  keyId: string,
): Promise<void> {
  const ids = await listOwnerKeyIds(env, ownerId);
  if (ids.includes(keyId)) {
    return;
  }
  ids.unshift(keyId);
  await env.KEYS.put(`ownerkeys:${ownerId}`, JSON.stringify(ids.slice(0, 40)));
}

function kvTtl(expiresAt: number): { expirationTtl: number } | undefined {
  const seconds = Math.ceil((expiresAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / 1000);
  if (seconds < 60) {
    return undefined;
  }
  return { expirationTtl: seconds };
}
