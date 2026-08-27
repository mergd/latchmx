import {
  OTHER_GROUP_ID,
  OTHER_GROUP_LABEL,
  buildings,
  fallbackBuilding,
  type BuildingConfig,
  type DoorGroupConfig,
} from '@/config/buildings';
import type { Door } from '@/lib/types';

export type DoorGroup = {
  id: string;
  label: string;
  doors: Door[];
};

export type DoorArrangement = {
  groupOrder: string[];
  doorOrder: Record<string, string[]>;
};

export const emptyArrangement: DoorArrangement = {
  groupOrder: [],
  doorOrder: {},
};

export function layoutForDoors(doors: Door[]): BuildingConfig {
  if (!Array.isArray(doors)) {
    return fallbackBuilding;
  }
  const sample = doors[0];
  return sample ? layoutForDoor(sample) : fallbackBuilding;
}

export function layoutForDoor(door: Door): BuildingConfig {
  return (
    buildings.find((building) => matchesBuilding(building, door)) ??
    fallbackBuilding
  );
}

export function differsFromBaseLayout(
  doors: Door[],
  zoneByDoorId: Record<string, string>,
  arrangement: DoorArrangement,
  hiddenByDoorId: Record<string, boolean>,
): boolean {
  if (userHiddenDoors(doors, hiddenByDoorId).length > 0) {
    return true;
  }
  const current = groupDoors(doors, zoneByDoorId, arrangement, hiddenByDoorId);
  const base = groupDoors(doors, {}, emptyArrangement, {});
  if (current.length !== base.length) {
    return true;
  }
  return current.some((group, index) => {
    const other = base[index];
    if (
      other === undefined ||
      group.id !== other.id ||
      group.doors.length !== other.doors.length
    ) {
      return true;
    }
    return group.doors.some(
      (door, doorIndex) => door.id !== other.doors[doorIndex]?.id,
    );
  });
}

export function hasCustomLayout(doors: Door[]): boolean {
  if (!Array.isArray(doors)) {
    return false;
  }
  const sample = doors[0];
  return (
    sample !== undefined &&
    buildings.some((building) => matchesBuilding(building, sample))
  );
}

export function groupCycle(door: Door): string[] {
  const ids = layoutForDoor(door).groups.map((group) => group.id);
  return [...ids, OTHER_GROUP_ID];
}

export function groupLabel(door: Door, groupId: string): string {
  if (groupId === OTHER_GROUP_ID) {
    return OTHER_GROUP_LABEL;
  }
  const group = layoutForDoor(door).groups.find((item) => item.id === groupId);
  return group?.label ?? OTHER_GROUP_LABEL;
}

export function isHiddenDoor(
  door: Door,
  hiddenByDoorId: Record<string, boolean> = {},
): boolean {
  return hiddenByDoorId[door.id] === true || isConfigHidden(door);
}

export function userHiddenDoors(
  doors: Door[],
  hiddenByDoorId: Record<string, boolean>,
): Door[] {
  if (!Array.isArray(doors)) {
    return [];
  }
  return doors.filter((door) => hiddenByDoorId[door.id] === true);
}

export function inferGroup(door: Door): string {
  const layout = layoutForDoor(door);
  const name = door.name.toLowerCase();
  let bestId = OTHER_GROUP_ID;
  let bestScore = 0;
  for (const group of layout.groups) {
    const score = matchScore(name, group);
    if (score > bestScore) {
      bestScore = score;
      bestId = group.id;
    }
  }
  return bestId;
}

export function resolveGroup(
  door: Door,
  overrides: Record<string, string>,
): string {
  return overrides[door.id] ?? inferGroup(door);
}

export function nextGroup(door: Door, current: string): string {
  const cycle = groupCycle(door);
  const index = cycle.indexOf(current);
  const next = cycle[(index + 1) % cycle.length];
  return next ?? OTHER_GROUP_ID;
}

export function groupDoors(
  doors: Door[],
  overrides: Record<string, string>,
  arrangement: DoorArrangement = emptyArrangement,
  hiddenByDoorId: Record<string, boolean> = {},
): DoorGroup[] {
  if (!Array.isArray(doors)) {
    return [];
  }
  const visible = doors.filter(
    (door) => !isHiddenDoor(door, hiddenByDoorId),
  );
  if (visible.length === 0) {
    return [];
  }
  const sample = visible[0];
  const layout = sample ? layoutForDoor(sample) : fallbackBuilding;
  const specs: { id: string; label: string }[] = [
    ...layout.groups.map((group) => ({ id: group.id, label: group.label })),
    { id: OTHER_GROUP_ID, label: OTHER_GROUP_LABEL },
  ];
  const buckets = new Map<string, Door[]>();
  for (const spec of specs) {
    buckets.set(spec.id, []);
  }
  for (const door of visible) {
    const id = resolveGroup(door, overrides);
    const list = buckets.get(id) ?? [];
    list.push(door);
    buckets.set(id, list);
  }
  const filled = specs
    .map((spec) => ({
      id: spec.id,
      label: spec.label,
      doors: sortDoors(buckets.get(spec.id) ?? [], arrangement.doorOrder[spec.id]),
    }))
    .filter((group) => group.doors.length > 0);
  const order = mergeOrder(
    arrangement.groupOrder,
    filled.map((group) => group.id),
  );
  return order
    .map((id) => filled.find((group) => group.id === id))
    .filter((group): group is DoorGroup => group !== undefined);
}

