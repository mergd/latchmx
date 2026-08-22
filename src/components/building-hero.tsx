import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { color } from '@/lib/theme';

type BuildingHeroProps = {
  uri?: string;
};

export function BuildingHero({ uri }: BuildingHeroProps) {
  if (uri === undefined || uri.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        contentPosition="top"
        cachePolicy="disk"
        priority="low"
        transition={500}
        recyclingKey={uri}
        accessibilityLabel="Building"
      />
      <LinearGradient
        colors={[
          'rgba(14, 14, 13, 0.5)',
          'rgba(14, 14, 13, 0.22)',
          'rgba(14, 14, 13, 0.88)',
          color.canvas,
        ]}
        locations={[0, 0.28, 0.52, 0.74]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
