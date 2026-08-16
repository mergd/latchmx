import { StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';
import type { SessionMode } from '@/lib/types';

export function StatusPill({ mode }: { mode: SessionMode }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, dotStyle(mode)]} />
      <Text style={styles.label}>{statusLabel(mode)}</Text>
    </View>
  );
}

function statusLabel(mode: SessionMode): string {
  switch (mode) {
    case 'loading':
      return 'loading';
    case 'demo':
      return 'demo';
    case 'signed_in':
      return 'live';
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

function dotStyle(mode: SessionMode) {
  switch (mode) {
    case 'loading':
      return styles.dotMuted;
    case 'demo':
      return styles.dotAccent;
    case 'signed_in':
      return styles.dotOk;
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotMuted: {
    backgroundColor: color.muted,
  },
  dotAccent: {
    backgroundColor: color.accent,
  },
  dotOk: {
    backgroundColor: color.ok,
  },
  label: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
});
