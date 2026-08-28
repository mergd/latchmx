import { afterEach, beforeEach, expect, mock, test } from 'bun:test';

let active;
const mounted = [];
class Hooks {
  constructor(component, props) { this.component = component; this.props = props; this.slots = []; mounted.push(this); }
  render() {
    this.cursor = 0;
    this.effects = [];
    active = this;
    this.result = this.component(this.props);
    active = null;
    for (const run of this.effects) run();
    return this.result;
  }
  async settle() {
    for (let i = 0; i < 30; i++) { this.render(); await Promise.resolve(); }
    return this.result;
  }
  close() { for (const slot of this.slots) slot?.cleanup?.(); }
}
function same(left, right) { return left && right && left.length === right.length && left.every((value, i) => Object.is(value, right[i])); }
const jsx = (type, props, key) => ({ type, props, key });
mock.module('react/jsx-runtime', () => ({ jsx, jsxs: jsx }));
mock.module('react/jsx-dev-runtime', () => ({ jsxDEV: jsx }));
function memo(factory, deps) {
  const runner = active;
  const i = runner.cursor++;
  if (!runner.slots[i] || !same(runner.slots[i].deps, deps)) runner.slots[i] = { deps, value: factory() };
  return runner.slots[i].value;
}
mock.module('react', () => ({
  createContext: () => ({ Provider: 'Provider' }),
  useContext: () => null,
  useState(initial) {
    const runner = active;
    const i = runner.cursor++;
    if (!runner.slots[i]) runner.slots[i] = { value: typeof initial === 'function' ? initial() : initial };
    return [runner.slots[i].value, value => { runner.slots[i].value = typeof value === 'function' ? value(runner.slots[i].value) : value; }];
  },
  useRef: value => memo(() => ({ current: value }), []),
  useMemo: memo,
  useCallback: (value, deps) => memo(() => value, deps),
  useEffect(effect, deps) {
    const runner = active;
    const i = runner.cursor++;
    const previous = runner.slots[i];
    if (!previous || !same(previous.deps, deps)) {
      runner.effects.push(() => {
        previous?.cleanup?.();
        runner.slots[i] = { deps, cleanup: effect() };
      });
    }
  },
}));

let path = '/';
globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
const platform = { OS: 'ios' };
const calls = [];
const data = new Map();
const reads = [];
const writes = [];
const realAccount = { id: 'real-owner', kind: 'resident', name: 'Resident', email: 'resident@example.com', buildingName: 'Real building', createdAt: 1 };
const realDoor = { id: 'ap-real', remoteId: 1, buildingId: 123, buildingName: 'Real building', tenantId: 123, kind: 'access_point', name: 'Real door', heldOpen: false, disabled: false, hours: [] };
const record = name => async (...args) => { calls.push([name, ...args]); };
mock.module('react-native', () => ({ Platform: platform, AppState: { addEventListener: () => ({ remove() {} }) } }));
mock.module('expo-router', () => ({ usePathname: () => path, router: { replace: value => { path = value; } } }));
mock.module('expo-crypto', () => ({ randomUUID: () => 'session-test' }));
mock.module('expo-splash-screen', () => ({ hideAsync: async () => {} }));
mock.module('expo-linking', () => ({ getInitialURL: async () => null, addEventListener: () => ({ remove() {} }) }));
mock.module('../src/lib/storage', () => ({
  storageGet: async key => { reads.push(key); return data.get(key) ?? null; },
  storageSet: async (key, value) => { writes.push(key); data.set(key, value); },
  storageRemove: async key => { writes.push(key); data.delete(key); },
}));
mock.module('../src/lib/account', () => ({
  loadAccount: async () => { calls.push(['loadAccount']); return realAccount; },
  persistAccount: record('persistAccount'),
  residentFromProfile: () => realAccount,
  guestFromInvite: () => realAccount,
}));
mock.module('../src/lib/analytics', () => ({ capture: record('capture'), resetAnalytics: record('resetAnalytics') }));
mock.module('../src/lib/config', () => ({ bmxConfig: { redirectUri: 'latch://oauth' }, hasBmxCredentials: () => true }));
mock.module('../src/lib/bmx-api', () => ({
  authorizationUrl: () => 'https://example.com/login',
  authorizationCodeFromUrl: () => null,
  extractAuthorizationCode: code => code,
  exchangeAuthorizationCode: record('exchangeAuthorizationCode'),
  refreshAccessToken: record('refreshAccessToken'),
  releaseDoor: record('releaseDoor'),
  fetchDoors: async () => { calls.push(['fetchDoors']); return { doors: [realDoor], account: realAccount }; },
}));
mock.module('../src/lib/keys', () => ({
  createKey: record('createKey'), listKeys: record('listKeys'), revokeKey: record('revokeKey'),
  fetchGuestSession: async () => { calls.push(['fetchGuestSession']); throw new Error('Test guest'); },
  guestUnlock: record('guestUnlock'), pingGuestSession: record('pingGuestSession'),
  isDeadKeyError: error => /this key is dead/i.test(error.message),
}));

