import {
  createDirectBmxClient,
  loadDoors,
  ownerIdFromClient,
  releaseDoorOn,
} from '../src/lib/bmx-doors';
import { asRecord } from '../src/lib/bmx-json';
import { APP_NAME } from '../src/lib/title';
import { KEY_TTLS, type Door, type IssuedKey, type KeyTtl } from '../src/lib/types';

import { randomToken, sha256Hex, unwrapString, wrapString } from './crypto';
import type { Env } from './env';
import { wrapSecret } from './env';
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
  if (path === '/api/guest/alive' && request.method === 'GET') {
    const record = await liveKey(env, secret);
    return json({ expiresAt: record.expiresAt }, 200, headers);
  }
  if (path === '/api/guest/unlock' && request.method === 'POST') {
    await guestUnlock(request, env, secret);
    return json({ ok: true }, 200, headers);
  }

  throw new HttpError(404, 'Not found.');
}

async function listKeys(env: Env, accessToken: string): Promise<IssuedKey[]> {
  const ownerIdValue = await ownerId(env, accessToken);
  const ids = await listOwnerKeyIds(env, ownerIdValue);
  const records = await Promise.all(ids.map((id) => getKey(env, id)));
  const now = Date.now();
  return Promise.all(
    records
      .filter(
        (record): record is KeyRecord =>
          record !== null && !record.revoked && record.expiresAt > now,
      )
      .map(async (record) => toIssued(record, await urlForRecord(env, record))),
  );
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
  const label = parseText(body?.label, 60) ?? 'Guest invite';
  const note = parseText(body?.note, 240);
  const inviterName = parseText(body?.inviterName, 80);
  const contact = parseText(body?.contact, 80);
  const client = createDirectBmxClient(accessToken, { baseUrl: env.BMX_API_ORIGIN });
  const ownerIdValue = await ownerIdFromClient(client);
  const live = await listKeys(env, accessToken);
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
  const url = `${PUBLIC_ORIGIN}/k/${secret}`;
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
    label,
    note,
    inviterName,
    contact,
    wrappedSecret: await wrapString(wrapSecret(env), secret),
  };
  await putKey(env, record, await sha256Hex(secret));
  await addOwnerKeyId(env, ownerIdValue, id);
  return {
    ...toIssued(record, url),
    url,
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
    buildingName: doors[0]?.buildingName ?? snapshot.doors[0]?.buildingName ?? APP_NAME,
    expiresAt: record.expiresAt,
    label: record.label ?? 'Guest invite',
    note: record.note ?? null,
    inviterName: record.inviterName ?? null,
    contact: record.contact ?? null,
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
  if (door.disabled) {
    throw new HttpError(403, 'That door is closed right now.');
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
  const hash = await sha256Hex(secret);
  let id = await getKeyIdByHash(env, hash, { allowKv: false });
  if (id === null) {
    await sleep(150);
    id = await getKeyIdByHash(env, hash, { allowKv: false });
  }
  if (id === null) {
    id = await getKeyIdByHash(env, hash);
  }
  if (id === null) {
    throw new HttpError(410, 'This key is dead.');
  }
  let record = await getKey(env, id, { allowKv: false });
  if (record === null) {
    await sleep(150);
    record = await getKey(env, id, { allowKv: false });
  }
  if (record === null) {
    record = await getKey(env, id);
  }
  if (record === null || record.revoked || record.expiresAt <= Date.now()) {
    throw new HttpError(410, 'This key is dead.');
  }
  return record;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function parseText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text.slice(0, maxLength) : null;
}

function filterDoors(doors: Door[], doorIds: string[]): Door[] {
  if (doorIds.length === 0) {
    return doors;
  }
  const allowed = new Set(doorIds);
  return doors.filter((door) => allowed.has(door.id));
}

async function urlForRecord(env: Env, record: KeyRecord): Promise<string | null> {
  if (record.wrappedSecret === undefined) {
    return null;
  }
  try {
    const secret = await unwrapString(wrapSecret(env), record.wrappedSecret);
    return `${PUBLIC_ORIGIN}/k/${secret}`;
  } catch {
    return null;
  }
}

function toIssued(record: KeyRecord, url: string | null): IssuedKey {
  return {
    id: record.id,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    revoked: record.revoked,
    doorCount: record.doorIds.length,
    label: record.label ?? 'Guest invite',
    note: record.note ?? null,
    inviterName: record.inviterName ?? null,
    contact: record.contact ?? null,
    url,
  };
}
