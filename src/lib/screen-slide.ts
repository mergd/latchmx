import { Animated } from 'react-native';

import type {
  StackCardInterpolationProps,
  TransitionPreset,
} from 'expo-router/build/react-navigation/stack';

const { multiply } = Animated;

const spring = {
  animation: 'spring' as const,
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 10,
    restSpeedThreshold: 10,
  },
};

function forSlideInOut({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) {
  const incoming = multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
      extrapolate: 'clamp',
    }),
    inverted,
  );
  const outgoing = next
    ? multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -screen.width],
          extrapolate: 'clamp',
        }),
        inverted,
      )
    : 0;

  return {
    cardStyle: {
      transform: [{ translateX: incoming }, { translateX: outgoing }],
    },
  };
}

export const slideInOut: TransitionPreset = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: spring,
    close: spring,
  },
  cardStyleInterpolator: forSlideInOut,
  headerStyleInterpolator: () => ({}),
};
