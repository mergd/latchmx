import { ChevronDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { DragHandle, DropTarget } from '@/components/drag-handle';
import type { DragPayload } from '@/lib/drag';
import { color, type } from '@/lib/theme';

type DoorAccordionProps = {
  groupId: string;
  title: string;
  count: number;
  defaultOpen?: boolean;
  arranging?: boolean;
  onDrop: (payload: DragPayload) => void;
  onNativeShift?: (dir: -1 | 1) => void;
  children: ReactNode;
};

export function DoorAccordion({
  groupId,
  title,
  count,
  defaultOpen = false,
  arranging = false,
  onDrop,
  onNativeShift,
  children,
}: DoorAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const progress = useSharedValue(defaultOpen ? 1 : 0);
  const expanded = arranging || open;

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <DropTarget enabled={arranging} onDrop={onDrop}>
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <DragHandle
            enabled={arranging}
            payload={{ kind: 'group', id: groupId }}
            onNativeShift={onNativeShift}
          />
          <Pressable
            style={styles.header}
            onPress={() => {
              if (arranging) {
                return;
              }
              const next = !open;
              setOpen(next);
              progress.value = withTiming(next ? 1 : 0, { duration: 180 });
            }}
          >
            <Text style={styles.title}>{title}</Text>
            <View style={styles.meta}>
              <Text style={styles.count}>{count}</Text>
              {arranging ? null : (
                <Animated.View style={chevronStyle}>
                  <ChevronDown color={color.muted} size={16} strokeWidth={2} />
                </Animated.View>
              )}
            </View>
          </Pressable>
        </View>
        {expanded ? <View style={styles.body}>{children}</View> : null}
      </View>
    </DropTarget>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  body: {
    gap: 0,
  },
});
