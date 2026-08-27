import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { FlapLoader } from '@/components/flap-loader';
import { color } from '@/lib/theme';

function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.42);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.92, { duration: 980, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, pulse]}>{children}</Animated.View>;
}

function Bone({
  width,
  height,
  radius = 7,
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color.fill,
        },
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.home} accessibilityLabel="Loading your building">
      <View style={styles.hero}>
        <View style={styles.heroFill} />
        <FlapLoader size={72} />
      </View>
      <Pulse style={styles.identity}>
        <Bone width="52%" height={30} radius={9} />
        <Bone width="34%" height={13} radius={6} style={styles.kicker} />
      </Pulse>
      <Pulse style={styles.list}>
        <Bone width={76} height={11} radius={5} />
        <Bone width="68%" height={16} style={styles.door} />
        <Bone width="54%" height={16} style={styles.door} />
        <Bone width="62%" height={16} style={styles.door} />
        <Bone width={64} height={11} radius={5} style={styles.group} />
        <Bone width="58%" height={16} style={styles.door} />
        <Bone width="71%" height={16} style={styles.door} />
      </Pulse>
    </View>
  );
}

export function KeysSkeleton() {
  return (
    <View style={styles.keys} accessibilityLabel="Loading invites">
      <FlapLoader size={28} style={styles.keysMark} />
      <Pulse style={styles.keysList}>
        <KeyRow title="46%" hint="38%" />
        <KeyRow title="58%" hint="32%" />
        <KeyRow title="40%" hint="36%" />
      </Pulse>
    </View>
  );
}

function KeyRow({ title, hint }: { title: `${number}%`; hint: `${number}%` }) {
  return (
    <View style={styles.keyRow}>
      <Bone width={title} height={15} />
      <Bone width={hint} height={12} radius={6} style={styles.keyHint} />
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
  },
  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.surface,
  },
  identity: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  kicker: {
    marginTop: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  group: {
    marginTop: 28,
  },
  door: {
    marginTop: 18,
  },
  keys: {
    gap: 8,
  },
  keysMark: {
    marginTop: 4,
    marginBottom: 2,
  },
  keysList: {
    gap: 0,
  },
  keyRow: {
    minHeight: 72,
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  keyHint: {
    marginTop: 2,
  },
});
