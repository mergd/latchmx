import {
  ButterflyMxClient,
  ButterflyMxHttpError,
  type ButterflyMxTenant,
} from '@mergd/butterflymx';
import { Platform } from 'react-native';

import {
  bmxAccountsBaseUrl,
  bmxConfig,
} from '@/lib/config';
import type { AuthTokens, Door } from '@/lib/types';

type JsonRecord = Record<string, unknown>;

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  return JSON.parse(text) as unknown;
}

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
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
  if (bmxConfig.clientSecret.length > 0) {
    body.set('client_secret', bmxConfig.clientSecret);
  }

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
  if (bmxConfig.clientSecret.length > 0) {
    body.set('client_secret', bmxConfig.clientSecret);
  }

  const response = await fetch(`${clientAccountsOrigin()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, 'Session expired. Sign in again.'));
  }

  return tokensFromResponse(payload);
}

export function authorizationUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: bmxConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });
  return `${bmxAccountsBaseUrl()}/oauth/authorize?${params.toString()}`;
}

export async function fetchDoors(accessToken: string): Promise<Door[]> {
  const client = createBmxClient(accessToken);
  try {
    const [tenants, buildings] = await Promise.all([
      client.tenants.list(),
      client.buildings.list(),
    ]);

    const buildingNames = new Map<number, string>();
    for (const tenant of tenants) {
      const name = tenantBuildingName(tenant);
      if (name !== null) {
        buildingNames.set(tenant.building_id, name);
      }
    }
    for (const building of buildings) {
      if (typeof building.name === 'string' && building.name.length > 0) {
        buildingNames.set(building.id, building.name);
      }
    }
    const tenantByBuilding = new Map<number, number>();
    for (const tenant of tenants) {
      if (!tenantByBuilding.has(tenant.building_id)) {
        tenantByBuilding.set(tenant.building_id, tenant.id);
      }
    }

    const buildingIds = [...new Set(tenants.map((tenant) => tenant.building_id))];
    const doorGroups = await Promise.all(
      buildingIds.map(async (buildingId) => {
        const tenantId = tenantByBuilding.get(buildingId);
        if (tenantId === undefined) {
          return [] as Door[];
        }
        const [accessPoints, devices] = await Promise.all([
          client.accessPoints.list({ buildingId }),
          client.devices.list({ buildingId }),
        ]);
        const buildingName = buildingNames.get(buildingId) ?? 'Building';
        const fromPoints: Door[] = accessPoints.map((point) => ({
          id: `ap-${point.id}`,
          remoteId: point.id,
          kind: 'access_point',
          name: point.name,
          buildingId,
          buildingName,
          tenantId,
        }));
        const fromDevices: Door[] = devices.map((device) => ({
          id: `dev-${device.id}`,
          remoteId: device.id,
          kind: 'device',
          name: device.name,
          buildingId,
          buildingName,
          tenantId,
        }));
        return [...fromPoints, ...fromDevices];
      }),
    );

    return doorGroups.flat().sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    throw mapBmxError(error, 'Could not load doors.');
  }
}

export async function releaseDoor(accessToken: string, door: Door): Promise<void> {
  const client = createBmxClient(accessToken);
  const input =
    door.kind === 'access_point'
      ? { tenantId: door.tenantId, accessPointId: door.remoteId }
      : door.kind === 'device'
        ? { tenantId: door.tenantId, deviceId: door.remoteId }
        : (() => {
            const _never: never = door.kind;
            return _never;
          })();

  try {
    await client.doors.release(input);
  } catch (error) {
    throw mapBmxError(error, 'Could not release that door.');
  }
}

function createBmxClient(accessToken: string): ButterflyMxClient {
  return new ButterflyMxClient({
    env: bmxConfig.env,
    baseUrl: Platform.OS === 'web' ? '/api/bmx' : undefined,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function tenantBuildingName(tenant: ButterflyMxTenant): string | null {
  const name = tenant.building_name;
  if (typeof name === 'string' && name.length > 0) {
    return name;
  }
  return null;
}

function mapBmxError(error: unknown, fallback: string): Error {
  if (error instanceof ButterflyMxHttpError) {
    try {
      return new Error(errorMessage(JSON.parse(error.responseBody), fallback));
    } catch {
      return new Error(fallback);
    }
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

function tokensFromResponse(payload: unknown): AuthTokens {
  const record = asRecord(payload);
  if (
    record === null ||
    typeof record.access_token !== 'string' ||
    typeof record.refresh_token !== 'string' ||
    typeof record.expires_in !== 'number'
  ) {
    throw new Error('Unexpected token response.');
  }
  const tokens: TokenResponse = {
    access_token: record.access_token,
    refresh_token: record.refresh_token,
    expires_in: record.expires_in,
  };
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

function errorMessage(payload: unknown, fallback: string): string {
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

function clientAccountsOrigin(): string {
  if (Platform.OS === 'web') {
    return '/api/accounts';
  }
  return bmxAccountsBaseUrl();
}
