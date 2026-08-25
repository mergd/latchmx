import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { color, type } from '@/lib/theme';

export function DeadKey({ message }: { message: string }) {
  return (
    <AppShell>
      <View style={styles.wrap}>
        <Text style={styles.title}>This key is dead</Text>
        <Text style={styles.body}>{message}</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 34,
    lineHeight: 38,
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 24,
  },
});
