import { CheckCircleIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n/context';
import { color, type } from '@/lib/theme';

export function LoginToast({ visible }: { visible: boolean }) {
  const { t } = useI18n();
  const { top } = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View
      accessibilityRole="alert"
      pointerEvents="none"
      style={[styles.toast, { top: top + 12 }]}
    >
      <CheckCircleIcon color={color.ok} size={20} weight="fill" />
      <Text style={styles.label}>{t('auth.loggedIn')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    zIndex: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: color.surface,
  },
  label: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 15,
  },
});
