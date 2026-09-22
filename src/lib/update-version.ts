export type AvailableUpdate = {
  id: string;
  url: string;
};

export function compareStoreVersions(left: string, right: string): number | null {
  const pattern = /^\d+(?:\.\d+)*$/;
  if (!pattern.test(left) || !pattern.test(right)) return null;
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function appleUpdateFromLookup(
  payload: unknown,
  bundleId: string,
  installedVersion: string,
): AvailableUpdate | null {
  if (typeof payload !== 'object' || payload === null || !('results' in payload)) return null;
  const results = payload.results;
  if (!Array.isArray(results)) return null;
  const listing = results.find(
    (item: unknown) => typeof item === 'object' && item !== null &&
      'bundleId' in item && item.bundleId === bundleId,
  );
  if (typeof listing !== 'object' || listing === null ||
      !('version' in listing) || typeof listing.version !== 'string' ||
      !('trackViewUrl' in listing) || typeof listing.trackViewUrl !== 'string') return null;
  if (compareStoreVersions(listing.version, installedVersion) !== 1) return null;
  try {
    const url = new URL(listing.trackViewUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com') return null;
    return { id: `ios:${listing.version}`, url: url.toString() };
  } catch {
    return null;
  }
}
