import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed ? styles.btnPressed : null]}
              onPress={onCancel}
            >
              <Text style={styles.btnLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnConfirm,
                pressed ? styles.btnPressed : null,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.btnConfirmLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
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
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
  },
  btn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  btnConfirm: {
    backgroundColor: color.fillOk,
  },
  btnPressed: {
    opacity: 0.78,
  },
  btnLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
  },
  btnConfirmLabel: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 15,
  },
});
