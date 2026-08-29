import { expiresAtForTtl } from '../../worker/ttl';
import { mockBuildingName, mockDoors } from './mock-building';
import type { CreatedKey, Door, GuestSession, KeyTtl } from './types';

export const DEMO_KEYS_STORAGE = 'latch.demo.keys';
export const DEMO_ENABLED_STORAGE = 'latch.demo.enabled';

type DemoKey = CreatedKey & { doorIds: string[] };
type DemoStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
};

export function isDemoSecret(secret: string | null): boolean {
  return secret?.startsWith('demo.') === true;
}

export function demoKeyPath(id: string): `/k/${string}` {
  return `/k/${id}`;
}

export function createDemoStore(storage: DemoStorage, uuid: () => string, origin: () => string) {
  let writes = Promise.resolve();

  async function read(): Promise<DemoKey[]> {
    const raw = await storage.get(DEMO_KEYS_STORAGE);
    if (raw === null) return [];
    try {
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return [];
      return value.filter((key): key is DemoKey =>
        key !== null && typeof key === 'object' &&
        typeof key.id === 'string' && isDemoSecret(key.id) &&
        typeof key.label === 'string' && typeof key.url === 'string' &&
        typeof key.createdAt === 'number' && typeof key.expiresAt === 'number' &&
        typeof key.revoked === 'boolean' && Array.isArray(key.doorIds) &&
        key.doorIds.every((id: unknown) => typeof id === 'string' && mockDoors.some(door => door.id === id)),
      );
    } catch {
      return [];
    }
  }

  function update<T>(change: (keys: DemoKey[]) => T): Promise<T> {
    const work = writes.then(async () => {
      const keys = await read();
      const result = change(keys);
      await storage.set(DEMO_KEYS_STORAGE, JSON.stringify(keys));
      return result;
    });
    writes = work.then(() => {}, () => {});
    return work;
  }

  async function liveKey(id: string): Promise<DemoKey> {
    await writes;
    const key = (await read()).find(item => item.id === id);
    if (!key) throw new Error('This demo invite is only available on the device where it was created.');
    if (key.revoked || key.expiresAt <= Date.now()) throw new Error('This key is dead.');
    return key;
  }

  return {
    async create(input: {
      ttl: KeyTtl; label: string; note: string; inviterName: string; contact: string; doorIds: string[];
    }): Promise<CreatedKey> {
      const doorIds = mockDoors.filter(door => input.doorIds.includes(door.id)).map(door => door.id);
      if (doorIds.length === 0) throw new Error('Show at least one door before creating an invite.');
      const now = Date.now();
      const id = `demo.${uuid()}`;
      const key: DemoKey = {
        id,
        createdAt: now,
        expiresAt: expiresAtForTtl(input.ttl, now),
        revoked: false,
        doorCount: doorIds.length,
        doorIds,
        label: input.label.trim() || 'Guest invite',
        note: input.note.trim() || null,
        inviterName: input.inviterName.trim() || null,
        contact: input.contact.trim() || null,
        url: `${origin()}${demoKeyPath(id)}`,
      };
      return update(keys => {
        keys.push(key);
        return key;
      });
    },
    async list(): Promise<CreatedKey[]> {
      await writes;
      return (await read()).filter(key => !key.revoked);
    },
    async revoke(id: string): Promise<void> {
      await update(keys => {
        const key = keys.find(item => item.id === id);
        if (key) key.revoked = true;
      });
    },
    async guest(id: string): Promise<GuestSession> {
      const key = await liveKey(id);
      return {
        doors: mockDoors.filter(door => key.doorIds.includes(door.id)),
        buildingName: mockBuildingName,
        expiresAt: key.expiresAt,
        invite: { label: key.label, note: key.note, inviterName: key.inviterName, contact: key.contact },
      };
    },
    async unlock(door: Door, guestId: string | null): Promise<void> {
      if (!mockDoors.some(item => item.id === door.id)) throw new Error('This is not a demo door.');
      if (guestId !== null) {
        const key = await liveKey(guestId);
        if (!key.doorIds.includes(door.id)) throw new Error('This door is not included in the invite.');
      }
    },
  };
}
