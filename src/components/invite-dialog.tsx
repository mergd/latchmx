import { Picker } from "@react-native-picker/picker";
import { CaretDownIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, type } from "@/lib/theme";
import { KEY_TTLS, type KeyTtl } from "@/lib/types";

const DURATIONS: { ttl: KeyTtl; label: string; hint: string }[] = [
  { ttl: "1h", label: "1 hour", hint: "For someone on the way" },
  { ttl: "tonight", label: "Tonight", hint: "Dies at midnight" },
  { ttl: "24h", label: "24 hours", hint: "Overnight, then gone" },
];

type InviteDialogProps = {
  visible: boolean;
  busy: boolean;
  error: string | null;
  defaultName: string;
  defaultContact: string;
  onClose: () => void;
  onCreate: (input: {
    ttl: KeyTtl;
    label: string;
    note: string;
    inviterName: string;
    contact: string;
  }) => void;
};

export function InviteDialog({
  visible,
  busy,
  error,
  defaultName,
  defaultContact,
  onClose,
  onCreate,
}: InviteDialogProps) {
  const insets = useSafeAreaInsets();
  const [ttl, setTtl] = useState<KeyTtl>("1h");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [inviterName, setInviterName] = useState(defaultName);
  const [contact, setContact] = useState(defaultContact);
  const [durationOpen, setDurationOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setTtl("1h");
      setLabel("");
      setNote("");
      setInviterName(defaultName);
      setContact(defaultContact);
      setDurationOpen(false);
      setKeyboardInset(0);
      return;
    }
    setInviterName(defaultName);
    setContact(defaultContact);
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [defaultContact, defaultName, visible]);

  const lift = keyboardInset > 0 ? keyboardInset : insets.bottom;
  const centered = Platform.OS === "web" && keyboardInset === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onClose}
    >
      <View
        style={[
          styles.backdrop,
          centered ? styles.backdropCenter : styles.backdropSheet,
          { paddingBottom: centered ? 28 : lift + 12 },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onClose}
        />
        <View style={[styles.card, durationOpen ? styles.cardLift : null]}>
          <Text style={styles.title}>Invite</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Invite label"
            placeholderTextColor={color.muted}
            maxLength={60}
            returnKeyType="next"
            editable={!busy}
            accessibilityLabel="Invite label"
            style={styles.input}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={color.muted}
            maxLength={240}
            multiline
            editable={!busy}
            accessibilityLabel="Invite note"
            style={[styles.input, styles.noteInput]}
          />
          <TextInput
            value={inviterName}
            onChangeText={setInviterName}
            placeholder="Your name"
            placeholderTextColor={color.muted}
            maxLength={80}
            autoComplete="name"
            returnKeyType="next"
            editable={!busy}
            accessibilityLabel="Your name"
            style={styles.input}
          />
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="Phone or email"
            placeholderTextColor={color.muted}
            maxLength={80}
            autoComplete="tel"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            editable={!busy}
            accessibilityLabel="Phone or email"
            style={styles.input}
          />
          <DurationField
            value={ttl}
            disabled={busy}
            open={durationOpen}
            onOpenChange={setDurationOpen}
            onChange={setTtl}
          />
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => {
                onCreate({ ttl, label, note, inviterName, contact });
              }}
              style={({ pressed }) => [
                styles.btn,
                styles.submit,
                pressed ? styles.pressed : null,
                busy ? styles.busy : null,
              ]}
            >
              <Text style={styles.submitLabel}>
                {busy ? "Inviting…" : "Invite"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DurationField({
  value,
  disabled,
  open,
  onOpenChange,
  onChange,
}: {
  value: KeyTtl;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (ttl: KeyTtl) => void;
}) {
  const selected = durationFor(value);

  if (Platform.OS === "ios") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How long, ${selected.label}`}
        disabled={disabled}
        onPress={() => {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              title: "How long",
              options: ["Cancel", ...DURATIONS.map((item) => item.label)],
              cancelButtonIndex: 0,
              userInterfaceStyle: "dark",
            },
            (index) => {
              if (index === undefined || index === 0) {
                return;
              }
              const next = DURATIONS[index - 1];
              if (next !== undefined) {
                onChange(next.ttl);
              }
            },
          );
        }}
        style={({ pressed }) => [
          styles.dropdown,
          styles.dropdownTrigger,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.dropdownCopy}>
          <Text style={styles.dropdownLabel}>How long</Text>
          <Text style={styles.dropdownValue}>{selected.label}</Text>
        </View>
        <CaretDownIcon color={color.muted} size={18} weight="bold" />
      </Pressable>
    );
  }

  if (Platform.OS === "android") {
    return (
      <View style={styles.dropdown}>
        <Text style={styles.nativeLabel}>How long</Text>
        <Picker
          enabled={!disabled}
          selectedValue={value}
          onValueChange={(next) => {
            if (isKeyTtl(next)) {
              onChange(next);
            }
          }}
          mode="dialog"
          prompt="How long"
          dropdownIconColor={color.muted}
          style={styles.nativePicker}
        >
          {DURATIONS.map((item) => (
            <Picker.Item
              key={item.ttl}
              label={item.label}
              value={item.ttl}
              color={color.text}
            />
          ))}
        </Picker>
      </View>
    );
  }

  return (
    <View style={[styles.dropdown, open ? styles.dropdownOpen : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How long, ${selected.label}`}
        disabled={disabled}
        onPress={() => {
          onOpenChange(!open);
        }}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.dropdownCopy}>
          <Text style={styles.dropdownLabel}>How long</Text>
          <Text style={styles.dropdownValue}>{selected.label}</Text>
        </View>
        <CaretDownIcon color={color.muted} size={18} weight="bold" />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {DURATIONS.map((item) => (
            <Pressable
              key={item.ttl}
              onPress={() => {
                onChange(item.ttl);
                onOpenChange(false);
              }}
              style={({ pressed }) => [
                styles.dropdownOption,
                item.ttl === value ? styles.dropdownOptionOn : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.dropdownValue}>{item.label}</Text>
              <Text style={styles.dropdownHint}>{item.hint}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function isKeyTtl(value: unknown): value is KeyTtl {
  return (
    typeof value === "string" && (KEY_TTLS as readonly string[]).includes(value)
  );
}

function durationFor(ttl: KeyTtl): {
  ttl: KeyTtl;
  label: string;
  hint: string;
} {
  switch (ttl) {
    case "1h":
      return { ttl: "1h", label: "1 hour", hint: "For someone on the way" };
    case "tonight":
      return {
        ttl: "tonight",
        label: "Tonight",
        hint: "Dies at midnight Pacific",
      };
    case "24h":
      return { ttl: "24h", label: "24 hours", hint: "Overnight, then gone" };
    default: {
      const _never: never = ttl;
      return _never;
    }
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    paddingHorizontal: 20,
  },
  backdropCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  backdropSheet: {
    justifyContent: "flex-end",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: color.surface,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 8,
    overflow: "visible",
  },
  cardLift: {
    zIndex: 4,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 26,
    lineHeight: 30,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: color.fill,
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  dropdown: {
    position: "relative",
    zIndex: 1,
    borderRadius: 14,
    backgroundColor: color.fill,
  },
  dropdownOpen: {
    zIndex: 6,
  },
  menu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: color.well,
    overflow: "hidden",
    zIndex: 7,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 12,
      },
      default: {
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
      },
    }),
  },
  nativeLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  nativePicker: {
    color: color.text,
    marginHorizontal: 2,
  },
  dropdownTrigger: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    cursor: "pointer",
  },
  dropdownCopy: {
    flex: 1,
    gap: 2,
  },
  dropdownLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
  },
  dropdownValue: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  dropdownHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    gap: 2,
    cursor: "pointer",
  },
  dropdownOptionOn: {
    backgroundColor: color.fillOk,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 6,
  },
  btn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  submit: {
    backgroundColor: color.accent,
  },
  busy: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.78,
  },
  cancelLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
  submitLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 15,
  },
});
