import { expect, test } from 'bun:test';
import { createDemoStore, DEMO_KEYS_STORAGE, isDemoSecret } from '../src/lib/demo';
import { mockBuildingName, mockDoors } from '../src/lib/mock-building';

function setup(initial = {}) {
  const data = new Map(Object.entries(initial));
  let serial = 0;
  const storage = {
    get: async key => data.get(key) ?? null,
    set: async (key, value) => { data.set(key, value); },
  };
  return { data, storage, store: createDemoStore(storage, () => String(++serial), () => 'latch://') };
}

const input = {
  ttl: '1h',
  label: 'Party later today',
  note: 'Come up to the rooftop when you arrive.',
  inviterName: 'Alex Rivera',
  contact: 'alex@example.com',
  doorIds: mockDoors.map(door => door.id),
};

test('original demo doors cannot address a production building or door', () => {
  expect(mockBuildingName).toBe('The Marlowe');
  expect(mockDoors).toHaveLength(6);
  for (const door of mockDoors) {
    expect(door.id.startsWith('demo-')).toBe(true);
    expect(door.remoteId).toBeLessThan(0);
    expect(door.buildingId).toBeLessThan(0);
  }
  expect(isDemoSecret('demo.123')).toBe(true);
  expect(isDemoSecret('demo-' + 'a'.repeat(27))).toBe(false);
  expect(isDemoSecret('live-secret')).toBe(false);
  expect(isDemoSecret(null)).toBe(false);
});

test('create, list, recopy, guest preview and revoke retain invite details', async () => {
  const { store, storage } = setup();
  const created = await store.create(input);
  expect(created.url).toBe('latch:///k/demo.1');
  expect(created.expiresAt - created.createdAt).toBe(3_600_000);
  expect((await store.list())[0]?.url).toBe(created.url);
  const guest = await store.guest(created.id);
  expect(guest.doors).toHaveLength(6);
  expect(guest.invite).toEqual({ label: input.label, note: input.note, inviterName: input.inviterName, contact: input.contact });
  await store.unlock(mockDoors[0], created.id);
  const reloaded = createDemoStore(storage, () => 'new', () => 'latch://');
  expect((await reloaded.list())[0]?.url).toBe(created.url);
  await store.revoke(created.id);
  expect(await store.list()).toEqual([]);
  await expect(reloaded.guest(created.id)).rejects.toThrow('This key is dead.');
  await expect(store.unlock(mockDoors[0], created.id)).rejects.toThrow('This key is dead.');
});

test('hidden doors are excluded, invalid IDs cannot inject production doors', async () => {
  const { store } = setup();
  const created = await store.create({ ...input, doorIds: [mockDoors[0].id, 'ap-production'] });
  expect(created.doorCount).toBe(1);
  expect((await store.guest(created.id)).doors).toEqual([mockDoors[0]]);
  await expect(store.unlock(mockDoors[1], created.id)).rejects.toThrow('not included');
  await expect(store.unlock({ ...mockDoors[0], id: 'ap-production' }, null)).rejects.toThrow('not a demo door');
  await expect(store.create({ ...input, doorIds: [] })).rejects.toThrow('Show at least one door');
});

test('expired invites cannot load or unlock', async () => {
  const { store, data } = setup();
  const created = await store.create(input);
  const keys = JSON.parse(data.get(DEMO_KEYS_STORAGE));
  keys[0].expiresAt = Date.now() - 1;
  data.set(DEMO_KEYS_STORAGE, JSON.stringify(keys));
  expect(await store.list()).toEqual([]);
  await expect(store.guest(created.id)).rejects.toThrow('This key is dead.');
  await expect(store.unlock(mockDoors[0], created.id)).rejects.toThrow('This key is dead.');
});

test('unknown device links explain local-only access and leave real storage untouched', async () => {
  const real = { 'latch.tokens': 'real-tokens', 'latch.layout': 'real-layout', 'latch.account': 'real-account' };
  const { store, data } = setup(real);
  await store.create(input);
  await expect(store.guest('demo.other-device')).rejects.toThrow('only available on the device');
  for (const [key, value] of Object.entries(real)) expect(data.get(key)).toBe(value);
  expect([...data.keys()].filter(key => !(key in real))).toEqual([DEMO_KEYS_STORAGE]);
});

test('all duration options work and concurrent writes retain both invites', async () => {
  const { store } = setup();
  const [tonight, tomorrow] = await Promise.all([
    store.create({ ...input, ttl: 'tonight' }),
    store.create({ ...input, ttl: '24h', note: '', contact: '' }),
  ]);
  expect(tonight.expiresAt).toBeGreaterThan(tonight.createdAt);
  expect(tomorrow.expiresAt - tomorrow.createdAt).toBe(86_400_000);
  expect(tomorrow.note).toBe(null);
  expect(tomorrow.contact).toBe(null);
  expect(await store.list()).toHaveLength(2);
});

test('bad local data is ignored instead of breaking the demo', async () => {
  for (const raw of ['not json', '{}', '[null,{}, {"id":"real-id"}]']) {
    const { store } = setup({ [DEMO_KEYS_STORAGE]: raw });
    expect(await store.list()).toEqual([]);
    await store.create(input);
    expect(await store.list()).toHaveLength(1);
  }
});
