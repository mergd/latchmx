import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DoorAccordion } from '@/components/door-accordion';
import { DoorRow } from '@/components/door-button';
import { HIDDEN_GROUP_ID, HIDDEN_GROUP_LABEL } from '@/config/buildings';
import { doorInk, groupInk } from '@/lib/theme';
import type { Door } from '@/lib/types';
import type { DoorGroup } from '@/lib/zones';

type DoorListProps = {
  groups: DoorGroup[];
  hidden: Door[];
  arranging: boolean;
  scrollableRef: AnimatedRef<Animated.ScrollView>;
  openUntilByDoorId: Record<string, number>;
  onUnlock: (door: Door) => Promise<void>;
  onHide: (door: Door) => void;
  onReveal: (door: Door) => void;
  onGroupLayout: (id: string, y: number) => void;
  reorderGroups: (ids: string[]) => void;
  reorderDoors: (groupId: string, ids: string[]) => void;
};

export function DoorList({
  groups,
  hidden,
  arranging,
  scrollableRef,
  openUntilByDoorId,
  onUnlock,
  onHide,
  onReveal,
  onGroupLayout,
  reorderGroups,
  reorderDoors,
}: DoorListProps) {
  const [pendingHide, setPendingHide] = useState<Door | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const requestHide = useCallback((door: Door) => {
    setPendingHide(door);
  }, []);

  const knownIds = groups.map((group) => group.id);
  if (hidden.length > 0) {
    knownIds.push(HIDDEN_GROUP_ID);
  }
  const openId =
    openGroupId !== null && knownIds.includes(openGroupId)
      ? openGroupId
      : (groups[0]?.id ?? null);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroupId(id);
  }, []);

  const renderGroup = useCallback<SortableGridRenderItem<DoorGroup>>(
    ({ item: group, index }) => (
      <GroupBlock
        group={group}
        index={index}
        arranging={arranging}
        open={openId === group.id}
        scrollableRef={scrollableRef}
        openUntilByDoorId={openUntilByDoorId}
        onUnlock={onUnlock}
        onHide={requestHide}
        onLayout={onGroupLayout}
        onToggle={() => {
          toggleGroup(group.id);
        }}
        reorderDoors={reorderDoors}
      />
    ),
    [
      arranging,
      onGroupLayout,
      onUnlock,
      openId,
      openUntilByDoorId,
      reorderDoors,
      requestHide,
      scrollableRef,
      toggleGroup,
    ],
  );

  const hiddenSection =
    hidden.length > 0 ? (
      <View
        style={styles.group}
        onLayout={(event) => {
          onGroupLayout(HIDDEN_GROUP_ID, event.nativeEvent.layout.y);
        }}
      >
        <DoorAccordion
          title={HIDDEN_GROUP_LABEL}
          count={hidden.length}
          open={openId === HIDDEN_GROUP_ID}
          ink={groupInk(groups.length)}
          onToggle={() => {
            toggleGroup(HIDDEN_GROUP_ID);
          }}
        >
          {hidden.map((door, doorIndex) => (
            <DoorRow
              key={door.id}
              door={door}
              arranging={false}
              last={doorIndex === hidden.length - 1}
              openUntil={null}
              ink={doorInk(groups.length, doorIndex)}
              onUnlock={onUnlock}
              onReveal={onReveal}
            />
          ))}
        </DoorAccordion>
      </View>
    ) : null;

  return (
    <View style={styles.list}>
      {arranging ? (
        <Sortable.Grid
          columns={1}
          data={groups}
          keyExtractor={(group) => group.id}
          renderItem={renderGroup}
          customHandle
          hapticsEnabled
          dragActivationDelay={80}
          inactiveItemOpacity={1}
          activeItemScale={1.04}
          itemEntering={null}
          itemExiting={null}
          rowGap={0}
          scrollableRef={scrollableRef}
          onDragEnd={({ data }) => {
            reorderGroups(data.map((group) => group.id));
          }}
        />
      ) : (
        groups.map((group, index) => (
          <GroupBlock
            key={group.id}
            group={group}
            index={index}
            arranging={false}
            open={openId === group.id}
            scrollableRef={scrollableRef}
            openUntilByDoorId={openUntilByDoorId}
            onUnlock={onUnlock}
            onHide={requestHide}
            onLayout={onGroupLayout}
            onToggle={() => {
              toggleGroup(group.id);
            }}
            reorderDoors={reorderDoors}
          />
        ))
      )}
      {hiddenSection}
      <ConfirmDialog
        visible={pendingHide !== null}
        title="Hide this door?"
        body="It’ll move to Hidden at the bottom. You can bring it back while arranging."
        confirmLabel="Hide"
        onCancel={() => {
          setPendingHide(null);
        }}
        onConfirm={() => {
          if (pendingHide !== null) {
            onHide(pendingHide);
          }
          setPendingHide(null);
        }}
      />
    </View>
  );
}

type GroupBlockProps = {
  group: DoorGroup;
  index: number;
  arranging: boolean;
  open: boolean;
  scrollableRef: AnimatedRef<Animated.ScrollView>;
  openUntilByDoorId: Record<string, number>;
  onUnlock: (door: Door) => Promise<void>;
  onHide: (door: Door) => void;
  onLayout: (id: string, y: number) => void;
  onToggle: () => void;
  reorderDoors: (groupId: string, ids: string[]) => void;
};

function GroupBlock({
  group,
  index,
  arranging,
  open,
  scrollableRef,
  openUntilByDoorId,
  onUnlock,
  onHide,
  onLayout,
  onToggle,
  reorderDoors,
}: GroupBlockProps) {
  const ink = groupInk(index);

  const renderDoor = useCallback<SortableGridRenderItem<Door>>(
    ({ item: door, index: doorIndex }) => (
      <DoorRow
        door={door}
        arranging={arranging}
        last={doorIndex === group.doors.length - 1}
        openUntil={openUntilByDoorId[door.id] ?? null}
        ink={doorInk(index, doorIndex)}
        onUnlock={onUnlock}
        onHide={onHide}
      />
    ),
    [arranging, group.doors.length, index, onHide, onUnlock, openUntilByDoorId],
  );

  return (
    <View
      style={styles.group}
      onLayout={(event) => {
        onLayout(group.id, event.nativeEvent.layout.y);
      }}
    >
      <DoorAccordion
        title={group.label}
        count={group.doors.length}
        open={open}
        arranging={arranging}
        ink={ink}
        onToggle={onToggle}
      >
        {arranging ? (
          <Sortable.Grid
            columns={1}
            data={group.doors}
            keyExtractor={(door) => door.id}
            renderItem={renderDoor}
            customHandle
            hapticsEnabled
            dragActivationDelay={80}
            inactiveItemOpacity={1}
            activeItemScale={1.04}
            itemEntering={null}
            itemExiting={null}
            rowGap={0}
            scrollableRef={scrollableRef}
            onDragEnd={({ data }) => {
              reorderDoors(
                group.id,
                data.map((door) => door.id),
              );
            }}
          />
        ) : (
          group.doors.map((door, doorIndex) => (
            <DoorRow
              key={door.id}
              door={door}
              arranging={false}
              last={doorIndex === group.doors.length - 1}
              openUntil={openUntilByDoorId[door.id] ?? null}
              ink={doorInk(index, doorIndex)}
              onUnlock={onUnlock}
              onHide={onHide}
            />
          ))
        )}
      </DoorAccordion>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    width: '100%',
  },
  group: {
    width: '100%',
  },
});
