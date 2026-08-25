import { StyleSheet, Text, View } from 'react-native';

import { expiryCopy } from '@/lib/expiry';
import { color, type } from '@/lib/theme';

export function ExpiryChip({
  expiresAt,
  now,
}: {
  expiresAt: number | null;
  now: number;
}) {
  if (expiresAt === null) {
    return null;
  }
  const copy = expiryCopy(expiresAt, now);
  const label = copy.urgent && !copy.dead ? copy.remaining : copy.until;
  return (
    <View
      style={[styles.chip, copy.urgent ? styles.chipUrgent : null]}
      accessibilityRole="text"
      accessibilityLabel={copy.dead ? 'This key expired' : `${copy.until}. ${copy.remaining}`}
    >
      <Text style={[styles.label, copy.urgent ? styles.labelUrgent : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: color.fill,
    justifyContent: 'center',
  },
  chipUrgent: {
    backgroundColor: 'rgba(208, 130, 122, 0.18)',
  },
  label: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 13,
  },
  labelUrgent: {
    color: color.bad,
  },
});
