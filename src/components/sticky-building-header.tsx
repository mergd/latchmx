import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { color, type } from '@/lib/theme';

type StickyBuildingHeaderProps = {
  title: string;
  section: string;
  sectionInk?: string;
  style: object;
  actions?: ReactNode;
  interactive?: boolean;
  topInset?: number;
};

export function StickyBuildingHeader({
  title,
  section,
  sectionInk = color.accent,
  style,
  actions,
  interactive = false,
  topInset = 0,
}: StickyBuildingHeaderProps) {
  return (
    <Animated.View
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[styles.wrap, { paddingTop: topInset + 6 }, style]}
    >
      <View style={styles.titleRow} pointerEvents="box-none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {actions}
      </View>
      {section.length > 0 ? (
        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: sectionInk }]}>{section}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: color.canvas,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  title: {
    flex: 1,
    color: color.text,
    fontFamily: type.title,
    fontSize: 22,
    lineHeight: 26,
  },
  sectionRow: {
    minHeight: 28,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  section: {
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
