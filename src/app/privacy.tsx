import { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n/context';
import { color, type } from '@/lib/theme';

const SUPPORT_EMAIL = 'latchmx@fldr.zip';

export default function PrivacyPolicy() {
  const { t } = useI18n();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = t('privacy.pageTitle');
    }
  }, [t]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.page}>
      <Text style={styles.title}>{t('privacy.title')}</Text>
      <Text style={styles.updated}>{t('privacy.updated')}</Text>

      <Section title={t('privacy.overviewTitle')}>{t('privacy.overviewBody')}</Section>
      <Section title={t('privacy.handleTitle')}>{t('privacy.handleBody')}</Section>
      <Section title={t('privacy.useTitle')}>{t('privacy.useBody')}</Section>
      <Section title={t('privacy.storageTitle')}>{t('privacy.storageBody')}</Section>
      <Section title={t('privacy.providersTitle')}>{t('privacy.providersBody')}</Section>
      <Section title={t('privacy.choicesTitle')}>{t('privacy.choicesBody')}</Section>
      <Section title={t('privacy.securityTitle')}>{t('privacy.securityBody')}</Section>

      <View style={styles.contact}>
        <Text style={styles.heading}>{t('common.contact')}</Text>
        <Text style={styles.body}>FLDR LLC</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 80 },
  title: { color: color.text, fontFamily: type.title, fontSize: 42, lineHeight: 48 },
  updated: { color: color.muted, fontFamily: type.body, fontSize: 15, marginTop: 8, marginBottom: 40 },
  section: { marginBottom: 28 },
  contact: { borderTopColor: color.line, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 28 },
  heading: { color: color.text, fontFamily: type.body, fontSize: 19, lineHeight: 26, marginBottom: 8 },
  body: { color: color.muted, fontFamily: type.body, fontSize: 16, lineHeight: 25 },
  link: { color: color.accent, fontFamily: type.body, fontSize: 16, lineHeight: 25, textDecorationLine: 'underline' },
});
