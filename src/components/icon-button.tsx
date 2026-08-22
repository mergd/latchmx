import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { color } from '@/lib/theme';

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function IconButton({ icon: Icon, label, active = false, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        active ? styles.btnActive : null,
        pressed ? styles.btnPressed : null,
      ]}
    >
      <Icon color={active ? color.onAccent : color.text} size={18} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 241, 236, 0.1)',
    cursor: 'pointer',
  },
  btnActive: {
    backgroundColor: color.accent,
  },
  btnPressed: {
    opacity: 0.78,
  },
});
