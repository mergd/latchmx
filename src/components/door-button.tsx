import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { LockSimpleOpenIcon } from 'phosphor-react-native';

import { ArrangeHandle } from '@/components/arrange-handle';
import { HoursDialog } from '@/components/hours-dialog';
import { TimerCircle } from '@/components/timer-circle';
import { hoursStatus, scheduleLines } from '@/lib/door-hours';
import { hapticError, hapticImpact, hapticSuccess } from '@/lib/haptics';
import { color, type } from '@/lib/theme';
import { DOOR_OPEN_MS, type Door, type UnlockStatus } from '@/lib/types';

type DoorRowProps = {
  door: Door;
  arranging: boolean;
  last: boolean;
  openUntil: number | null;
  ink?: string;
  sortable?: boolean;
  onUnlock: (door: Door) => Promise<void>;
  onHide?: (door: Door) => void;
  onReveal?: (door: Door) => void;
};

export function DoorRow({
  door,
  arranging,
  last,
  openUntil,
  ink,
  sortable = true,
  onUnlock,
  onHide,
  onReveal,
}: DoorRowProps) {
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const [failLabel, setFailLabel] = useState('Couldn’t open');
  const [now, setNow] = useState(0);
  const [hoursOpen, setHoursOpen] = useState(false);
  const timedOpen = openUntil !== null && openUntil > now;
  const remaining = timedOpen && openUntil !== null ? openUntil - now : 0;
  const revealing = onReveal !== undefined;
  const closed = door.disabled && !revealing;
  const clock = now === 0 ? Date.now() : now;
  const statusHours = hoursStatus(
    door.hours,
    clock,
    door.timeZone ?? 'America/Los_Angeles',
    door.lockout ? 'lockout' : 'held_open',
  );
  const hoursHint =
    statusHours?.hint !== undefined && statusHours.hint.length > 0
      ? statusHours.hint
      : null;
  const propped =
    !revealing &&
    !closed &&
    (door.heldOpen || (!door.lockout && statusHours?.unlocked === true));
  const isOpen = door.heldOpen || timedOpen || propped;
  const busy = status === 'unlocking' || isOpen;
  const canSwipe = !arranging && !revealing && onHide !== undefined;
  const nameColor = revealing || closed ? color.muted : (ink ?? color.text);

  useEffect(() => {
    if (!timedOpen && door.hours.length === 0) {
      return;
    }
    const id = setInterval(
      () => {
        setNow(Date.now());
      },
      timedOpen ? 50 : 30_000,
    );
    return () => {
      clearInterval(id);
    };
  }, [door.hours.length, timedOpen]);

  const showHours = () => {
    if (door.hours.length === 0) {
      return;
    }
    void hapticImpact();
    setHoursOpen(true);
  };

  const onPress = () => {
    if (revealing) {
      void hapticImpact();
      onReveal(door);
      return;
    }
    if (closed) {
      showHours();
      return;
    }
    if (propped || arranging || busy || status !== 'idle') {
      return;
    }
    setStatus('unlocking');
    void hapticImpact();
    void onUnlock(door)
      .then(async () => {
        setStatus('idle');
        await hapticSuccess();
      })
      .catch(async (error) => {
        const expired =
          error instanceof Error && /session expired/i.test(error.message);
        setStatus('error');
        setFailLabel(expired ? 'Session expired' : 'Couldn’t open');
        await hapticError();
        setTimeout(() => {
          setStatus('idle');
          setFailLabel('Couldn’t open');
        }, expired ? 2800 : 1400);
      });
  };

  const canUnlock = !revealing && !closed && !propped && !arranging;
  const rowStyle = [
    styles.row,
    last ? styles.rowLast : null,
    isOpen ? styles.rowOpen : null,
    revealing ? styles.rowHidden : null,
    closed ? styles.rowClosed : null,
    canUnlock || revealing || closed ? styles.rowTap : null,
  ];

  const name = (
    <Text
      style={[
        styles.name,
        { color: nameColor },
        hoursHint !== null ? styles.nameTight : null,
      ]}
      numberOfLines={2}
    >
      {labelFor(door.name, status, isOpen, failLabel)}
    </Text>
  );

  const row = (
    <View style={rowStyle}>
      <ArrangeHandle enabled={arranging && sortable && !revealing} inset />
      <View style={styles.copy}>
        {canUnlock || revealing || closed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={
              revealing
                ? 'Show this door again'
                : closed
                  ? hoursHint === null
                    ? 'Closed right now'
                    : `Closed. ${hoursHint}`
                  : canSwipe
                    ? 'Swipe right, then tap Hide'
                    : undefined
            }
            onPress={onPress}
            style={({ pressed }) => (pressed ? styles.rowPressed : null)}
          >
            {name}
          </Pressable>
        ) : (
          name
        )}
        {hoursHint !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hoursHint}
            onPress={showHours}
            style={({ pressed }) => [
              styles.hoursHit,
              pressed ? styles.hoursPressed : null,
            ]}
          >
            <Text style={styles.hours}>{hoursHint}</Text>
          </Pressable>
        ) : null}
      </View>
      {timedOpen && !revealing ? (
        <TimerCircle progress={remaining / DOOR_OPEN_MS} />
      ) : propped ? (
        <Pressable
          accessibilityRole="image"
          accessibilityLabel="Open"
          disabled={door.hours.length === 0}
          onPress={showHours}
          style={({ pressed }) => [
            styles.lockHit,
            pressed && door.hours.length > 0 ? styles.hoursPressed : null,
          ]}
        >
          <LockSimpleOpenIcon color={color.muted} size={18} weight="regular" />
        </Pressable>
      ) : closed ? (
        <Text style={styles.open}>Closed</Text>
      ) : null}
    </View>
  );

  const dialog = (
    <HoursDialog
      visible={hoursOpen}
      title={door.name}
      hint={hoursHint}
      lines={scheduleLines(door.hours)}
      onClose={() => {
        setHoursOpen(false);
      }}
    />
  );

  if (!canSwipe) {
    return (
      <>
        {row}
        {dialog}
      </>
    );
  }

  return (
    <>
      <Swipeable
        overshootLeft={false}
        leftThreshold={40}
        childrenContainerStyle={styles.rowSurface}
        renderLeftActions={(progress) => (
          <HideAction
            progress={progress}
            onPress={() => {
              void hapticImpact();
              onHide(door);
            }}
          />
        )}
      >
        {row}
      </Swipeable>
      {dialog}
    </>
  );
}

function HideAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0.7, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-16, 0]) }],
  }));

  return (
    <View style={styles.hideAction}>
      <GesturePressable
        accessibilityRole="button"
        accessibilityLabel="Hide"
        onPress={onPress}
        style={styles.hideHit}
      >
        <Animated.Text style={[styles.hideActionLabel, labelStyle]}>
          Hide
        </Animated.Text>
      </GesturePressable>
    </View>
  );
}

function labelFor(
  name: string,
  status: UnlockStatus,
  isOpen: boolean,
  failLabel: string,
): string {
  switch (status) {
    case 'idle':
      return name;
    case 'unlocking':
      return 'Opening…';
    case 'open':
      return name;
    case 'error':
      return isOpen ? name : failLabel;
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

const styles = StyleSheet.create({
  rowSurface: {
    backgroundColor: color.canvas,
  },
  row: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: color.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
    gap: 8,
  },
  rowTap: {
    cursor: 'pointer',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowOpen: {
    backgroundColor: color.surface,
  },
  rowPressed: {
    backgroundColor: color.surface,
  },
  copy: {
    flex: 1,
    paddingRight: 0,
  },
  name: {
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 10,
  },
  nameTight: {
    paddingBottom: 0,
  },
  hoursHit: {
    alignSelf: 'flex-start',
    cursor: 'pointer',
  },
  hoursPressed: {
    opacity: 0.7,
  },
  hours: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 10,
    paddingTop: 2,
  },
  rowClosed: {
    opacity: 0.58,
  },
  rowHidden: {
    opacity: 0.72,
  },
  lockHit: {
    paddingHorizontal: 2,
    paddingVertical: 8,
    cursor: 'pointer',
  },
  open: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  hideAction: {
    width: 80,
    alignSelf: 'stretch',
    backgroundColor: color.surface,
  },
  hideHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  hideActionLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
