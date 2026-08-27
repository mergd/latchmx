import { Image } from 'expo-image';
import { type ImageStyle, type StyleProp } from 'react-native';

import flap from '../../assets/images/flap.png';

type FlapLoaderProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function FlapLoader({ size = 56, style }: FlapLoaderProps) {
  return (
    <Image
      source={flap}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="Loading"
    />
  );
}
