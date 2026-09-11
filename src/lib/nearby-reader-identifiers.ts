import type { NearbyPeripheral } from '../../modules/nearby-doors';

const WAVELYNX_SERVICE_UUID = canonicalUuid(
  '3420D81A-AF2C-11E5-BF7F-FEFF819CDC9F',
);
const WAVELYNX_SERIAL_BYTES = 8;

export function observedReaderIdentifiers(
  peripheral: NearbyPeripheral,
): string[] {
  const identifiers = [
    peripheral.name,
    peripheral.advertisedName,
    peripheral.peripheralName,
  ].filter(
    (value): value is string =>
      typeof value === 'string' && value.length > 0,
  );

  const serviceData = Array.isArray(peripheral.serviceData)
    ? peripheral.serviceData
    : [];
  for (const entry of serviceData) {
    if (
      typeof entry?.uuid !== 'string' ||
      typeof entry.hex !== 'string' ||
      canonicalUuid(entry.uuid) !== WAVELYNX_SERVICE_UUID
    ) {
      continue;
    }
    const hex = entry.hex.toUpperCase().replace(/[^A-F0-9]/g, '');
    const serialLength = WAVELYNX_SERIAL_BYTES * 2;
    if (hex.length >= serialLength) {
      identifiers.push(hex.slice(0, serialLength));
    }
  }

  return [...new Set(identifiers)];
}

function canonicalUuid(value: string): string {
  return value.toUpperCase().replace(/[^A-F0-9]/g, '');
}
