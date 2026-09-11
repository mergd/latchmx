import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { APP_LOCALES, t } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';
import { color, type } from '@/lib/theme';

const NATIVE_NAMES: Record<(typeof APP_LOCALES)[number], string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  pt: 'Português',
  hi: 'हिन्दी',
  ne: 'नेपाली',
};

export function LanguageDialog({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { locale, preference, setPreference } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>{t('language.label')}</Text>
          <Option
            label={t('language.systemValue', { language: NATIVE_NAMES[locale] })}
            selected={preference === 'system'}
            onPress={() => {
              setPreference('system');
              onClose();
            }}
          />
          {APP_LOCALES.map((item) => (
            <Option
              key={item}
              label={NATIVE_NAMES[item]}
              selected={preference === item}
              onPress={() => {
                setPreference(item);
                onClose();
              }}
            />
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionOn : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: color.surface,
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 22,
    lineHeight: 26,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  option: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 12,
    cursor: 'pointer',
  },
  optionOn: {
    backgroundColor: color.fillOk,
  },
  optionLabel: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.78,
  },
});
