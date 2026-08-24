import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { ArrangeHandle } from '@/components/arrange-handle';
import { TimerCircle } from '@/components/timer-circle';
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
  const swipeRef = useRef<Swipeable>(null);
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const [failLabel, setFailLabel] = useState('Couldn’t open');
  const [now, setNow] = useState(0);
  const timedOpen = openUntil !== null && openUntil > now;
  const remaining = timedOpen && openUntil !== null ? openUntil - now : 0;
  const isOpen = door.heldOpen || timedOpen;
  const busy = status === 'unlocking' || isOpen;
  const revealing = onReveal !== undefined;
  const canSwipe = !arranging && !revealing && onHide !== undefined;
  const nameColor = revealing ? color.muted : (ink ?? color.text);

  useEffect(() => {
    if (!timedOpen) {
      return;
    }
    const id = setInterval(() => {
      setNow(Date.now());
    }, 50);
    return () => {
      clearInterval(id);
    };
  }, [timedOpen]);

  const onPress = () => {
    if (revealing) {
      void hapticImpact();
      onReveal(door);
      return;
    }
    if (arranging || busy || status !== 'idle') {
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

  const rowStyle = [
    styles.row,
    last ? styles.rowLast : null,
    isOpen ? styles.rowOpen : null,
    revealing ? styles.rowHidden : null,
  ];

  const body = (
    <>
      <ArrangeHandle enabled={arranging && sortable && !revealing} inset />
      <Text style={[styles.name, { color: nameColor }]} numberOfLines={2}>
        {labelFor(door.name, status, isOpen, failLabel)}
      </Text>
      {timedOpen && !revealing ? (
        <TimerCircle progress={remaining / DOOR_OPEN_MS} />
      ) : door.heldOpen && !revealing ? (
        <Text style={styles.open}>Open</Text>
      ) : null}
    </>
  );

  const row = (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={
        revealing
          ? 'Show this door again'
          : canSwipe
            ? 'Swipe right to hide'
            : undefined
      }
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );

  if (!canSwipe) {
    return row;
  }

  return (
    <Swipeable
      ref={swipeRef}
      overshootLeft={false}
      leftThreshold={72}
      renderLeftActions={() => (
        <View style={styles.hideAction}>
          <Text style={styles.hideActionLabel}>Hide</Text>
        </View>
      )}
      onSwipeableOpen={() => {
        swipeRef.current?.close();
        void hapticImpact();
        onHide(door);
      }}
    >
      {row}
    </Swipeable>
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
  row: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
    cursor: 'pointer',
    gap: 8,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowOpen: {
    backgroundColor: color.fill,
  },
  rowPressed: {
    backgroundColor: color.fillOk,
  },
  name: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 10,
    paddingRight: 0,
  },
  rowHidden: {
    opacity: 0.72,
  },
  open: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  hideAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill,
  },
  hideActionLabel: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