const { SessionProvider } = await import('../src/lib/session');
const { mockDoors } = await import('../src/lib/mock-building');
const input = { ttl: '1h', label: 'Party later today', note: 'Meet in the lobby.', inviterName: 'Alex Rivera', contact: 'alex@example.com' };

beforeEach(() => {
  path = '/';
  platform.OS = 'ios';
  data.clear(); reads.length = 0; writes.length = 0; calls.length = 0;
  data.set('latch.tokens', JSON.stringify({ accessToken: 'resident-token', refreshToken: 'resident-refresh', expiresAt: Date.now() + 600_000 }));
  data.set('latch.layout', JSON.stringify({ groupOrder: ['real-group'], doorOrder: {} }));
  data.set('latch.hidden', JSON.stringify({ 'ap-real': true }));
  data.set('latch.demo.enabled', 'true');
});
afterEach(() => {
  for (const runner of mounted.splice(0)) runner.close();
  delete globalThis.window;
});

async function mount() {
  const wrapper = new Hooks(SessionProvider, { children: null });
  const child = await wrapper.settle();
  const state = new Hooks(child.type, child.props);
  await state.settle();
  return { wrapper, state, session: () => state.result.props.value };
}

for (const os of ['ios', 'android', 'web']) {
  test(`${os}: demo actions, guest preview and exit never use production credentials or APIs`, async () => {
    platform.OS = os;
    const realBefore = data.get('latch.tokens');
    const { wrapper, state, session } = await mount();
    expect(session().isDemo).toBe(true);
    expect(session().mode).toBe('signed_in');
    expect(session().doors).toHaveLength(6);
    await session().unlock(mockDoors[0]);
    await session().refreshDoors();
    session().hideDoor(mockDoors[1]);
    session().reorderGroups(['garage', 'entrance']);
    await state.settle();
    expect(session().openUntilByDoorId[mockDoors[0].id]).toBeGreaterThan(Date.now());
    const invite = await session().createKey(input);
    expect(invite.doorCount).toBe(5);
    expect((await session().listKeys())[0].url).toBe(invite.url);
    path = `/k/${invite.id}`;
    await state.settle();
    expect(session().mode).toBe('guest');
    expect(session().guestInvite.note).toBe(input.note);
    expect(session().doors).toHaveLength(5);
    await session().unlock(mockDoors[0]);
    await expect(session().createKey(input)).rejects.toThrow('Return to the demo');
    path = '/keys';
    await state.settle();
    expect(session().mode).toBe('signed_in');
    await session().revokeKey(invite.id);
    path = `/k/${invite.id}`;
    await state.settle();
    expect(session().bootError).toBe('This key is dead.');
    path = '/';
    await state.settle();
    session().resetLayout();
    await session().signOut();
    await wrapper.settle();
    expect(wrapper.result.props.demo).toBe(false);
    expect(calls).toEqual([]);
    expect(reads.every(key => key.startsWith('latch.demo.'))).toBe(true);
    expect(writes.every(key => key.startsWith('latch.demo.'))).toBe(true);
    expect(data.get('latch.tokens')).toBe(realBefore);
    expect(JSON.parse(data.get('latch.hidden'))).toEqual({ 'ap-real': true });
  });
}

test('unknown demo deep link never falls back to production guest APIs', async () => {
  data.delete('latch.demo.enabled');
  path = '/k/demo.missing';
  const { session } = await mount();
  expect(session().isDemo).toBe(true);
  expect(session().bootError).toContain('only available on the device');
  expect(calls).toEqual([]);
});

test('normal resident sessions still load real doors and use the real unlock path', async () => {
  data.delete('latch.demo.enabled');
  const { session } = await mount();
  expect(session().isDemo).toBe(false);
  expect(session().mode).toBe('signed_in');
  expect(session().doors).toEqual([realDoor]);
  await session().unlock(realDoor);
  expect(calls.some(call => call[0] === 'releaseDoor' && call[1] === 'resident-token')).toBe(true);
  expect(reads).toContain('latch.tokens');
});

test('real guest links override a saved demo preference', async () => {
  path = '/k/real-guest-secret';
  const { session } = await mount();
  expect(session().isDemo).toBe(false);
  expect(calls.some(call => call[0] === 'fetchGuestSession')).toBe(true);
});

test('returning to Keys uses the current router path, not the previous browser URL', async () => {
  platform.OS = 'web';
  path = '/keys';
  globalThis.window = { location: { pathname: '/k/demo.previous', origin: 'http://localhost:8091' } };
  const { session } = await mount();
  expect(session().mode).toBe('signed_in');
  expect(session().bootError).toBeNull();
  expect(session().doors).toHaveLength(6);
  expect(calls).toEqual([]);
});
