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
      {background}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
  safe: {
    flex: 1,
  },
});
