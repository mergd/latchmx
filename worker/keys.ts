import {
  createDirectBmxClient,
  loadDoors,
  ownerIdFromClient,
  releaseDoorOn,
} from '../src/lib/bmx-doors';
import { asRecord } from '../src/lib/bmx-json';
import { KEY_TTLS, type Door, type IssuedKey, type KeyTtl } from '../src/lib/types';

import { randomToken, sha256Hex } from './crypto';
import type { Env } from './env';
import { HttpError, bearer, json } from './http';
import { freshOwnerTokens } from './owner';
import {
  addOwnerKeyId,
  getKey,
  getKeyIdByHash,
  listOwnerKeyIds,
  putKey,
  putOwner,
  updateKey,
  type KeyRecord,
} from './store';
import { expiresAtForTtl } from './ttl';

const PUBLIC_ORIGIN = 'https://bmx.fldr.zip';
const MAX_LIVE_KEYS = 20;
const MAX_UNLOCKS_PER_HOUR = 40;
const DOOR_ID = /^(ap|dev)-\d+$/;

export async function handleKeysRequest(
  request: Request,
  env: Env,
  headers: Headers,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (path === '/api/keys' && request.method === 'GET') {
    return json(await listKeys(env, bearer(request)), 200, headers);
  }
  if (path === '/api/keys' && request.method === 'POST') {
    return json(await createKey(request, env, bearer(request)), 201, headers);
  }

  const match = /^\/api\/keys\/([^/]+)$/.exec(path);
  if (match?.[1] !== undefined && request.method === 'DELETE') {
    await revokeKey(env, bearer(request), match[1]);
    return json({ ok: true }, 200, headers);
  }

  throw new HttpError(404, 'Not found.');
}

export async function handleGuestRequest(
  request: Request,
  env: Env,
  headers: Headers,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const secret = bearer(request);

  if (path === '/api/guest' && request.method === 'GET') {
    return json(await guestSession(env, secret), 200, headers);
  }
  if (path === '/api/guest/unlock' && request.method === 'POST') {
    await guestUnlock(request, env, secret);
    return json({ ok: true }, 200, headers);
  }

  throw new HttpError(404, 'Not found.');
}

async function listKeys(env: Env, accessToken: string): Promise<IssuedKey[]> {
  const ownerId = await ownerId(env, accessToken);
  const ids = await listOwnerKeyIds(env, ownerId);
  const records = await Promise.all(ids.map((id) => getKey(env, id)));
  return records
    .filter((record): record is KeyRecord => record !== null && !record.revoked)
    .map(toIssued);
}

async function createKey(
  request: Request,
  env: Env,
  accessToken: string,
): Promise<IssuedKey & { url: string }> {
  const body = asRecord(await request.json().catch(() => null));
  const ttl = parseTtl(body?.ttl);
  const refreshToken =
    typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
  if (refreshToken.length === 0) {
    throw new HttpError(400, 'Missing refresh token.');
  }
  const doorIds = parseDoorIds(body?.doorIds);
  const client = createDirectBmxClient(accessToken, { baseUrl: env.BMX_API_ORIGIN });
  const ownerIdValue = await ownerIdFromClient(client);
  const live = (await listKeys(env, accessToken)).filter(
    (key) => key.expiresAt > Date.now(),
  );
  if (live.length >= MAX_LIVE_KEYS) {
    throw new HttpError(400, 'Revoke an old key before making another.');
  }

  await putOwner(env, ownerIdValue, {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });

  const id = randomToken(8);
  const secret = randomToken(24);
  const now = Date.now();
  const record: KeyRecord = {
    id,
    ownerId: ownerIdValue,
    expiresAt: expiresAtForTtl(ttl, now),
    createdAt: now,
    revoked: false,
    doorIds,
    unlockWindowStart: now,
    unlocksInWindow: 0,
  };
  await putKey(env, record, await sha256Hex(secret));
  await addOwnerKeyId(env, ownerIdValue, id);
  return {
    ...toIssued(record),
    url: `${PUBLIC_ORIGIN}/k/${secret}`,
  };
}

