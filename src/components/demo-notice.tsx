import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';

export function DemoNotice() {
  const { isDemo, signOut, startDemo } = useSession();
  const path = usePathname();
  if (!isDemo || path === '/privacy' || path === '/delete-data') return null;
  const guest = path.startsWith('/k/');
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.row}>
        <Text style={styles.text}>Demo only. No real doors open.</Text>
        {guest ? (
          <Pressable accessibilityRole="button" onPress={() => { void startDemo().then(() => router.replace('/keys')); }} style={styles.action}>
            <Text style={styles.link}>Back to invites</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => { void signOut(); }} style={styles.action}>
            <Text style={styles.link}>Exit demo</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: color.canvas, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  row: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, color: color.muted, fontFamily: type.body, fontSize: 12 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: color.accent, fontFamily: type.body, fontSize: 13 },
});
