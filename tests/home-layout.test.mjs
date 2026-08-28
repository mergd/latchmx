import { beforeEach, expect, mock, test } from 'bun:test';

const absoluteFill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
const platform = { OS: 'ios' };
mock.module('react-native', () => ({
  Platform: platform,
  StyleSheet: { create: (styles) => styles, absoluteFill, hairlineWidth: 1 },
  View: 'View',
  Text: 'Text',
}));
mock.module('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
mock.module('react-native-reanimated', () => ({ default: { View: 'AnimatedView' } }));
mock.module('expo-image', () => ({ Image: 'Image' }));
mock.module('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

const { AppShell } = await import('../src/components/app-shell');
const { BuildingHero } = await import('../src/components/building-hero');
const { StickyBuildingHeader } = await import('../src/components/sticky-building-header');
const { color } = await import('../src/lib/theme');

beforeEach(() => {
  platform.OS = 'ios';
});

test('web adds bottom breathing room without changing native safe areas', () => {
  for (const os of ['web', 'ios', 'android']) {
    platform.OS = os;
    const shell = AppShell({ children: 'Home', edgeToEdge: true });
    const safe = shell.props.children.at(-1);
    expect(safe.props.style[1]).toEqual(os === 'web' ? { paddingBottom: 24 } : null);
    expect(safe.props.edges).toEqual(['bottom']);
  }
});

test('photo and fade fill the same hero bounds without absoluteFillObject', () => {
  const hero = BuildingHero({ uri: 'https://example.com/building.jpg' });
  const [image, gradient] = hero.props.children;
  expect(hero.props.style).toMatchObject(absoluteFill);
  expect(image.props.style).toEqual(absoluteFill);
  expect(gradient.props.style).toEqual(absoluteFill);
  expect(gradient.props.colors.at(-1)).toBe(color.canvas);
  expect(gradient.props.locations.at(-1)).toBe(1);
  expect(BuildingHero({})).toBeNull();
  expect(BuildingHero({ uri: '' })).toBeNull();
});

test('only edge-to-edge screens remove the top safe-area padding', () => {
  const normal = AppShell({ children: 'Account' });
  const home = AppShell({ children: 'Home', edgeToEdge: true });
  expect(normal.props.children.at(-1).props.edges).toEqual(['top', 'bottom']);
  expect(home.props.children.at(-1).props.edges).toEqual(['bottom']);
});

test('backgrounds fill the screen independently of safe-area content', () => {
  const shell = AppShell({ children: 'Sign in', background: 'Photo' });
  expect(shell.props.children[0].props.style).toMatchObject(absoluteFill);
});

test('pinned header keeps controls below native insets and preserves web spacing', () => {
  const props = { title: 'Solaire', section: 'Courtyard', style: {} };
  const native = StickyBuildingHeader({ ...props, topInset: 62, interactive: true });
  const web = StickyBuildingHeader(props);
  expect(native.props.style[1].paddingTop).toBe(68);
  expect(web.props.style[1].paddingTop).toBe(6);
  expect(native.props.pointerEvents).toBe('box-none');
  expect(web.props.pointerEvents).toBe('none');
});
