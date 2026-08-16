import {
  OTHER_GROUP_ID,
  OTHER_GROUP_LABEL,
  buildings,
  type BuildingConfig,
  type DoorGroupConfig,
} from '@/config/buildings';
import type { Door } from '@/lib/types';

export type DoorGroup = {
  id: string;
  label: string;
  doors: Door[];
};

export function layoutForDoor(door: Door): BuildingConfig | null {
  return (
    buildings.find((building) => matchesBuilding(building, door)) ?? null
  );
}

export function groupCycle(door: Door): string[] {
  const layout = layoutForDoor(door);
  const ids = layout?.groups.map((group) => group.id) ?? [];
  return [...ids, OTHER_GROUP_ID];
}

export function groupLabel(door: Door, groupId: string): string {
  if (groupId === OTHER_GROUP_ID) {
    return OTHER_GROUP_LABEL;
  }
  const group = layoutForDoor(door)?.groups.find((item) => item.id === groupId);
  return group?.label ?? OTHER_GROUP_LABEL;
}

export function inferGroup(door: Door): string {
  const layout = layoutForDoor(door);
  if (layout === null) {
    return OTHER_GROUP_ID;
  }
  const name = door.name.toLowerCase();
  const matched = layout.groups.find((group) => matchesName(name, group));
  return matched?.id ?? OTHER_GROUP_ID;
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
): DoorGroup[] {
  if (doors.length === 0) {
    return [];
  }
  const sample = doors[0];
  const layout = sample ? layoutForDoor(sample) : null;
  const specs: { id: string; label: string }[] = [
    ...(layout?.groups.map((group) => ({ id: group.id, label: group.label })) ??
      []),
    { id: OTHER_GROUP_ID, label: OTHER_GROUP_LABEL },
  ];
  const buckets = new Map<string, Door[]>();
  for (const spec of specs) {
    buckets.set(spec.id, []);
  }
  for (const door of doors) {
    const id = resolveGroup(door, overrides);
    const list = buckets.get(id) ?? [];
    list.push(door);
    buckets.set(id, list);
  }
  return specs
    .map((spec) => ({
      id: spec.id,
      label: spec.label,
      doors: buckets.get(spec.id) ?? [],
    }))
    .filter((group) => group.doors.length > 0);
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

function matchesName(doorName: string, group: DoorGroupConfig): boolean {
  return group.match.some((fragment) =>
    doorName.includes(fragment.toLowerCase()),
  );
}
