import { ChevronDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ArrangeHandle } from '@/components/arrange-handle';
import { color, type } from '@/lib/theme';

type DoorAccordionProps = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  arranging?: boolean;
  ink?: string;
  children: ReactNode;
};

export function DoorAccordion({
  title,
  count,
  defaultOpen = false,
  arranging = false,
  ink = color.accent,
  children,
}: DoorAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const progress = useSharedValue(defaultOpen ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <ArrangeHandle enabled={arranging} />
        <Pressable
          style={styles.header}
          onPress={() => {
            const next = !open;
            setOpen(next);
            progress.value = withTiming(next ? 1 : 0, { duration: 180 });
          }}
        >
          <Text style={[styles.title, { color: ink }]}>{title}</Text>
          <View style={styles.meta}>
            <Text style={styles.count}>{count}</Text>
            <Animated.View style={chevronStyle}>
              <ChevronDown color={color.muted} size={16} strokeWidth={1.75} />
            </Animated.View>
          </View>
        </Pressable>
      </View>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 8,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    cursor: 'pointer',
  },
  title: {
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
  },
  body: {
    paddingBottom: 8,
  },
});
