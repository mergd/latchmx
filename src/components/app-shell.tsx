import { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color } from '@/lib/theme';

type AppShellProps = {
  children: ReactNode;
  background?: ReactNode;
  edgeToEdge?: boolean;
};

export function AppShell({ children, background, edgeToEdge = false }: AppShellProps) {
  return (
    <View style={styles.page}>
      {background != null ? (
        <View style={styles.background} collapsable={false}>
          {background}
        </View>
      ) : null}
      <SafeAreaView
        style={[styles.safe, Platform.OS === 'web' ? styles.webSafe : null]}
        edges={edgeToEdge ? ['bottom'] : ['top', 'bottom']}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  background: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webSafe: {
    paddingBottom: 24,
  },
});
