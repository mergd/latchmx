import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DoorRow } from '@/components/door-button';
import { capture } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n/context';
import {
  retainNearbyDoors,
  type NearbyDoorMatch,
  type RetainedNearbyDoor,
} from '@/lib/nearby-ranking';
import { color, nearbyDoorInk, type } from '@/lib/theme';
import { DOOR_OPEN_MS, type Door } from '@/lib/types';

const UNLOCK_PENDING_HOLD_MS = 30_000;
const FAILED_UNLOCK_HOLD_MS = 2_800;

type NearbyDoorSuggestionProps = {
  available: boolean;
  enabled: boolean;
  matches: NearbyDoorMatch[];
  openUntilByDoorId: Record<string, number>;
  onEnable: () => Promise<void>;
  onSelect: (door: Door) => Promise<void>;
  onUnlock: (door: Door) => Promise<void>;
};

export function NearbyDoorSuggestion({
  available,
  enabled,
  matches,
  openUntilByDoorId,
  onEnable,
  onSelect,
  onUnlock,
}: NearbyDoorSuggestionProps) {
  const { t } = useI18n();
  const [retained, setRetained] = useState<Record<string, RetainedNearbyDoor>>({});
  const displayedMatches = retainNearbyDoors(
    matches,
    Object.values(retained),
    openUntilByDoorId,
  );

  useEffect(() => {
    const held = Object.values(retained);
    if (held.length === 0) return;
    const nextExpiry = Math.min(
      ...held.map(({ match, until }) =>
        Math.max(until, openUntilByDoorId[match.door.id] ?? 0),
      ),
    );
    const timer = setTimeout(() => {
      const now = Date.now();
      setRetained((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([id, item]) =>
              Math.max(item.until, openUntilByDoorId[id] ?? 0) > now,
          ),
        ),
      );
    }, Math.max(1, nextExpiry - Date.now() + 1));
    return () => clearTimeout(timer);
  }, [openUntilByDoorId, retained]);

  if (!available) {
    return null;
  }

  if (!enabled) {
    return (
      <View style={styles.shell}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void onEnable()}
          style={({ pressed }) => [
            styles.enable,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.enableCopy}>
            <Text style={styles.enableTitle}>{t('home.findNearby')}</Text>
            <Text style={styles.enableBody}>{t('home.findNearbyBody')}</Text>
          </View>
          <View style={styles.enableButton}>
            <Text style={styles.enableButtonLabel}>{t('common.enable')}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  if (displayedMatches.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.nearby')}</Text>
      </View>
      <View style={styles.results}>
        {displayedMatches.map((match, index) => (
          <DoorRow
            key={match.door.id}
            door={match.door}
            arranging={false}
            sortable={false}
            ink={nearbyDoorInk(match.door)}
            last={index === displayedMatches.length - 1}
            openUntil={openUntilByDoorId[match.door.id] ?? null}
            onUnlock={async (selected) => {
              setRetained((current) => ({
                ...current,
                [selected.id]: {
                  match,
                  index,
                  until: Date.now() + UNLOCK_PENDING_HOLD_MS,
                },
              }));
              capture('nearby_suggestion_selected', {
                rank: index + 1,
                rssi: match.rssi,
                samples: match.samples,
                candidate_count: displayedMatches.length,
              });
              void onSelect(selected);
              try {
                await onUnlock(selected);
                setRetained((current) => ({
                  ...current,
                  [selected.id]: {
                    ...(current[selected.id] ?? { match, index }),
                    until: Date.now() + DOOR_OPEN_MS,
                  },
                }));
              } catch (error) {
                setRetained((current) => ({
                  ...current,
                  [selected.id]: {
                    ...(current[selected.id] ?? { match, index }),
                    until: Date.now() + FAILED_UNLOCK_HOLD_MS,
                  },
                }));
                throw error;
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
  },
  enable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: color.fill,
  },
  enableCopy: { flex: 1 },
  enableButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButtonLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.72,
  },
  enableTitle: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 15,
  },
  enableBody: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 5,
  },
  title: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  results: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: color.canvas,
  },
});
