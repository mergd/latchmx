import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { contactHref } from '@/lib/contact';
import { color, type } from '@/lib/theme';
import type { GuestInvite } from '@/lib/types';

type GuestBannerProps = {
  invite: GuestInvite | null;
  expiresLabel: string;
};

export function GuestBanner({ invite, expiresLabel }: GuestBannerProps) {
  const from = invite?.inviterName?.trim() ?? '';
  const note = invite?.note?.trim() ?? '';
  const contact = invite?.contact?.trim() ?? '';
  const href = contactHref(contact);
  const bits = [from.length > 0 ? `From ${from}` : null, expiresLabel].filter(
    (bit): bit is string => bit !== null && bit.length > 0,
  );

  return (
    <View style={styles.banner}>
      <Text style={styles.kicker}>Guest invite</Text>
      {bits.length > 0 ? <Text style={styles.meta}>{bits.join(' · ')}</Text> : null}
      {contact.length > 0 ? (
        href !== null ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Contact ${contact}`}
            onPress={() => {
              void Linking.openURL(href);
            }}
            style={({ pressed }) => [styles.contactHit, pressed ? styles.pressed : null]}
          >
            <Text style={styles.contact}>{contact}</Text>
          </Pressable>
        ) : (
          <Text style={styles.contact}>{contact}</Text>
        )
      ) : null}
      {note.length > 0 ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: color.surface,
    gap: 4,
  },
  kicker: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  meta: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  contactHit: {
    alignSelf: 'flex-start',
    cursor: 'pointer',
  },
  contact: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 15,
  },
  note: {
    marginTop: 4,
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.78,
  },
});
