import { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/lib/theme';

const SUPPORT_EMAIL = 'latchmx@fldr.zip';

export default function PrivacyPolicy() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Privacy Policy · LatchMX';
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.page}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Effective August 28, 2026</Text>

      <Section title="Overview">
        LatchMX is an independent building-access companion operated by FLDR LLC. It connects to
        an existing ButterflyMX account and lets authorized residents view doors, unlock them, and
        create temporary guest invitations. LatchMX is not affiliated with or endorsed by
        ButterflyMX.
      </Section>

      <Section title="Information we handle">
        We handle the name, email address, building and access information returned by ButterflyMX;
        the authorization credentials needed to keep you signed in; and the labels, notes, inviter
        name, contact information, selected doors, and expiration times you choose for guest
        invitations. We also collect app interactions, screen views, device and app information,
        and error diagnostics to understand usage and improve reliability. Demo mode does not send
        real building credentials or create real invitations.
      </Section>

      <Section title="How we use information">
        We use this information only to provide building access, operate expiring guest links,
        maintain security, respond to support requests, and measure and improve the app. We do not
        sell personal information or use it for targeted advertising.
      </Section>

      <Section title="Storage and retention">
        Sign-in credentials are stored securely on your device. When you create a real guest link,
        encrypted access credentials and the invitation details are stored by our service so the
        link can work. Guest links expire automatically or can be revoked earlier; related service
        records may remain for up to seven additional days for reliable expiration and abuse
        prevention. Local app data remains until you sign out, clear the app, or uninstall it.
        Analytics and diagnostic records are retained only as long as reasonably needed to operate
        and improve LatchMX.
      </Section>

      <Section title="Service providers">
        LatchMX uses ButterflyMX to authenticate and perform authorized building actions,
        Cloudflare to host the app and temporary guest-link service, and PostHog to process product
        analytics and diagnostics. These providers process information on our behalf under their
        own security and privacy terms.
      </Section>

      <Section title="Your choices">
        You can avoid analytics by using demo mode, revoke guest invitations at any time, and
        remove local account information by signing out. To request access to or deletion of
        information controlled by FLDR LLC, contact us. Requests concerning the underlying
        ButterflyMX account must be directed to ButterflyMX or your building administrator.
      </Section>

      <Section title="Security and age">
        We use encrypted network connections and encrypt guest-link credentials at rest. No system
        is perfectly secure, so do not put sensitive information in an invitation label or note.
        LatchMX is intended for adults aged 18 and older and is not directed to children.
      </Section>

      <View style={styles.contact}>
        <Text style={styles.heading}>Contact</Text>
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
