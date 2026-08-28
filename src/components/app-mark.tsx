import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { APP_NAME } from '@/lib/title';

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
      accessibilityLabel={APP_NAME}
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    overflow: 'hidden',
  },
});
