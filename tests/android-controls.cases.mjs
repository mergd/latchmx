import { beforeEach, expect, mock, test } from "bun:test";
import * as React from "react";

const absoluteFill = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const platform = { OS: "android" };
const dismissKeyboard = mock(() => {});
let stateIndex = 0;
let stateOverrides = {};
mock.module("react", () => ({
  ...React,
  useState: (initial) => [stateOverrides[stateIndex++] ?? initial, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useRef: (current) => ({ current }),
}));
mock.module("react-native", () => ({
  StyleSheet: { create: (styles) => styles, absoluteFill, hairlineWidth: 1 },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  Modal: "Modal",
  Platform: platform,
  Keyboard: { dismiss: dismissKeyboard },
}));
mock.module("@react-native-menu/menu", () => ({ MenuView: "MenuView" }));
mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16 }),
}));
mock.module("react-native-gesture-handler", () => ({
  Pressable: "GesturePressable",
}));
mock.module("react-native-gesture-handler/ReanimatedSwipeable", () => ({
  default: "Swipeable",
}));
mock.module("react-native-reanimated", () => ({
  default: { View: "AnimatedView", Text: "AnimatedText" },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value) => ({ value }),
  interpolate: () => 1,
  Easing: {},
  withRepeat: () => {},
  withTiming: () => {},
}));
mock.module("phosphor-react-native", () => ({
  CaretDownIcon: "Caret",
  CheckCircleIcon: "CheckCircle",
  LockSimpleOpenIcon: "Lock",
  XIcon: "X",
}));
mock.module("react-native-webview", () => ({ WebView: "WebView" }));
for (const [path, name] of [
  ["arrange-handle", "ArrangeHandle"],
  ["hours-dialog", "HoursDialog"],
  ["timer-circle", "TimerCircle"],
  ["flap-loader", "FlapLoader"],
])
  mock.module(`../src/components/${path}`, () => ({ [name]: name }));
mock.module("../src/lib/haptics", () => ({
  hapticImpact: () => {},
  hapticSuccess: () => {},
  hapticError: () => {},
}));
mock.module("../src/lib/analytics", () => ({ capture: () => {} }));
mock.module("../src/lib/bmx-api", () => ({
  authorizationCodeFromUrl: () => null,
}));
const copy = {
  "invite.title": "Invite",
  "invite.forLabel": "Who or what is it for?",
  "invite.forPlaceholder": "Party later today or Jane Smith",
  "invite.noteLabel": "Anything they should know? (optional)",
  "invite.notePlaceholder": "Come up to the rooftop when you arrive.",
  "invite.nameLabel": "Your name",
  "invite.contactLabel": "Your phone or email",
  "invite.howLong": "How long",
  "invite.howLongValue": "How long, %{label}",
  "invite.inviting": "Inviting…",
  "invite.hour1": "1 hour",
  "invite.hour1Hint": "For someone on the way",
  "invite.tonight": "Tonight",
  "invite.tonightHint": "Dies at midnight",
  "invite.tonightHintPacific": "Dies at midnight Pacific",
  "invite.hours24": "24 hours",
  "invite.hours24Hint": "Overnight, then gone",
  "common.hide": "Hide",
  "common.cancel": "Cancel",
};
const translate = (key, options = {}) =>
  Object.entries(options).reduce(
    (value, [name, part]) => value.replaceAll(`%{${name}}`, String(part)),
    copy[key] ?? key,
  );
mock.module("../src/lib/i18n", () => ({
  t: translate,
  activeLocale: () => "en",
  localeTag: () => "en-US",
  setActiveLocale: () => {},
  localizeError: (message) => message,
  errorText: (error, fallback) =>
    error instanceof Error ? error.message : fallback,
  displayBuildingName: (name) => name,
  displayInviteLabel: (label) => label,
  isKeyDeadCopy: (value) => /this key is dead/i.test(value),
  isSessionExpiredCopy: (value) => /session expired/i.test(value),
  formatLocaleDate: (value, options) =>
    new Date(value).toLocaleDateString("en-US", options),
  formatLocaleTime: (value, options) =>
    new Date(value).toLocaleTimeString("en-US", options),
}));
mock.module("../src/lib/i18n/context", () => ({
  useI18n: () => ({
    t: translate,
    locale: "en",
    preference: "system",
    setPreference: () => {},
  }),
}));

const { InviteDialog } = await import("../src/components/invite-dialog");
const { DoorRow } = await import("../src/components/door-button");
const { AuthLoginDrawer } = await import("../src/components/auth-login-drawer");
const { NearbyDoorSuggestion } = await import("../src/components/nearby-door-suggestion");
const { HomeSkeleton } = await import("../src/components/skeleton");
const { color } = await import("../src/lib/theme");

