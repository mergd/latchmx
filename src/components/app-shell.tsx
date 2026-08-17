import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color } from '@/lib/theme';

type AppShellProps = {
  children: ReactNode;
  background?: ReactNode;
};

export function AppShell({ children, background }: AppShellProps) {
  return (
    <View style={styles.page}>
      <View style={styles.frame}>
        {background}
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {children}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.canvas,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: color.canvas,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
});
