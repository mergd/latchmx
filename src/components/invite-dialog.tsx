import { MenuView } from "@react-native-menu/menu";
import { CaretDownIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, type } from "@/lib/theme";
import { type KeyTtl } from "@/lib/types";

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
  const [menuKeyboardInset, setMenuKeyboardInset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setTtl("1h");
      setLabel("");
      setNote("");
      setInviterName(defaultName);
      setContact(defaultContact);
      setDurationOpen(false);
      setKeyboardInset(0);
      setMenuKeyboardInset(0);
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

  const activeKeyboardInset =
    Platform.OS === "ios" && durationOpen
      ? Math.max(keyboardInset, menuKeyboardInset)
      : keyboardInset;
  const lift = activeKeyboardInset > 0 ? activeKeyboardInset : insets.bottom;
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
          {
            paddingTop: insets.top + 12,
            paddingBottom: centered ? 28 : lift + 12,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onClose}
        />
        <View style={styles.card}>
          <Text style={styles.title}>Invite</Text>
          <ScrollView
            style={styles.fields}
            contentContainerStyle={styles.fieldContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.labeledField}>
              <Text style={styles.fieldLabel}>Who or what is it for?</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Party later today or Jane Smith"
                placeholderTextColor={color.muted}
                maxLength={60}
                returnKeyType="next"
                editable={!busy}
                accessibilityLabel="Who or what is it for?"
                style={styles.input}
              />
            </View>
            <View style={styles.labeledField}>
              <Text style={styles.fieldLabel}>
                Anything they should know? (optional)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Come up to the rooftop when you arrive."
                placeholderTextColor={color.muted}
                maxLength={240}
                multiline
                editable={!busy}
                accessibilityLabel="Anything they should know? (optional)"
                style={[styles.input, styles.noteInput]}
              />
            </View>
            <View style={styles.labeledField}>
              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput
                value={inviterName}
                onChangeText={setInviterName}
                placeholder="Alex Rivera"
                placeholderTextColor={color.muted}
                maxLength={80}
                autoComplete="name"
                returnKeyType="next"
                editable={!busy}
                accessibilityLabel="Your name"
                style={styles.input}
              />
            </View>
            <View style={styles.labeledField}>
              <Text style={styles.fieldLabel}>Your phone or email</Text>
              <TextInput
                value={contact}
                onChangeText={setContact}
                placeholder="alex@example.com"
                placeholderTextColor={color.muted}
                maxLength={80}
                autoComplete="tel"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                editable={!busy}
                accessibilityLabel="Your phone or email"
                style={styles.input}
              />
            </View>
            <DurationField
              value={ttl}
              disabled={busy}
              open={durationOpen}
              onOpenChange={(open) => {
                if (open) setMenuKeyboardInset(keyboardInset);
                setDurationOpen(open);
              }}
              onChange={setTtl}
            />
            {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
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
      <View pointerEvents={disabled ? "none" : "auto"} style={styles.dropdown}>
        <MenuView
          title="How long"
          themeVariant="dark"
          shouldOpenOnLongPress={false}
          onOpenMenu={() => onOpenChange(true)}
          onCloseMenu={() => onOpenChange(false)}
          actions={DURATIONS.map((item) => ({
            id: item.ttl,
            title: item.label,
            state: item.ttl === value ? "on" : "off",
            attributes: { disabled },
          }))}
          onPressAction={({ nativeEvent }) => {
            const next = DURATIONS.find(
              (item) => item.ttl === nativeEvent.event,
            );
            if (!disabled && next !== undefined) {
              onChange(next.ttl);
            }
          }}
        >
          <View
            accessibilityRole="button"
            accessibilityLabel={`How long, ${selected.label}`}
            accessibilityState={{ disabled }}
            style={styles.dropdownTrigger}
          >
            <View style={styles.dropdownCopy}>
              <Text style={styles.dropdownLabel}>How long</Text>
              <Text style={styles.dropdownValue}>{selected.label}</Text>
            </View>
            <CaretDownIcon color={color.muted} size={18} weight="bold" />
          </View>
        </MenuView>
      </View>
    );
  }

  return (
    <View style={styles.dropdown}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How long, ${selected.label}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
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
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ checked: item.ttl === value, disabled }}
              disabled={disabled}
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
    maxHeight: "100%",
    flexShrink: 1,
    borderRadius: 20,
    backgroundColor: color.surface,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 8,
  },
  fields: {
    flexShrink: 1,
  },
  fieldContent: {
    gap: 8,
  },
  labeledField: {
    gap: 6,
  },
  fieldLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    paddingHorizontal: 4,
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
  menu: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: color.well,
    overflow: "hidden",
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