export function placeGroup(
  arrangement: DoorArrangement,
  groupIds: string[],
  draggedId: string,
  beforeId: string | null,
): DoorArrangement {
  return {
    ...arrangement,
    groupOrder: insertBefore(
      mergeOrder(arrangement.groupOrder, groupIds),
      draggedId,
      beforeId,
    ),
  };
}

export function placeDoor(
  arrangement: DoorArrangement,
  fromGroupId: string,
  toGroupId: string,
  fromDoorIds: string[],
  toDoorIds: string[],
  doorId: string,
  beforeId: string | null,
): DoorArrangement {
  const fromOrder = mergeOrder(arrangement.doorOrder[fromGroupId] ?? [], fromDoorIds).filter(
    (id) => id !== doorId,
  );
  const targetIds =
    fromGroupId === toGroupId
      ? mergeOrder(arrangement.doorOrder[toGroupId] ?? [], toDoorIds)
      : mergeOrder(arrangement.doorOrder[toGroupId] ?? [], toDoorIds).filter(
          (id) => id !== doorId,
        );
  return {
    ...arrangement,
    doorOrder: {
      ...arrangement.doorOrder,
      [fromGroupId]: fromGroupId === toGroupId ? insertBefore(targetIds, doorId, beforeId) : fromOrder,
      ...(fromGroupId === toGroupId
        ? {}
        : {
            [toGroupId]: insertBefore(targetIds, doorId, beforeId),
          }),
    },
  };
}

export function parseArrangement(raw: string | null): DoorArrangement {
  if (raw === null) {
    return emptyArrangement;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DoorArrangement>;
    const groupOrder = Array.isArray(parsed.groupOrder)
      ? parsed.groupOrder.filter((id): id is string => typeof id === 'string')
      : [];
    const doorOrder: Record<string, string[]> = {};
    if (parsed.doorOrder !== undefined && typeof parsed.doorOrder === 'object') {
      for (const [groupId, ids] of Object.entries(parsed.doorOrder)) {
        if (Array.isArray(ids)) {
          doorOrder[groupId] = ids.filter((id): id is string => typeof id === 'string');
        }
      }
    }
    return { groupOrder, doorOrder };
  } catch {
    return emptyArrangement;
  }
}

function sortDoors(doors: Door[], preferred: string[] | undefined): Door[] {
  const order = mergeOrder(
    preferred ?? [],
    doors.map((door) => door.id),
  );
  return order
    .map((id) => doors.find((door) => door.id === id))
    .filter((door): door is Door => door !== undefined);
}

function mergeOrder(preferred: string[], available: string[]): string[] {
  const present = new Set(available);
  const head = preferred.filter((id) => present.has(id));
  const seen = new Set(head);
  return [...head, ...available.filter((id) => !seen.has(id))];
}

function insertBefore(
  ids: string[],
  draggedId: string,
  beforeId: string | null,
): string[] {
  const without = ids.filter((id) => id !== draggedId);
  if (beforeId === null) {
    return [...without, draggedId];
  }
  const index = without.indexOf(beforeId);
  if (index < 0) {
    return [...without, draggedId];
  }
  return [...without.slice(0, index), draggedId, ...without.slice(index)];
}

export function isLockoutDoor(door: Door): boolean {
  const layout = layoutForDoor(door);
  if (layout.lockout === undefined) {
    return false;
  }
  const name = door.name.trim().toLowerCase();
  return layout.lockout.some((item) => item.trim().toLowerCase() === name);
}

function isConfigHidden(door: Door): boolean {
  const layout = layoutForDoor(door);
  const name = door.name.trim().toLowerCase();
  if (layout.show !== undefined) {
    return !layout.show.some((item) => item.trim().toLowerCase() === name);
  }
  if (layout.hide === undefined) {
    return false;
  }
  return layout.hide.some((item) => item.trim().toLowerCase() === name);
}

function matchesBuilding(building: BuildingConfig, door: Door): boolean {
  if (building.match.buildingIds?.includes(door.buildingId)) {
    return true;
  }
  const name = door.buildingName.toLowerCase();
  return (
    building.match.nameIncludes?.some((fragment) =>
      name.includes(fragment.toLowerCase()),
    ) ?? false
  );
}

function matchScore(doorName: string, group: DoorGroupConfig): number {
  let best = 0;
  for (const fragment of group.match) {
    const needle = fragment.toLowerCase();
    if (needle.length > best && doorName.includes(needle)) {
      best = needle.length;
    }
  }
  return best;
}
