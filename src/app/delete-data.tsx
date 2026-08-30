import { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';

const SUPPORT_EMAIL = 'latchmx@fldr.zip';

export default function DeleteData() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Delete your data · LatchMX';
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.page}>
      <Text style={styles.title}>Delete your data</Text>
      <Text style={styles.intro}>
        LatchMX is operated by FLDR LLC. You can remove local data yourself and ask us to delete
        data held by the LatchMX service.
      </Text>

      <View style={styles.section}>
        <Text style={styles.heading}>Remove data from your device</Text>
        <Text style={styles.body}>
          Open Settings in LatchMX and tap Sign out. You can also uninstall the app. This removes
          the stored LatchMX session and preferences from that device.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Request deletion from FLDR LLC</Text>
        <Text style={styles.body}>
          Email us from the address associated with your ButterflyMX account. Put “LatchMX data
          deletion” in the subject and tell us which email address or guest invitation the request
          concerns. We may ask you to verify control of that address before deleting data.
        </Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=LatchMX%20data%20deletion`)}>
          <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>What is deleted</Text>
        <Text style={styles.body}>
          We delete LatchMX analytics identifiers and associated product events that we can match
          to your request, along with any active guest-invitation records you identify. Revoked or
          expired guest records are otherwise deleted automatically after a short reliability and
          abuse-prevention period of up to seven days.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>What is not controlled by LatchMX</Text>
        <Text style={styles.body}>
          FLDR LLC cannot delete your underlying ButterflyMX account or building-access records.
          Contact ButterflyMX or your building administrator for those records. We may retain
          minimal security or legal records when required by law.
        </Text>
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
