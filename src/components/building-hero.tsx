import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { color } from '@/lib/theme';

const HERO_H = 200;

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
        contentPosition="center"
        cachePolicy="memory-disk"
        priority="high"
        transition={200}
        recyclingKey={uri}
        accessibilityLabel="Building"
      />
      <LinearGradient
        colors={[
          'rgba(14, 14, 13, 0.08)',
          'rgba(14, 14, 13, 0.2)',
          color.canvas,
        ]}
        locations={[0, 0.58, 1]}
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
    width: '100%',
    height: HERO_H,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
