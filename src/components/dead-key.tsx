import { KeyRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { color, type } from '@/lib/theme';

export function DeadKey({ detail }: { detail?: string | null }) {
  const body =
    detail !== null &&
    detail !== undefined &&
    detail.trim().length > 0 &&
    !/this key is dead/i.test(detail)
      ? detail.trim()
      : null;

  return (
    <AppShell>
      <View style={styles.wrap}>
        <View style={styles.mark}>
          <KeyRound color={color.muted} size={36} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>This key is dead</Text>
        {body !== null ? <Text style={styles.body}>{body}</Text> : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
