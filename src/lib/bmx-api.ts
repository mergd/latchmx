import { Platform } from 'react-native';

import {
  createDirectBmxClient,
  loadDoors,
  releaseDoorOn,
} from '@/lib/bmx-doors';
import { asRecord, errorMessage } from '@/lib/bmx-json';
import {
  bmxAccountsBaseUrl,
  bmxConfig,
} from '@/lib/config';
import type { AuthTokens, Door } from '@/lib/types';

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error_description: text.slice(0, 180) };
  }
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: bmxConfig.clientId,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${clientAccountsOrigin()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, 'Could not complete sign-in.'));
  }

  return tokensFromResponse(payload);
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: bmxConfig.clientId,
  });

  const response = await fetch(`${clientAccountsOrigin()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, 'Session expired. Sign in again.'));
  }

  return tokensFromResponse(payload, refreshToken);
}

export function authorizationUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: bmxConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });
  return `${bmxAccountsBaseUrl()}/oauth/authorize?${params.toString()}`;
}

export function authorizationCodeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code !== null && code.length > 0) {
      return code;
    }
  } catch {
    const match = /[?&]code=([^&]+)/.exec(url);
    if (match?.[1] !== undefined && match[1].length > 0) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

export async function fetchDoors(accessToken: string) {
  return loadDoors(createBmxClient(accessToken));
}

export async function releaseDoor(accessToken: string, door: Door): Promise<void> {
  await releaseDoorOn(createBmxClient(accessToken), door);
}

function createBmxClient(accessToken: string) {
  return createDirectBmxClient(accessToken, {
    env: bmxConfig.env,
    baseUrl: Platform.OS === 'web' ? webProxyUrl('/api/bmx') : undefined,
  });
}

function webProxyUrl(path: string): string {
  const origin =
    typeof globalThis.location?.origin === 'string'
      ? globalThis.location.origin
      : '';
  if (origin.length === 0) {
    throw new Error('Could not resolve the local API origin.');
  }
  return `${origin}${path}`;
}

function tokensFromResponse(
  payload: unknown,
  previousRefreshToken?: string,
): AuthTokens {
  const record = asRecord(payload);
  const refreshToken =
    typeof record?.refresh_token === 'string' && record.refresh_token.length > 0
      ? record.refresh_token
      : previousRefreshToken;
  if (
    record === null ||
    typeof record.access_token !== 'string' ||
    refreshToken === undefined ||
    typeof record.expires_in !== 'number'
  ) {
    throw new Error('Unexpected token response.');
  }
  return {
    accessToken: record.access_token,
    refreshToken,
    expiresAt: Date.now() + record.expires_in * 1000,
  };
}

function clientAccountsOrigin(): string {
  if (Platform.OS === 'web') {
    return webProxyUrl('/api/accounts');
  }
  return `${bmxConfig.proxyOrigin}/api/accounts`;
}
