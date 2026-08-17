import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { hapticError, hapticImpact, hapticSuccess } from '@/lib/haptics';
import { color, type } from '@/lib/theme';
import type { Door, UnlockStatus } from '@/lib/types';

const TRACK = 56;
const KNOB = 44;
const INSET = 6;
const COMPLETE_AT = 0.78;

type DoorSliderProps = {
  door: Door;
  onUnlock: (door: Door) => Promise<void>;
  onCycleZone?: (door: Door) => void;
};

export function DoorSlider({ door, onUnlock, onCycleZone }: DoorSliderProps) {
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);

  const maxTravel = Math.max(trackWidth - KNOB - INSET * 2, 0);

  const finishUnlock = (doorToOpen: Door) => {
    setStatus('unlocking');
    void onUnlock(doorToOpen)
      .then(async () => {
        setStatus('open');
        await hapticSuccess();
        setTimeout(() => {
          translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
          progress.value = withSpring(0);
          setStatus('idle');
        }, 1100);
      })
      .catch(async () => {
        setStatus('error');
        await hapticError();
        translateX.value = withSpring(0, { damping: 16, stiffness: 260 });
        progress.value = withSpring(0);
        setTimeout(() => {
          setStatus('idle');
        }, 1400);
      });
  };

  const triggerComplete = () => {
    void hapticImpact();
    finishUnlock(door);
  };

  const gesture = Gesture.Pan()
    .enabled(status === 'idle' && maxTravel > 0)
    .onUpdate((event) => {
      const next = clamp(event.translationX, 0, maxTravel);
      translateX.value = next;
      progress.value = maxTravel === 0 ? 0 : next / maxTravel;
    })
    .onEnd(() => {
      if (progress.value >= COMPLETE_AT) {
        translateX.value = withSpring(maxTravel, { damping: 18, stiffness: 240 });
        progress.value = 1;
        runOnJS(triggerComplete)();
        return;
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      progress.value = withSpring(0);
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + KNOB + INSET,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [color.fill, color.fillOk],
    ),
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7], [1, 0.2]),
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <Pressable
      onLongPress={() => {
        onCycleZone?.(door);
      }}
      delayLongPress={380}
    >
      <View style={styles.track} onLayout={onTrackLayout}>
      <Animated.View style={[styles.fill, fillStyle]} />
      <Animated.View style={[styles.copy, copyStyle]} pointerEvents="none">
        <Text style={[styles.name, nameTone(status)]} numberOfLines={1}>
          {labelFor(door.name, status)}
        </Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.knob, knobStyle, knobTone(status)]}>
          {status === 'open' ? (
            <Check color={color.canvas} size={18} strokeWidth={2.4} />
          ) : null}
        </Animated.View>
      </GestureDetector>
      </View>
    </Pressable>
  );
}

function labelFor(name: string, status: UnlockStatus): string {
  switch (status) {
    case 'idle':
      return name;
    case 'unlocking':
      return name;
    case 'open':
      return name;
    case 'error':
      return 'Couldn’t open';
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

function nameTone(status: UnlockStatus) {
  switch (status) {
    case 'error':
      return styles.nameBad;
    case 'idle':
    case 'unlocking':
    case 'open':
      return styles.nameIdle;
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

function knobTone(status: UnlockStatus) {
  switch (status) {
    case 'open':
      return styles.knobOk;
    case 'error':
      return styles.knobBad;
    case 'idle':
    case 'unlocking':
      return styles.knobIdle;
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  track: {
    height: TRACK,
    borderRadius: 18,
    backgroundColor: color.well,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.line,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  copy: {
    position: 'absolute',
    left: KNOB + 18,
    right: 14,
  },
  name: {
    fontFamily: type.body,
    fontSize: 16,
  },
  nameIdle: {
    color: color.text,
  },
  nameBad: {
    color: color.bad,
  },
  knob: {
    position: 'absolute',
    left: INSET,
    height: KNOB,
    width: KNOB,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobIdle: {
    backgroundColor: color.knob,
  },
  knobOk: {
    backgroundColor: color.ok,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobBad: {
    backgroundColor: color.bad,
  },
});