const nodes = (node) =>
  !node || typeof node !== "object"
    ? []
    : [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
const dialog = () =>
  InviteDialog({
    visible: true,
    busy: false,
    error: null,
    defaultName: "Alex Rivera",
    defaultContact: "alex@example.test",
    onClose() {},
    onCreate() {},
  });
const duration = (overrides = {}) => {
  const field = nodes(dialog()).find((node) => typeof node.type === "function");
  return field.type({ ...field.props, ...overrides });
};

beforeEach(() => {
  stateIndex = 0;
  stateOverrides = {};
  platform.OS = "android";
  dismissKeyboard.mockClear();
});

test("invite label asks for a person or occasion without prefilling the example", () => {
  const content = nodes(dialog());
  const label = content.find((node) => node.type === "TextInput");
  expect(label.props.accessibilityLabel).toBe("Who or what is it for?");
  expect(label.props.placeholder).toBe("Party later today or Jane Smith");
  expect(label.props.value).toBe("");
  expect(
    content.some(
      (node) => node.type === "Text" && node.props.children === "Who or what is it for?",
    ),
  ).toBe(true);
});

for (const os of ["ios", "android", "web"]) {
  test(`${os} invite fields have example placeholders and persistent labels`, () => {
    platform.OS = os;
    const content = nodes(dialog());
    const inputs = content.filter((node) => node.type === "TextInput");
    expect(inputs.map((node) => node.props.placeholder)).toEqual([
      "Party later today or Jane Smith",
      "Come up to the rooftop when you arrive.",
      "Alex Rivera",
      "alex@example.com",
    ]);
    expect(inputs.map((node) => node.props.accessibilityLabel)).toEqual([
      "Who or what is it for?",
      "Anything they should know? (optional)",
      "Your name",
      "Your phone or email",
    ]);
    for (const input of inputs) {
      expect(
        content.some(
          (node) =>
            node.type === "Text" &&
            node.props.children === input.props.accessibilityLabel,
        ),
      ).toBe(true);
    }
    expect(inputs.map((node) => node.props.value)).toEqual([
      "",
      "",
      "Alex Rivera",
      "alex@example.test",
    ]);
    expect(inputs[1].props.multiline).toBe(true);
    expect(inputs[1].props.maxLength).toBe(240);
  });
}

test("Android duration choices use app colors and preserve each TTL", () => {
  const onChange = mock(() => {});
  const onOpenChange = mock(() => {});
  const field = duration({
    open: true,
    value: "tonight",
    onChange,
    onOpenChange,
  });
  const choices = nodes(field).filter(
    (node) => node.props.accessibilityRole === "radio",
  );
  expect(choices.map((node) => node.props.accessibilityLabel)).toEqual([
    "1 hour",
    "Tonight",
    "24 hours",
  ]);
  expect(choices.map((node) => node.props.accessibilityState.checked)).toEqual([
    false,
    true,
    false,
  ]);
  for (const choice of choices) {
    expect(choice.props.children[0].props.style.color).toBe(color.text);
    choice.props.onPress();
  }
  expect(onChange.mock.calls.map(([ttl]) => ttl)).toEqual([
    "1h",
    "tonight",
    "24h",
  ]);
  expect(onOpenChange.mock.calls).toEqual([[false], [false], [false]]);
  const menu = field.props.children[1];
  expect(menu.props.style.backgroundColor).toBe(color.well);
  expect(menu.props.style.position).toBeUndefined();
});

test("opening duration dismisses the keyboard and busy choices are disabled", () => {
  const onOpenChange = mock(() => {});
  const field = duration({ onOpenChange });
  field.props.children[0].props.onPress();
  expect(dismissKeyboard).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenCalledWith(true);
  stateIndex = 0;
  const busy = duration({ open: true, disabled: true });
  expect(
    nodes(busy)
      .filter((node) => node.type === "Pressable")
      .every((node) => node.props.disabled),
  ).toBe(true);
});

test("iOS opens an anchored native menu with selection state and TTL mapping", () => {
  platform.OS = "ios";
  const onChange = mock(() => {});
  const onOpenChange = mock(() => {});
  const field = duration({ onChange, onOpenChange, value: "tonight" });
  const menu = field.props.children;
  expect(menu.type).toBe("MenuView");
  expect(menu.props.themeVariant).toBe("dark");
  expect(menu.props.shouldOpenOnLongPress).toBe(false);
  expect(menu.props.actions.map(({ title }) => title)).toEqual([
    "1 hour",
    "Tonight",
    "24 hours",
  ]);
  expect(menu.props.actions.map(({ state }) => state)).toEqual([
    "off",
    "on",
    "off",
  ]);
  menu.props.onOpenMenu();
  menu.props.onCloseMenu();
  expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  expect(menu.props.children.props.accessibilityRole).toBe("button");
  ["1h", "tonight", "24h"].forEach((event) =>
    menu.props.onPressAction({ nativeEvent: { event } }),
  );
  expect(onChange.mock.calls.map(([ttl]) => ttl)).toEqual([
    "1h",
    "tonight",
    "24h",
  ]);
});

test("iOS native dropdown cannot change duration while an invite is being created", () => {
  platform.OS = "ios";
  const onChange = mock(() => {});
  const field = duration({ onChange, disabled: true });
  expect(field.props.pointerEvents).toBe("none");
  const menu = field.props.children;
  expect(
    menu.props.actions.every(({ attributes }) => attributes.disabled),
  ).toBe(true);
  menu.props.onPressAction({ nativeEvent: { event: "24h" } });
  expect(onChange).not.toHaveBeenCalled();
});

test("web keeps the duration choices inside the scrollable card", () => {
  platform.OS = "web";
  const onChange = mock(() => {});
  const field = duration({ open: true, onChange });
  const choices = nodes(field).filter(
    (node) => node.props.accessibilityRole === "radio",
  );
  choices[2].props.onPress();
  expect(onChange).toHaveBeenCalledWith("24h");
  expect(field.props.children[1].props.style.position).toBeUndefined();
  stateIndex = 0;
  const backdrop = dialog().props.children;
  expect(backdrop.props.style[1].justifyContent).toBe("center");
});

test("keyboard layout bounds the card and scrolls fields without moving actions", () => {
  stateOverrides = { 7: 300 };
  const root = dialog();
  const backdrop = root.props.children;
  expect(backdrop.props.style.at(-1)).toEqual({
    paddingTop: 36,
    paddingBottom: 312,
  });
  const card = backdrop.props.children[1];
  expect(card.props.style).toMatchObject({ maxHeight: "100%", flexShrink: 1 });
  const fields = card.props.children[1];
  expect(fields.type).toBe("ScrollView");
  expect(fields.props.keyboardShouldPersistTaps).toBe("handled");
  expect(
    nodes(fields).filter((node) => node.type === "TextInput"),
  ).toHaveLength(4);
  expect(card.props.children[0].props.children).toBe("Invite");
  expect(
    nodes(card.props.children[2]).some(
      (node) => node.props.children === "Invite",
    ),
  ).toBe(true);
});

test("iOS keeps the menu anchor still when UIKit dismisses the keyboard", () => {
  platform.OS = "ios";
  stateOverrides = { 6: true, 7: 0, 8: 300 };
  expect(dialog().props.children.props.style.at(-1).paddingBottom).toBe(312);
  stateIndex = 0;
  stateOverrides = { 6: false, 7: 0, 8: 300 };
  expect(dialog().props.children.props.style.at(-1).paddingBottom).toBe(28);
});

test("swipe action uses gesture-aware touch handling and passes the exact door", () => {
  const door = {
    id: "ap-214",
    name: "Resident Lounge",
    hours: [],
    disabled: false,
  };
  const onHide = mock(() => {});
  const row = DoorRow({
    door,
    arranging: false,
    last: true,
    openUntil: null,
    onHide,
    onUnlock: async () => {},
  });
  const swipe = nodes(row).find((node) => node.type === "Swipeable");
  const action = swipe.props.renderLeftActions({ value: 1 });
  const button = action.type(action.props).props.children;
  expect(button.type).toBe("GesturePressable");
  expect(button.props.accessibilityLabel).toBe("Hide");
  button.props.onPress();
  expect(onHide).toHaveBeenCalledWith(door);
});

test("auth only covers ButterflyMX after a code has been captured", () => {
  const auth = AuthLoginDrawer({
    visible: true,
    url: "https://example.test",
    onClose() {},
    onCapturedCode() {},
  });
  const scrim = auth.props.children.props.children[0];
  expect(scrim.props.style).toMatchObject(absoluteFill);
  expect(nodes(auth).find(
    (node) => node.props.pointerEvents === "none",
  )).toBeUndefined();
  const busyAuth = AuthLoginDrawer({
    visible: true,
    busy: true,
    url: "https://example.test",
    onClose() {},
    onCapturedCode() {},
  });
  const loading = nodes(busyAuth).find(
    (node) => node.props.pointerEvents === "none",
  );
  expect(loading.props.style).toMatchObject(absoluteFill);
});

test("nearby Bluetooth prompt has a distinct Enable button", () => {
  const prompt = NearbyDoorSuggestion({
    available: true,
    enabled: false,
    matches: [],
    openUntilByDoorId: {},
    onEnable: async () => {},
    onUnlock: async () => {},
  });
  expect(nodes(prompt).some(
    (node) => node.type === "Text" && node.props.children === "common.enable",
  )).toBe(true);
});

test("skeleton fills its hero bounds", () => {
  const heroFill = HomeSkeleton().props.children[0].props.children[0];
  expect(heroFill.props.style).toMatchObject(absoluteFill);
});
