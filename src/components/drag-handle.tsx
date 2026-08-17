import { GripVertical } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import {
  encodeDrag,
  getActiveDrag,
  parseDrag,
  setActiveDrag,
  type DragPayload,
} from '@/lib/drag';
import { color } from '@/lib/theme';

type DropTargetProps = {
  enabled: boolean;
  children: ReactNode;
  onDrop: (payload: DragPayload) => void;
};

type DragHandleProps = {
  enabled: boolean;
  payload: DragPayload;
  onNativeShift?: (dir: -1 | 1) => void;
};

type WebDragEvent = {
  preventDefault: () => void;
  stopPropagation: () => void;
  dataTransfer?: {
    dropEffect: string;
    effectAllowed: string;
    setData: (type: string, value: string) => void;
    getData: (type: string) => string;
  };
};

export function DropTarget({ enabled, children, onDrop }: DropTargetProps) {
  if (!enabled || Platform.OS !== 'web') {
    return <View>{children}</View>;
  }

  return (
    <View
      {...(webDropHandlers((payload) => {
        onDrop(payload);
      }) as object)}
    >
      {children}
    </View>
  );
}

export function DragHandle({ enabled, payload, onNativeShift }: DragHandleProps) {
  if (!enabled) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View {...(webDragHandlers(payload) as object)} style={styles.handle} hitSlop={8}>
        <GripVertical color={color.muted} size={16} strokeWidth={2} />
      </View>
    );
  }

  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onEnd((event) => {
      if (onNativeShift === undefined) {
        return;
      }
      if (event.translationY < -24) {
        runOnJS(onNativeShift)(-1);
        return;
      }
      if (event.translationY > 24) {
        runOnJS(onNativeShift)(1);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.handle} hitSlop={8}>
        <GripVertical color={color.muted} size={16} strokeWidth={2} />
      </View>
    </GestureDetector>
  );
}

function webDragHandlers(payload: DragPayload) {
  return {
    draggable: true,
    onDragStart: (event: WebDragEvent) => {
      setActiveDrag(payload);
      event.dataTransfer?.setData('text/plain', encodeDrag(payload));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    },
    onDragEnd: () => {
      setActiveDrag(null);
    },
  };
}

function webDropHandlers(onDrop: (payload: DragPayload) => void) {
  return {
    onDragOver: (event: WebDragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    },
    onDrop: (event: WebDragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const payload = parseDrag(raw) ?? getActiveDrag();
      if (payload !== null) {
        onDrop(payload);
      }
      setActiveDrag(null);
    },
  };
}

const styles = StyleSheet.create({
  handle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
