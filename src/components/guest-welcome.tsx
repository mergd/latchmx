import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { openMapsSearch } from '@/lib/maps';
import { storageGet, storageSet } from '@/lib/storage';
import { color, type } from '@/lib/theme';

const INTRO_KEY = 'latch.guest-intro';

type GuestWelcomeProps = {
  demo?: boolean;
  secret: string;
  hostName: string | null;
  buildingName: string;
  address: string | null;
  mapsQuery: string | null;
};

export function GuestWelcome({
  demo = false,
  secret,
  hostName,
  buildingName,
  address,
  mapsQuery,
}: GuestWelcomeProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const introKey = demo ? 'latch.demo.guest-intro' : INTRO_KEY;
  const query = mapsQuery ?? (address !== null ? `${buildingName}, ${address}` : null);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    let cancelled = false;
    void storageGet(introKey).then((seen) => {
      if (cancelled || seen === secret) {
        return;
      }
      setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [introKey, secret]);

  const dismiss = () => {
    setVisible(false);
    void storageSet(introKey, secret);
  };

  return (
    <Modal
      visible={visible && focused}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{welcomeTitle(hostName, demo)}</Text>
          <Text style={styles.body}>
            {demo
              ? 'Tap a door to try it. Nothing real opens, and this only works on this device.'
              : 'Tap a door to unlock. The invite expires on its own.'}
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

function welcomeTitle(hostName: string | null, demo: boolean): string {
  const host = hostName?.trim() ?? '';
  if (host.length > 0) {
    return `${host} is inviting you`;
  }
  return demo ? 'Try a guest pass' : "You're invited";
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
