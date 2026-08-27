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
  label?: string;
  note?: string | null;
  inviterName?: string | null;
  contact?: string | null;
  wrappedSecret?: string;
};

export type OwnerRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const CACHE_ORIGIN = 'https://cache.bmx.fldr.zip';
const OWNER_CACHE_SECONDS = 24 * 60 * 60;

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
  const raw = JSON.stringify(record);
  await Promise.all([
    env.KEYS.put(`owner:${ownerId}`, raw),
    writeCache(`owner:${ownerId}`, raw, OWNER_CACHE_SECONDS),
  ]);
}

export async function getOwner(env: Env, ownerId: string): Promise<AuthTokens | null> {
  const raw = await readValue(env, `owner:${ownerId}`, OWNER_CACHE_SECONDS);
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
  const raw = JSON.stringify(record);
  const ttl = kvTtl(record.expiresAt);
  const cacheTtl = cacheSeconds(record.expiresAt);
  await Promise.all([
    env.KEYS.put(`key:${record.id}`, raw, ttl),
    env.KEYS.put(`hash:${hash}`, record.id, ttl),
    writeCache(`key:${record.id}`, raw, cacheTtl),
    writeCache(`hash:${hash}`, record.id, cacheTtl),
  ]);
}

export async function updateKey(env: Env, record: KeyRecord): Promise<void> {
  const raw = JSON.stringify(record);
  await Promise.all([
    env.KEYS.put(`key:${record.id}`, raw, kvTtl(record.expiresAt)),
    writeCache(`key:${record.id}`, raw, cacheSeconds(record.expiresAt)),
  ]);
}

export async function getKey(
  env: Env,
  id: string,
  options?: { allowKv?: boolean },
): Promise<KeyRecord | null> {
  const raw =
    options?.allowKv === false
      ? await readCache(`key:${id}`)
      : await readValue(env, `key:${id}`, undefined);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as KeyRecord;
}

export async function getKeyIdByHash(
  env: Env,
  hash: string,
  options?: { allowKv?: boolean },
): Promise<string | null> {
  if (options?.allowKv === false) {
    return readCache(`hash:${hash}`);
  }
  return readValue(env, `hash:${hash}`, undefined);
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

async function readValue(
  env: Env,
  key: string,
  populateCacheSeconds: number | undefined,
): Promise<string | null> {
  const cached = await readCache(key);
  if (cached !== null) {
    return cached;
  }
  const raw = await env.KEYS.get(key);
  if (raw !== null) {
    await writeCache(key, raw, populateCacheSeconds ?? 60 * 60);
  }
  return raw;
}

function kvTtl(expiresAt: number): { expirationTtl: number } | undefined {
  const seconds = cacheSeconds(expiresAt);
  if (seconds < 60) {
    return undefined;
  }
  return { expirationTtl: seconds };
}

function cacheSeconds(expiresAt: number): number {
  return Math.ceil((expiresAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / 1000);
}

function cacheRequest(key: string): Request {
  return new Request(`${CACHE_ORIGIN}/${encodeURIComponent(key)}`);
}

async function readCache(key: string): Promise<string | null> {
  try {
    const hit = await caches.default.match(cacheRequest(key));
    return hit === undefined ? null : hit.text();
  } catch {
    return null;
  }
}

async function writeCache(
  key: string,
  value: string,
  maxAgeSeconds: number,
): Promise<void> {
  try {
    const age = Math.max(60, maxAgeSeconds);
    await caches.default.put(
      cacheRequest(key),
      new Response(value, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': `public, max-age=${age}`,
        },
      }),
    );
  } catch {
    return;
  }
}
