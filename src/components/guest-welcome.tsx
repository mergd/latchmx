import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { openMapsSearch } from '@/lib/maps';
import { storageGet, storageSet } from '@/lib/storage';
import { APP_NAME } from '@/lib/title';
import { color, type } from '@/lib/theme';

const INTRO_KEY = 'latch.guest-intro';

type GuestWelcomeProps = {
  secret: string;
  buildingName: string;
  address: string | null;
  mapsQuery: string | null;
};

export function GuestWelcome({
  secret,
  buildingName,
  address,
  mapsQuery,
}: GuestWelcomeProps) {
  const [visible, setVisible] = useState(false);
  const query = mapsQuery ?? (address !== null ? `${buildingName}, ${address}` : null);

  useEffect(() => {
    let cancelled = false;
    void storageGet(INTRO_KEY).then((seen) => {
      if (cancelled || seen === secret) {
        return;
      }
      setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [secret]);

  const dismiss = () => {
    setVisible(false);
    void storageSet(INTRO_KEY, secret);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Guest invite</Text>
          <Text style={styles.title}>You’re on a guest pass</Text>
          <Text style={styles.body}>
            {APP_NAME} opens the doors in this building. Tap one to unlock. No PIN. This
            link dies when the clock runs out.
          </Text>
          {query !== null ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${buildingName} in maps`}
              onPress={() => {
                void openMapsSearch(query);
              }}
              style={({ pressed }) => [
                styles.place,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.placeName}>{buildingName}</Text>
              {address !== null ? (
                <Text style={styles.placeAddress}>{address}</Text>
              ) : null}
              <Text style={styles.placeLink}>Open in Maps</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={dismiss}
            style={({ pressed }) => [
              styles.done,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.doneLabel}>Got it</Text>
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
  eyebrow: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
  place: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: color.fill,
    gap: 2,
    cursor: 'pointer',
  },
  placeName: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  placeAddress: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
  },
  placeLink: {
    marginTop: 6,
    color: color.accent,
    fontFamily: type.body,
    fontSize: 14,
  },
  done: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  doneLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.78,
  },
});