async function revokeKey(
  env: Env,
  accessToken: string,
  keyId: string,
): Promise<void> {
  const ownerIdValue = await ownerId(env, accessToken);
  const record = await getKey(env, keyId);
  if (record === null || record.ownerId !== ownerIdValue) {
    throw new HttpError(404, 'That key is gone.');
  }
  if (record.revoked) {
    return;
  }
  await updateKey(env, { ...record, revoked: true });
}

async function guestSession(env: Env, secret: string) {
  const record = await liveKey(env, secret);
  const tokens = await freshOwnerTokens(env, record.ownerId);
  const snapshot = await loadDoors(
    createDirectBmxClient(tokens.accessToken, { baseUrl: env.BMX_API_ORIGIN }),
  );
  const doors = filterDoors(snapshot.doors, record.doorIds);
  return {
    doors,
    buildingName: doors[0]?.buildingName ?? snapshot.doors[0]?.buildingName ?? 'Latch',
    expiresAt: record.expiresAt,
  };
}

async function guestUnlock(
  request: Request,
  env: Env,
  secret: string,
): Promise<void> {
  const body = asRecord(await request.json().catch(() => null));
  const doorId = typeof body?.doorId === 'string' ? body.doorId : '';
  if (!DOOR_ID.test(doorId)) {
    throw new HttpError(400, 'Unknown door.');
  }
  const record = await liveKey(env, secret);
  if (record.doorIds.length > 0 && !record.doorIds.includes(doorId)) {
    throw new HttpError(403, 'This key cannot open that door.');
  }
  const now = Date.now();
  const windowStart =
    now - record.unlockWindowStart > 60 * 60 * 1000 ? now : record.unlockWindowStart;
  const unlocks = windowStart === record.unlockWindowStart ? record.unlocksInWindow + 1 : 1;
  if (unlocks > MAX_UNLOCKS_PER_HOUR) {
    throw new HttpError(429, 'This key has been used too many times.');
  }
  const tokens = await freshOwnerTokens(env, record.ownerId);
  const snapshot = await loadDoors(
    createDirectBmxClient(tokens.accessToken, { baseUrl: env.BMX_API_ORIGIN }),
  );
  const door = snapshot.doors.find((item) => item.id === doorId);
  if (door === undefined) {
    throw new HttpError(404, 'That door is gone.');
  }
  await releaseDoorOn(
    createDirectBmxClient(tokens.accessToken, { baseUrl: env.BMX_API_ORIGIN }),
    door,
  );
  await updateKey(env, {
    ...record,
    unlockWindowStart: windowStart,
    unlocksInWindow: unlocks,
  });
}

async function liveKey(env: Env, secret: string): Promise<KeyRecord> {
  const id = await getKeyIdByHash(env, await sha256Hex(secret));
  if (id === null) {
    throw new HttpError(410, 'This key is dead.');
  }
  const record = await getKey(env, id);
  if (record === null || record.revoked || record.expiresAt <= Date.now()) {
    throw new HttpError(410, 'This key is dead.');
  }
  return record;
}

async function ownerId(env: Env, accessToken: string): Promise<string> {
  try {
    return await ownerIdFromClient(
      createDirectBmxClient(accessToken, { baseUrl: env.BMX_API_ORIGIN }),
    );
  } catch {
    throw new HttpError(401, 'Sign in to continue.');
  }
}

function parseTtl(value: unknown): KeyTtl {
  if (typeof value === 'string' && (KEY_TTLS as readonly string[]).includes(value)) {
    return value as KeyTtl;
  }
  throw new HttpError(400, 'Pick how long this key should live.');
}

function parseDoorIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value.filter(
    (id): id is string => typeof id === 'string' && DOOR_ID.test(id),
  );
  return [...new Set(ids)].slice(0, 80);
}

function filterDoors(doors: Door[], doorIds: string[]): Door[] {
  if (doorIds.length === 0) {
    return doors;
  }
  const allowed = new Set(doorIds);
  return doors.filter((door) => allowed.has(door.id));
}

function toIssued(record: KeyRecord): IssuedKey {
  return {
    id: record.id,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    revoked: record.revoked,
    doorCount: record.doorIds.length,
  };
}
