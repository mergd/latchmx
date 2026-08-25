import {
  ButterflyMxClient,
  ButterflyMxHttpError,
  type ButterflyMxAccessPoint,
  type ButterflyMxDevice,
  type ButterflyMxTenant,
} from '@mergd/butterflymx';

import { asRecord, errorMessage, type JsonRecord } from './bmx-json';
import type { Account, BmxEnv, Door } from './types';

export function createDirectBmxClient(
  accessToken: string,
  options?: { baseUrl?: string; env?: BmxEnv },
): ButterflyMxClient {
  return new ButterflyMxClient({
    env: options?.env ?? 'production',
    baseUrl: options?.baseUrl,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function loadDoors(client: ButterflyMxClient): Promise<{
  doors: Door[];
  account: Account | null;
}> {
  try {
    const [tenants, buildings, extraPointsRaw, extraDevicesRaw] = await Promise.all([
      client.tenants.list({ per: 250 }),
      client.buildings.list({ per: 250 }),
      listOrEmpty<ButterflyMxAccessPoint>(client, '/v4/access_points'),
      listOrEmpty<ButterflyMxDevice>(client, '/v4/devices'),
    ]);
    const extraPoints = extraPointsRaw;
    const extraDevices = extraDevicesRaw;
    const account = accountFromTenants(tenants);

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

    return {
      doors: doorGroups.flat().sort((left, right) => left.name.localeCompare(right.name)),
      account,
    };
  } catch (error) {
    throw mapBmxError(error, 'Could not load doors.');
  }
}

export async function releaseDoorOn(
  client: ButterflyMxClient,
  door: Door,
): Promise<void> {
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

export async function ownerIdFromClient(client: ButterflyMxClient): Promise<string> {
  const tenants = await client.tenants.list({ per: 250 });
  const ids = tenants.map((tenant) => tenant.id).sort((left, right) => left - right);
  if (ids.length === 0) {
    throw new Error('No unit on this account.');
  }
  return `t:${ids.join(',')}`;
}

export function mapBmxError(error: unknown, fallback: string): Error {
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

function accountFromTenants(tenants: ButterflyMxTenant[]): Account | null {
  const tenant =
    tenants.find((item) => typeof item.email === 'string' && item.email.length > 0) ??
    tenants[0];
  if (tenant === undefined) {
    return null;
  }
  const nameParts = [tenant.first_name, tenant.last_name].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  const fullName =
    typeof tenant.full_name === 'string' ? tenant.full_name.trim() : '';
  const name =
    nameParts.join(' ') || (fullName.length > 0 ? fullName : null);
  const email =
    typeof tenant.email === 'string' && tenant.email.length > 0 ? tenant.email : null;
  if (name === null && email === null) {
    return null;
  }
  return { name, email };
}

function tenantBuildingName(tenant: ButterflyMxTenant): string | null {
  const name = tenant.building_name;
  if (typeof name === 'string' && name.length > 0) {
    return name;
  }
  return null;
}
