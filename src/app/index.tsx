import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ListOrdered, Settings2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { DoorAccordion } from '@/components/door-accordion';
import { DoorButton } from '@/components/door-button';
import { SignInForm } from '@/components/sign-in-form';
import { StatusPill } from '@/components/status-pill';
import type { DragPayload } from '@/lib/drag';
import { neighborBefore } from '@/lib/drag';
import { useSession } from '@/lib/session';
import { color, type } from '@/lib/theme';
import type { Door } from '@/lib/types';
import { groupDoors } from '@/lib/zones';

import loginVisual from '../../assets/brand/login-visual.png';

export default function BuildingScreen() {
  const {
    mode,
    doors,
    buildingName,
    unlock,
    bootError,
    zoneByDoorId,
    arrangement,
    dropGroup,
    dropDoor,
    openUntilByDoorId,
  } = useSession();
  const [arranging, setArranging] = useState(false);
  const groups = useMemo(
    () => groupDoors(doors, zoneByDoorId, arrangement),
    [arrangement, doors, zoneByDoorId],
  );
  const groupIds = groups.map((group) => group.id);
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
          {signedOut ? null : (
            <Pressable
              style={StyleSheet.flatten([
                styles.gear,
                arranging ? styles.gearOn : null,
              ])}
              onPress={() => {
                setArranging((current) => !current);
              }}
              hitSlop={12}
            >
              <ListOrdered
                color={arranging ? color.accent : color.muted}
                size={18}
                strokeWidth={1.75}
              />
            </Pressable>
          )}
          <Link href="/settings" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.gear, signedOut ? styles.gearOnVisual : null])}
              hitSlop={12}
            >
              <Settings2 color={signedOut ? color.text : color.muted} size={18} strokeWidth={1.75} />
            </Pressable>
          </Link>
        </View>
        {signedOut ? null : (
          <View style={styles.statusRow}>
            <StatusPill mode={mode} />
            {arranging ? (
              <Text style={styles.hint}>
                Drag the grip to reorder. Drop a door on another section to move it.
              </Text>
            ) : null}
          </View>
        )}
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
        {groups.map((group, index) => {
          const doorIds = group.doors.map((door) => door.id);
          return (
            <DoorAccordion
              key={group.id}
              groupId={group.id}
              title={group.label}
              count={group.doors.length}
              defaultOpen={index === 0}
              arranging={arranging}
              onDrop={(payload) => {
                handleGroupDrop(payload, group.id, groupIds, doorIds, dropGroup, dropDoor, groups);
              }}
              onNativeShift={(dir) => {
                const beforeId = neighborBefore(groupIds, group.id, dir);
                if (beforeId === undefined) {
                  return;
                }
                dropGroup(groupIds, group.id, beforeId);
              }}
            >
              {group.doors.map((door) => (
                <DoorButton
                  key={door.id}
                  door={door}
                  groupId={group.id}
                  arranging={arranging}
                  onUnlock={unlock}
                  openUntil={openUntilByDoorId[door.id] ?? null}
                  onDrop={(payload) => {
                    handleDoorDrop(payload, door.id, group.id, doorIds, dropDoor, groups);
                  }}
                  onNativeShift={(dir) => {
                    const beforeId = neighborBefore(doorIds, door.id, dir);
                    if (beforeId === undefined) {
                      return;
                    }
                    dropDoor(door, group.id, group.id, doorIds, doorIds, beforeId);
                  }}
                />
              ))}
            </DoorAccordion>
          );
        })}
      </ScrollView>
    </AppShell>
  );
}

function handleGroupDrop(
  payload: DragPayload,
  targetGroupId: string,
  groupIds: string[],
  targetDoorIds: string[],
  dropGroup: (groupIds: string[], draggedId: string, beforeId: string | null) => void,
  dropDoor: (
    door: Door,
    fromGroupId: string,
    toGroupId: string,
    fromDoorIds: string[],
    toDoorIds: string[],
    beforeId: string | null,
  ) => void,
  groups: { id: string; doors: Door[] }[],
): void {
  switch (payload.kind) {
    case 'group':
      if (payload.id === targetGroupId) {
        return;
      }
      dropGroup(groupIds, payload.id, targetGroupId);
      return;
    case 'door': {
      const door = groups
        .flatMap((group) => group.doors)
        .find((item) => item.id === payload.id);
      if (door === undefined) {
        return;
      }
      const fromIds =
        groups.find((group) => group.id === payload.groupId)?.doors.map((item) => item.id) ?? [];
      dropDoor(door, payload.groupId, targetGroupId, fromIds, targetDoorIds, null);
      return;
    }
    default: {
      const _never: never = payload;
      return _never;
    }
  }
}

function handleDoorDrop(
  payload: DragPayload,
  targetDoorId: string,
  targetGroupId: string,
  targetDoorIds: string[],
  dropDoor: (
    door: Door,
    fromGroupId: string,
    toGroupId: string,
    fromDoorIds: string[],
    toDoorIds: string[],
    beforeId: string | null,
  ) => void,
  groups: { id: string; doors: Door[] }[],
): void {
  switch (payload.kind) {
    case 'group':
      return;
    case 'door': {
      if (payload.id === targetDoorId) {
        return;
      }
      const door = groups
        .flatMap((group) => group.doors)
        .find((item) => item.id === payload.id);
      if (door === undefined) {
        return;
      }
      const fromIds =
        groups.find((group) => group.id === payload.groupId)?.doors.map((item) => item.id) ?? [];
      dropDoor(door, payload.groupId, targetGroupId, fromIds, targetDoorIds, targetDoorId);
      return;
    }
    default: {
      const _never: never = payload;
      return _never;
    }
  }
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
    gap: 8,
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
  gearOn: {
    borderWidth: 1,
    borderColor: color.accent,
  },
  gearOnVisual: {
    backgroundColor: color.overlaySoft,
  },
  statusRow: {
    gap: 6,
  },
  hint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 16,
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
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
