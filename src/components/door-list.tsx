import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DoorAccordion } from '@/components/door-accordion';
import { DoorRow } from '@/components/door-button';
import { HIDDEN_GROUP_ID, HIDDEN_GROUP_LABEL } from '@/config/buildings';
import { groupInk, muteInk } from '@/lib/theme';
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
  const hiddenInk = muteInk(groupInk('hidden'));

  const requestHide = useCallback((door: Door) => {
    setPendingHide(door);
  }, []);

  const renderGroup = useCallback<SortableGridRenderItem<DoorGroup>>(
    ({ item: group, index }) => (
      <GroupBlock
        group={group}
        index={index}
        arranging={arranging}
        scrollableRef={scrollableRef}
        openUntilByDoorId={openUntilByDoorId}
        onUnlock={onUnlock}
        onHide={requestHide}
        onLayout={onGroupLayout}
        reorderDoors={reorderDoors}
      />
    ),
    [
      arranging,
      onGroupLayout,
      onUnlock,
      openUntilByDoorId,
      reorderDoors,
      requestHide,
      scrollableRef,
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
          defaultOpen={arranging}
          ink={groupInk('hidden')}
        >
          {hidden.map((door, doorIndex) => (
            <DoorRow
              key={door.id}
              door={door}
              arranging={false}
              last={doorIndex === hidden.length - 1}
              openUntil={null}
              ink={hiddenInk}
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
            scrollableRef={scrollableRef}
            openUntilByDoorId={openUntilByDoorId}
            onUnlock={onUnlock}
            onHide={requestHide}
            onLayout={onGroupLayout}
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
  scrollableRef: AnimatedRef<Animated.ScrollView>;
  openUntilByDoorId: Record<string, number>;
  onUnlock: (door: Door) => Promise<void>;
  onHide: (door: Door) => void;
  onLayout: (id: string, y: number) => void;
  reorderDoors: (groupId: string, ids: string[]) => void;
};

function GroupBlock({
  group,
  index,
  arranging,
  scrollableRef,
  openUntilByDoorId,
  onUnlock,
  onHide,
  onLayout,
  reorderDoors,
}: GroupBlockProps) {
  const ink = groupInk(group.id, index);
  const optionInk = muteInk(ink);

  const renderDoor = useCallback<SortableGridRenderItem<Door>>(
    ({ item: door, index: doorIndex }) => (
      <DoorRow
        door={door}
        arranging={arranging}
        last={doorIndex === group.doors.length - 1}
        openUntil={openUntilByDoorId[door.id] ?? null}
        ink={optionInk}
        onUnlock={onUnlock}
        onHide={onHide}
      />
    ),
    [arranging, group.doors.length, onHide, onUnlock, openUntilByDoorId, optionInk],
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
        defaultOpen={index === 0}
        arranging={arranging}
        ink={ink}
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
              ink={optionInk}
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
