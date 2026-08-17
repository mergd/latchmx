import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Settings2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { DoorSlider } from '@/components/door-slider';
import { SignInForm } from '@/components/sign-in-form';
import { StatusPill } from '@/components/status-pill';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';
import { groupDoors } from '@/lib/zones';

import loginVisual from '../../assets/brand/login-visual.png';

export default function BuildingScreen() {
  const { mode, doors, buildingName, unlock, bootError, zoneByDoorId, cycleDoorZone } =
    useSession();
  const groups = useMemo(
    () => groupDoors(doors, zoneByDoorId),
    [doors, zoneByDoorId],
  );
  const signedOut = mode === 'signed_out';
  const title = buildingName.length > 0 ? buildingName : 'Latch';

  return (
    <AppShell
      background={
        signedOut ? (
          <Image
            source={loginVisual}
            style={styles.loginVisual}
            contentFit="cover"
            accessibilityLabel="Latch mark"
          />
        ) : null
      }
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {signedOut ? (
            <View style={styles.title} />
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          <Link href="/settings" asChild>
            <Pressable style={[styles.gear, signedOut ? styles.gearOnVisual : null]} hitSlop={12}>
              <Settings2 color={signedOut ? color.text : color.muted} size={18} strokeWidth={1.75} />
            </Pressable>
          </Link>
        </View>
        {signedOut ? null : <StatusPill mode={mode} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {bootError !== null ? <Text style={styles.error}>{bootError}</Text> : null}
        {signedOut ? (
          <View style={styles.loginDock}>
            <SignInForm />
          </View>
        ) : null}
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
  loginVisual: {
    ...StyleSheet.absoluteFillObject,
  },
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
  gearOnVisual: {
    backgroundColor: color.overlaySoft,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 18,
  },
  loginDock: {
    marginTop: 'auto',
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.overlay,
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
