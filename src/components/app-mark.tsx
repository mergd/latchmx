import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import icon from '../../assets/images/icon.png';

type AppMarkProps = {
  size?: number;
};

export function AppMark({ size = 128 }: AppMarkProps) {
  return (
    <Image
      source={icon}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]}
      contentFit="cover"
      accessibilityLabel="Latch"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    overflow: 'hidden',
  },
});
