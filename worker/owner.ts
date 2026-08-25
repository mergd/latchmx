import { asRecord, errorMessage } from '../src/lib/bmx-json';
import type { AuthTokens } from '../src/lib/types';

import type { Env } from './env';
import { HttpError } from './http';
import { getOwner, putOwner } from './store';

export async function refreshOwnerTokens(
  env: Env,
  tokens: AuthTokens,
): Promise<AuthTokens> {
  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens;
  }
  const clientId = env.BMX_CLIENT_ID;
  const clientSecret = env.BMX_CLIENT_SECRET;
  if (
    clientId === undefined ||
    clientId.length === 0 ||
    clientSecret === undefined ||
    clientSecret.length === 0
  ) {
    throw new HttpError(500, 'ButterflyMX credentials are missing.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(`${env.BMX_ACCOUNTS_ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { error_description: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    throw new HttpError(401, errorMessage(payload, 'This key’s session expired.'));
  }
  const record = asRecord(payload);
  const refreshToken =
    typeof record?.refresh_token === 'string' && record.refresh_token.length > 0
      ? record.refresh_token
      : tokens.refreshToken;
  if (
    record === null ||
    typeof record.access_token !== 'string' ||
    typeof record.expires_in !== 'number'
  ) {
    throw new HttpError(500, 'Unexpected token response.');
  }
  return {
    accessToken: record.access_token,
    refreshToken,
    expiresAt: Date.now() + record.expires_in * 1000,
  };
}

export async function freshOwnerTokens(
  env: Env,
  ownerId: string,
): Promise<AuthTokens> {
  const stored = await getOwner(env, ownerId);
  if (stored === null) {
    throw new HttpError(410, 'This key is no longer valid.');
  }
  const fresh = await refreshOwnerTokens(env, stored);
  if (
    fresh.accessToken !== stored.accessToken ||
    fresh.refreshToken !== stored.refreshToken
  ) {
    await putOwner(env, ownerId, fresh);
  }
  return fresh;
}
