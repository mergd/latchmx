import { asRecord, type JsonRecord } from './bmx-json';

export type NearbyReaderMetadata = ReadonlyMap<number, readonly string[]>;

type FetchImplementation = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

const TENANTS_QUERY = `
  query NearbyTenants($after: String) {
    tenants(after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        building { capabilities }
      }
    }
  }
`;

const ACCESS_POINTS_QUERY = `
  query NearbyAccessPoints($tenantId: ID!, $after: String) {
    nodes(ids: [$tenantId]) {
      ... on Tenant {
        accessPoints(after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            legacyId
            capabilities
            devices {
              nodes {
                __typename
                ... on Intercom { serialNumber }
                ... on CloudBasedAccessController { readerSerialNumbers }
              }
            }
          }
        }
      }
    }
  }
`;

const BLE_BUILDING_CAPABILITY = 'BLE_ACCESS_ENABLED';
const BLUETOOTH_ACCESS_POINT_CAPABILITY = 'BLUETOOTH';

export async function fetchNearbyReaderMetadata(
  accessToken: string,
  endpoint: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<NearbyReaderMetadata> {
  const tenantIds = await fetchBleTenantIds(
    accessToken,
    endpoint,
    fetchImplementation,
  );
  const result = new Map<number, string[]>();
  await Promise.all(
    tenantIds.map(async (tenantId) => {
      let after: string | null = null;
      do {
        const data = await requestGraphql(
          accessToken,
          endpoint,
          ACCESS_POINTS_QUERY,
          { tenantId, after },
          fetchImplementation,
        );
        const connection = firstTenantAccessPoints(data);
        mergeAccessPointReaders(result, connection.nodes);
        after = connection.nextCursor;
      } while (after !== null);
    }),
  );
  return result;
}

async function fetchBleTenantIds(
  accessToken: string,
  endpoint: string,
  fetchImplementation: FetchImplementation,
): Promise<string[]> {
  const ids: string[] = [];
  let after: string | null = null;
  do {
    const data = await requestGraphql(
      accessToken,
      endpoint,
      TENANTS_QUERY,
      { after },
      fetchImplementation,
    );
    const connection = connectionPage(asRecord(data.tenants));
    for (const value of connection.nodes) {
      const tenant = asRecord(value);
      const building = asRecord(tenant?.building);
      if (
        typeof tenant?.id === 'string' &&
        hasCapability(building, BLE_BUILDING_CAPABILITY)
      ) {
        ids.push(tenant.id);
      }
    }
    after = connection.nextCursor;
  } while (after !== null);
  return ids;
}

async function requestGraphql(
  accessToken: string,
  endpoint: string,
  query: string,
  variables: JsonRecord,
  fetchImplementation: FetchImplementation,
): Promise<JsonRecord> {
  const response = await fetchImplementation(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = asRecord(await response.json());
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (!response.ok || errors.length > 0) {
    const message = errors
      .map((value) => asRecord(value)?.message)
      .find((value): value is string => typeof value === 'string');
    throw new Error(message ?? 'Could not load nearby-reader metadata.');
  }
  const data = asRecord(payload?.data);
  if (data === null) {
    throw new Error('Unexpected nearby-reader response.');
  }
  return data;
}

function firstTenantAccessPoints(data: JsonRecord): ConnectionPage {
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  for (const value of nodes) {
    const tenant = asRecord(value);
    const accessPoints = asRecord(tenant?.accessPoints);
    if (accessPoints !== null) {
      return connectionPage(accessPoints);
    }
  }
  return { nodes: [], nextCursor: null };
}

type ConnectionPage = {
  nodes: unknown[];
  nextCursor: string | null;
};

function connectionPage(value: JsonRecord | null): ConnectionPage {
  const nodes = Array.isArray(value?.nodes) ? value.nodes : [];
  const pageInfo = asRecord(value?.pageInfo);
  const nextCursor =
    pageInfo?.hasNextPage === true && typeof pageInfo.endCursor === 'string'
      ? pageInfo.endCursor
      : null;
  return { nodes, nextCursor };
}

function mergeAccessPointReaders(
  result: Map<number, string[]>,
  values: unknown[],
): void {
  for (const value of values) {
    const accessPoint = asRecord(value);
    if (!hasCapability(accessPoint, BLUETOOTH_ACCESS_POINT_CAPABILITY)) {
      continue;
    }
    const legacyId = numericId(accessPoint?.legacyId);
    if (legacyId === null) {
      continue;
    }
    const devices = asRecord(accessPoint?.devices);
    const deviceNodes = Array.isArray(devices?.nodes) ? devices.nodes : [];
    const identifiers: string[] = [];
    for (const deviceValue of deviceNodes) {
      const device = asRecord(deviceValue);
      if (device?.__typename === 'Intercom') {
        addIdentifier(identifiers, device.serialNumber);
      } else if (device?.__typename === 'CloudBasedAccessController') {
        if (Array.isArray(device.readerSerialNumbers)) {
          for (const serial of device.readerSerialNumbers) {
            addIdentifier(identifiers, serial);
          }
        }
      }
    }
    if (identifiers.length > 0) {
      result.set(legacyId, [...new Set(identifiers)]);
    }
  }
}

function hasCapability(record: JsonRecord | null, capability: string): boolean {
  return (
    Array.isArray(record?.capabilities) &&
    record.capabilities.includes(capability)
  );
}

function numericId(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function addIdentifier(target: string[], value: unknown): void {
  if (typeof value !== 'string') {
    return;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized.length >= 6 && normalized.length <= 80) {
    target.push(normalized);
  }
}
