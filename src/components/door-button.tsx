import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DragHandle, DropTarget } from '@/components/drag-handle';
import { TimerCircle } from '@/components/timer-circle';
import type { DragPayload } from '@/lib/drag';
import { hapticError, hapticImpact, hapticSuccess } from '@/lib/haptics';
import { color, type } from '@/lib/theme';
import { DOOR_OPEN_MS, type Door, type UnlockStatus } from '@/lib/types';

type DoorButtonProps = {
  door: Door;
  groupId: string;
  arranging: boolean;
  openUntil: number | null;
  onUnlock: (door: Door) => Promise<void>;
  onDrop: (payload: DragPayload) => void;
  onNativeShift?: (dir: -1 | 1) => void;
};

export function DoorButton({
  door,
  groupId,
  arranging,
  openUntil,
  onUnlock,
  onDrop,
  onNativeShift,
}: DoorButtonProps) {
  const [status, setStatus] = useState<UnlockStatus>('idle');
  const [now, setNow] = useState(Date.now());
  const timedOpen = openUntil !== null && openUntil > now;
  const remaining = timedOpen && openUntil !== null ? openUntil - now : 0;
  const isOpen = door.heldOpen || timedOpen;
  const busy = status === 'unlocking' || isOpen;

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
      .catch(async () => {
        setStatus('error');
        await hapticError();
        setTimeout(() => {
          setStatus('idle');
        }, 1400);
      });
  };

  return (
    <DropTarget enabled={arranging} onDrop={onDrop}>
      <View style={styles.row}>
        <DragHandle
          enabled={arranging}
          payload={{ kind: 'door', id: door.id, groupId }}
          onNativeShift={onNativeShift}
        />
        <Pressable
          style={styles.button}
          onPress={onPress}
          disabled={arranging || busy}
        >
          <Text
            style={StyleSheet.flatten([styles.label, isOpen ? styles.labelOpen : null])}
            numberOfLines={1}
          >
            {labelFor(door.name, status, isOpen)}
          </Text>
          {timedOpen ? <TimerCircle progress={remaining / DOOR_OPEN_MS} /> : null}
          {door.heldOpen && !timedOpen ? (
            <Text style={styles.openTag}>Open</Text>
          ) : null}
        </Pressable>
      </View>
    </DropTarget>
  );
}

function labelFor(name: string, status: UnlockStatus, isOpen: boolean): string {
  switch (status) {
    case 'idle':
      return name;
    case 'unlocking':
      return name;
    case 'open':
      return name;
    case 'error':
      return isOpen ? name : 'Couldn’t open';
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  button: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    flex: 1,
    color: color.text,
    fontFamily: type.body,
    fontSize: 15,
  },
  labelOpen: {
    color: color.muted,
  },
  openTag: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 12,
  },
});
