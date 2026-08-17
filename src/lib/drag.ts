export type GroupDrag = {
  kind: 'group';
  id: string;
};

export type DoorDrag = {
  kind: 'door';
  id: string;
  groupId: string;
};

export type DragPayload = GroupDrag | DoorDrag;

let activeDrag: DragPayload | null = null;

export function setActiveDrag(payload: DragPayload | null): void {
  activeDrag = payload;
}

export function getActiveDrag(): DragPayload | null {
  return activeDrag;
}

export function encodeDrag(payload: DragPayload): string {
  return JSON.stringify(payload);
}

export function parseDrag(raw: string): DragPayload | null {
  if (raw.length === 0) {
    return activeDrag;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    if (parsed.kind === 'group' && typeof parsed.id === 'string') {
      return { kind: 'group', id: parsed.id };
    }
    if (
      parsed.kind === 'door' &&
      typeof parsed.id === 'string' &&
      typeof parsed.groupId === 'string'
    ) {
      return { kind: 'door', id: parsed.id, groupId: parsed.groupId };
    }
    return activeDrag;
  } catch {
    return activeDrag;
  }
}

export function neighborBefore(
  ids: string[],
  id: string,
  dir: -1 | 1,
): string | null | undefined {
  const index = ids.indexOf(id);
  if (index < 0) {
    return undefined;
  }
  if (dir === -1) {
    if (index === 0) {
      return undefined;
    }
    return ids[index - 1] ?? undefined;
  }
  if (index >= ids.length - 1) {
    return undefined;
  }
  return ids[index + 2] ?? null;
}

export function insertBefore(
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
