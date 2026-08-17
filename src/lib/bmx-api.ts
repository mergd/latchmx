import {
  ButterflyMxClient,
  ButterflyMxHttpError,
  type ButterflyMxAccessPoint,
  type ButterflyMxDevice,
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
    const [tenants, buildings, extraPointsRaw, extraDevicesRaw] = await Promise.all([
      client.tenants.list({ per: 250 }),
      client.buildings.list({ per: 250 }),
      listOrEmpty<ButterflyMxAccessPoint>(client, '/v4/access_points'),
      listOrEmpty<ButterflyMxDevice>(client, '/v4/devices'),
    ]);
    const extraPoints = extraPointsRaw;
    const extraDevices = extraDevicesRaw;

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
          client.accessPoints.list({ buildingId, per: 250 }),
          client.devices.list({ buildingId, per: 250 }),
        ]);
        const buildingName = buildingNames.get(buildingId) ?? 'Building';
        const points = uniqueById([
          ...accessPoints,
          ...extraPoints.filter((point) => point.building_id === buildingId),
        ]);
        const hardware = uniqueById([
          ...devices,
          ...extraDevices.filter((device) => device.building_id === buildingId),
        ]);
        const fromPoints: Door[] = points.flatMap((point) => {
          const record = asRecord(point);
          if (record !== null && isHiddenRecord(record)) {
            return [];
          }
          return [{
            id: `ap-${point.id}`,
            remoteId: point.id,
            kind: 'access_point' as const,
            name: point.name,
            buildingId,
            buildingName,
            tenantId,
            heldOpen: record !== null && isOpenRecord(record),
          }];
        });
        const fromDevices: Door[] = hardware.flatMap((device) => {
          const record = asRecord(device);
          if (record !== null && isHiddenRecord(record)) {
            return [];
          }
          return [{
            id: `dev-${device.id}`,
            remoteId: device.id,
            kind: 'device' as const,
            name: device.name,
            buildingId,
            buildingName,
            tenantId,
            heldOpen: record !== null && isOpenRecord(record),
          }];
        });
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
    baseUrl: Platform.OS === 'web' ? webProxyUrl('/api/bmx') : undefined,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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

async function listOrEmpty<T>(
  client: ButterflyMxClient,
  path: string,
): Promise<T[]> {
  try {
    const payload = await client.request<unknown>(path, { query: { per: 250 } });
    return Array.isArray(payload) ? (payload as T[]) : [];
  } catch {
    return [];
  }
}

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const next: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

function isHiddenRecord(record: JsonRecord): boolean {
  if (flagTrue(record.hidden) || flagTrue(record.is_hidden) || flagTrue(record.disabled)) {
    return true;
  }
  if (record.visible === false || record.enabled === false || record.active === false) {
    return true;
  }
  return false;
}

function isOpenRecord(record: JsonRecord): boolean {
  if (
    flagTrue(record.open) ||
    flagTrue(record.opened) ||
    flagTrue(record.held_open) ||
    flagTrue(record.unlocked) ||
    flagTrue(record.latch_open)
  ) {
    return true;
  }
  if (typeof record.status === 'string') {
    const status = record.status.toLowerCase();
    if (
      status === 'open' ||
      status === 'opened' ||
      status === 'unlocked' ||
      status === 'held_open' ||
      status === 'held-open'
    ) {
      return true;
    }
  }
  return false;
}

function flagTrue(value: unknown): boolean {
  return value === true || value === 1 || value === 'true';
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
    return webProxyUrl('/api/accounts');
  }
  return bmxAccountsBaseUrl();
}
