import { DotsSixVerticalIcon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';
import Sortable from 'react-native-sortables';

import { color } from '@/lib/theme';

type ArrangeHandleProps = {
  enabled: boolean;
  inset?: boolean;
};

export function ArrangeHandle({ enabled, inset = false }: ArrangeHandleProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Sortable.Handle style={[styles.handle, inset ? styles.handleInset : null]}>
      <DotsSixVerticalIcon color={color.muted} size={16} weight="bold" />
    </Sortable.Handle>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleInset: {
    marginLeft: 20,
  },
});

