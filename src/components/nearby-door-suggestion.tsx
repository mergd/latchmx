import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DoorRow } from '@/components/door-button';
import { capture } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n/context';
import type { NearbyDoorMatch } from '@/lib/nearby-ranking';
import { color, type } from '@/lib/theme';
import type { Door } from '@/lib/types';

type NearbyDoorSuggestionProps = {
  available: boolean;
  enabled: boolean;
  scanning: boolean;
  matches: NearbyDoorMatch[];
  error: string | null;
  openUntilByDoorId: Record<string, number>;
  onEnable: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onUnlock: (door: Door) => Promise<void>;
};

export function NearbyDoorSuggestion({
  available,
  enabled,
  scanning,
  matches,
  error,
  openUntilByDoorId,
  onEnable,
  onRefresh,
  onUnlock,
}: NearbyDoorSuggestionProps) {
  const { t } = useI18n();
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
          <Text style={styles.enableTitle}>{t('home.findNearby')}</Text>
          <Text style={styles.enableBody}>{t('home.findNearbyBody')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.nearby')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.scanAgain')}
          disabled={scanning}
          hitSlop={8}
          onPress={() => void onRefresh()}
        >
          <Text
            style={[styles.action, scanning ? styles.actionDisabled : null]}
          >
            {scanning ? t('home.findingNearby') : t('home.scanAgain')}
          </Text>
        </Pressable>
      </View>
      {matches.length > 0 ? (
        <View style={styles.results}>
          {matches.map(({ door, rssi, samples }, index) => (
            <DoorRow
              key={door.id}
              door={door}
              arranging={false}
              sortable={false}
              last={index === matches.length - 1}
              openUntil={openUntilByDoorId[door.id] ?? null}
              onUnlock={async (selected) => {
                capture('nearby_suggestion_selected', {
                  rank: index + 1,
                  rssi,
                  samples,
                  candidate_count: matches.length,
                });
                await onUnlock(selected);
              }}
            />
          ))}
        </View>
      ) : !scanning ? (
        <Text style={styles.empty}>
          {error === null ? t('home.noNearby') : t('home.nearbyUnavailable')}
        </Text>
      ) : null}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: color.fill,
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
  action: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 12,
  },
  actionDisabled: {
    color: color.muted,
  },
  results: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: color.canvas,
  },
  empty: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
