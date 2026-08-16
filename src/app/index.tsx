import { Link } from 'expo-router';
import { Settings2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { DoorSlider } from '@/components/door-slider';
import { StatusPill } from '@/components/status-pill';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';
import { groupDoors } from '@/lib/zones';

export default function BuildingScreen() {
  const { mode, doors, buildingName, unlock, bootError, zoneByDoorId, cycleDoorZone } =
    useSession();
  const groups = useMemo(
    () => groupDoors(doors, zoneByDoorId),
    [doors, zoneByDoorId],
  );

  return (
    <AppShell>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {buildingName}
          </Text>
          <Link href="/settings" asChild>
            <Pressable style={styles.gear} hitSlop={12}>
              <Settings2 color={color.muted} size={18} strokeWidth={1.75} />
            </Pressable>
          </Link>
        </View>
        <StatusPill mode={mode} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {bootError !== null ? <Text style={styles.error}>{bootError}</Text> : null}
        {groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            {group.doors.map((door) => (
              <DoorSlider
                key={door.id}
                door={door}
                onUnlock={unlock}
                onCycleZone={cycleDoorZone}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    color: color.text,
    fontFamily: type.title,
    fontSize: 26,
    lineHeight: 30,
  },
  gear: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 18,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
