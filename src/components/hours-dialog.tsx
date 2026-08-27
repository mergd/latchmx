import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';

type HoursDialogProps = {
  visible: boolean;
  title: string;
  hint: string | null;
  lines: string[];
  onClose: () => void;
};

export function HoursDialog({
  visible,
  title,
  hint,
  lines,
  onClose,
}: HoursDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          {hint !== null ? <Text style={styles.hint}>{hint}</Text> : null}
          <View style={styles.lines}>
            {lines.map((line) => (
              <Text key={line} style={styles.line}>
                {line}
              </Text>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
            onPress={onClose}
            style={({ pressed }) => [styles.done, pressed ? styles.pressed : null]}
          >
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: color.surface,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 10,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 22,
    lineHeight: 26,
  },
  hint: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 15,
  },
  lines: {
    gap: 6,
    paddingTop: 2,
  },
  line: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 22,
  },
  done: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  doneLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.78,
  },
});
