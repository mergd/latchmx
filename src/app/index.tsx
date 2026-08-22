import { Image } from 'expo-image';
import { router } from 'expo-router';
import { List, RotateCcw, Settings } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import { AppShell } from '@/components/app-shell';
import { BuildingHero } from '@/components/building-hero';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DoorList } from '@/components/door-list';
import { IconButton } from '@/components/icon-button';
import { SignInForm } from '@/components/sign-in-form';
import { StickyBuildingHeader } from '@/components/sticky-building-header';
import { HIDDEN_GROUP_ID, HIDDEN_GROUP_LABEL, fallbackBuilding } from '@/config/buildings';
import { useSession } from '@/lib/session';
import { color, groupInk, type } from '@/lib/theme';
import {
  differsFromBaseLayout,
  groupDoors,
  hasCustomLayout,
  layoutForDoors,
  userHiddenDoors,
} from '@/lib/zones';

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
    reorderGroups,
    reorderDoors,
    openUntilByDoorId,
    hiddenByDoorId,
    hideDoor,
    showDoor,
    resetLayout,
  } = useSession();
  const [arranging, setArranging] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [section, setSection] = useState('');
  const [chromePinned, setChromePinned] = useState(false);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const heroH = useSharedValue(200);
  const heroHRef = useRef(200);
  const listYRef = useRef(0);
  const sectionYRef = useRef<Record<string, number>>({});
  const sectionRef = useRef('');
  const pinnedRef = useRef(false);
  const groups = useMemo(
    () => groupDoors(doors, zoneByDoorId, arrangement, hiddenByDoorId),
    [arrangement, doors, hiddenByDoorId, zoneByDoorId],
  );
  const hidden = useMemo(
    () => userHiddenDoors(doors, hiddenByDoorId),
    [doors, hiddenByDoorId],
  );
  const layout = layoutForDoors(doors);
  const mapped = hasCustomLayout(doors);
  const canReset = differsFromBaseLayout(
    doors,
    zoneByDoorId,
    arrangement,
    hiddenByDoorId,
  );
  const heroUri = layout.hero?.uri ?? fallbackBuilding.hero?.uri;
  const signedOut = mode === 'signed_out';
  const title = layout.displayName ?? (buildingName.length > 0 ? buildingName : 'Latch');
  const buildingId = doors[0]?.buildingId;
  const kicker = arranging
    ? 'Drag a grip to reorder'
    : mapped
      ? (layout.address ?? '')
      : buildingId === undefined
        ? 'Not in Latch yet — add a layout to customize this.'
        : `Not in Latch yet — add a layout (${buildingId}) to customize this.`;
  const pinTargets = useMemo(() => {
    const items = groups.map((group, index) => ({
      id: group.id,
      label: group.label,
      ink: groupInk(index),
    }));
    if (hidden.length > 0) {
      items.push({
        id: HIDDEN_GROUP_ID,
        label: HIDDEN_GROUP_LABEL,
        ink: groupInk(groups.length),
      });
    }
    return items;
  }, [groups, hidden.length]);
  const pinnedTarget =
    pinTargets.find((item) => item.label === section) ?? pinTargets[0];
  const pinnedSection = pinnedTarget?.label ?? '';
  const pinnedInk = pinnedTarget?.ink ?? color.accent;
  const stickyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [heroH.value - 84, heroH.value - 32],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const syncPinnedSection = (y: number) => {
    const pin = y + 76;
    let next = pinTargets[0]?.label ?? '';
    for (const group of pinTargets) {
      const top = listYRef.current + (sectionYRef.current[group.id] ?? 0);
      if (top <= pin) {
        next = group.label;
      }
    }
    if (next !== sectionRef.current) {
      sectionRef.current = next;
      setSection(next);
    }
    const pinned = y > heroHRef.current - 48;
    if (pinned !== pinnedRef.current) {
      pinnedRef.current = pinned;
      setChromePinned(pinned);
    }
  };

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
      {signedOut ? (
        <View style={styles.loginDock}>
          {bootError !== null ? <Text style={styles.error}>{bootError}</Text> : null}
          <SignInForm />
        </View>
      ) : (
        <Sortable.PortalProvider enabled={arranging}>
          <View style={styles.screen}>
            <Animated.ScrollView
              ref={scrollableRef}
              style={styles.scroller}
              contentContainerStyle={styles.scrollerContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                const y = event.nativeEvent.contentOffset.y;
                scrollY.value = y;
                syncPinnedSection(y);
              }}
            >
              <View
                style={[styles.heroBlock, heroUri ? styles.heroBlockTall : null]}
                onLayout={(event) => {
                  const height = event.nativeEvent.layout.height;
                  heroH.value = height;
                  heroHRef.current = height;
                }}
              >
                <BuildingHero uri={heroUri} />
                <View style={styles.identity}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                    <BuildingActions
                      arranging={arranging}
                      canReset={canReset}
                      onToggleArrange={() => {
                        setArranging((current) => !current);
                      }}
                      onReset={() => {
                        setPendingReset(true);
                      }}
                    />
                  </View>
                  {kicker.length > 0 ? <Text style={styles.kicker}>{kicker}</Text> : null}
                  {bootError !== null ? <Text style={styles.error}>{bootError}</Text> : null}
                </View>
              </View>
              <View
                style={styles.listMeasure}
                onLayout={(event) => {
                  listYRef.current = event.nativeEvent.layout.y;
                }}
              >
                <DoorList
                  groups={groups}
                  hidden={hidden}
                  arranging={arranging}
                  scrollableRef={scrollableRef}
                  openUntilByDoorId={openUntilByDoorId}
                  onUnlock={unlock}
                  onHide={hideDoor}
                  onReveal={showDoor}
                  onGroupLayout={(id, y) => {
                    sectionYRef.current[id] = y;
                  }}
                  reorderGroups={reorderGroups}
                  reorderDoors={reorderDoors}
                />
              </View>
            </Animated.ScrollView>
            <StickyBuildingHeader
              title={title}
              section={pinnedSection}
              sectionInk={pinnedInk}
              style={stickyStyle}
              interactive={chromePinned}
              actions={
                <BuildingActions
                  arranging={arranging}
                  canReset={canReset}
                  onToggleArrange={() => {
                    setArranging((current) => !current);
                  }}
                  onReset={() => {
                    setPendingReset(true);
                  }}
                />
              }
            />
            <ConfirmDialog
              visible={pendingReset}
              title="Reset this layout?"
              body="Doors go back to the building’s default order, and anything you hid comes back."
              confirmLabel="Reset"
              onCancel={() => {
                setPendingReset(false);
              }}
              onConfirm={() => {
                resetLayout();
                setPendingReset(false);
              }}
            />
          </View>
        </Sortable.PortalProvider>
      )}
    </AppShell>
  );
}

function BuildingActions({
  arranging,
  canReset,
  onToggleArrange,
  onReset,
}: {
  arranging: boolean;
  canReset: boolean;
  onToggleArrange: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.toolbar}>
      {arranging && canReset ? (
        <IconButton icon={RotateCcw} label="Reset order" onPress={onReset} />
      ) : null}
      <IconButton
        icon={List}
        label={arranging ? 'Done arranging' : 'Arrange doors'}
        active={arranging}
        onPress={onToggleArrange}
      />
      <IconButton
        icon={Settings}
        label="Settings"
        onPress={() => {
          router.push('/settings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loginVisual: {
    ...StyleSheet.absoluteFillObject,
  },
  loginDock: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: color.overlay,
  },
  screen: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  heroBlock: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroBlockTall: {
    height: 200,
  },
  identity: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  title: {
    flex: 1,
    color: color.text,
    fontFamily: type.title,
    fontSize: 34,
    lineHeight: 38,
  },
  kicker: {
    marginTop: 6,
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    minHeight: 20,
  },
  error: {
    marginTop: 8,
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  scroller: {
    flex: 1,
  },
  scrollerContent: {
    paddingBottom: 40,
  },
  listMeasure: {
    width: '100%',
  },
});
