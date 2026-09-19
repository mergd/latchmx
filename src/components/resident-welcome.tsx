import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n/context';
import { storageGet, storageSet } from '@/lib/storage';
import { color, type } from '@/lib/theme';
import { APP_NAME } from '@/lib/title';

const INTRO_KEY = 'latch.resident-intro.v1';
const INTRO_DELAY_MS = 2400;

export function ResidentWelcome() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void storageGet(INTRO_KEY).then((seen) => {
      if (cancelled || seen === 'true') return;
      timer = setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, INTRO_DELAY_MS);
    });
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    void storageSet(INTRO_KEY, 'true');
  };

  return (
    <Modal visible={visible && focused} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('home.welcomeTitle', { name: APP_NAME })}</Text>
          <Text style={styles.body}>{t('home.welcomeBody')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={dismiss}
            style={({ pressed }) => [styles.done, pressed ? styles.pressed : null]}
          >
            <Text style={styles.doneLabel}>{t('common.done')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 10,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 26,
    lineHeight: 30,
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  done: {
    minHeight: 44,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
  pressed: { opacity: 0.78 },
});
