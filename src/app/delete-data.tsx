import { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n/context';
import { color, type } from '@/lib/theme';

const SUPPORT_EMAIL = 'latchmx@fldr.zip';

export default function DeleteData() {
  const { t } = useI18n();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = t('deleteData.pageTitle');
    }
  }, [t]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.page}>
      <Text style={styles.title}>{t('deleteData.title')}</Text>
      <Text style={styles.intro}>{t('deleteData.intro')}</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('deleteData.deviceTitle')}</Text>
        <Text style={styles.body}>{t('deleteData.deviceBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('deleteData.requestTitle')}</Text>
        <Text style={styles.body}>{t('deleteData.requestBody')}</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=LatchMX%20data%20deletion`)}>
          <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('deleteData.deletedTitle')}</Text>
        <Text style={styles.body}>{t('deleteData.deletedBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('deleteData.notOursTitle')}</Text>
        <Text style={styles.body}>{t('deleteData.notOursBody')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 80 },
  title: { color: color.text, fontFamily: type.title, fontSize: 42, lineHeight: 48 },
  intro: { color: color.muted, fontFamily: type.body, fontSize: 17, lineHeight: 26, marginTop: 12, marginBottom: 40 },
  section: { marginBottom: 28 },
  heading: { color: color.text, fontFamily: type.body, fontSize: 19, lineHeight: 26, marginBottom: 8 },
  body: { color: color.muted, fontFamily: type.body, fontSize: 16, lineHeight: 25 },
  link: { color: color.accent, fontFamily: type.body, fontSize: 16, lineHeight: 25, marginTop: 10, textDecorationLine: 'underline' },
});
