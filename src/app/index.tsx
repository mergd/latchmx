import { router, usePathname } from 'expo-router';
import { ArrowCounterClockwiseIcon, GearSixIcon, KeyIcon, ListIcon } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppShell } from '@/components/app-shell';
import { AppMark } from '@/components/app-mark';
import { BuildingHero } from '@/components/building-hero';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DeadKey } from '@/components/dead-key';
import { DoorList } from '@/components/door-list';
import { GuestBanner } from '@/components/guest-banner';
import { GuestWelcome } from '@/components/guest-welcome';
import { IconButton } from '@/components/icon-button';
import { PageTitle } from '@/components/page-title';
import { HomeSkeleton } from '@/components/skeleton';
import { SignInForm } from '@/components/sign-in-form';
import { StickyBuildingHeader } from '@/components/sticky-building-header';
import { HIDDEN_GROUP_ID, HIDDEN_GROUP_LABEL, fallbackBuilding } from '@/config/buildings';
import { approxRemaining } from '@/lib/expiry';
import { useSession } from '@/lib/session';
import { APP_NAME, latchTitle } from '@/lib/title';
import { color, groupInk, type } from '@/lib/theme';
import {
  differsFromBaseLayout,
  groupDoors,
  layoutForDoors,
  userHiddenDoors,
} from '@/lib/zones';

export default function BuildingScreen() {
  const { mode, bootError, guestExpiresAt } = useSession();
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (mode !== 'guest' || guestExpiresAt === null) {
      return;
    }
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [guestExpiresAt, mode]);

  if (mode === 'loading') {
    return (
      <AppShell>
        <PageTitle title={latchTitle()} />
        <HomeSkeleton />
      </AppShell>
    );
  }

  if (mode === 'signed_out') {
    return (
      <AppShell>
        <PageTitle title={latchTitle('Sign in')} />
        <View style={styles.loginIdentity}>
          <AppMark />
          <Text style={styles.loginTitle}>{APP_NAME}</Text>
        </View>
        <View style={styles.loginDock}>
          {bootError !== null ? <Text style={styles.error}>{bootError}</Text> : null}
          <SignInForm />
        </View>
      </AppShell>
    );
  }

  const clock = now === 0 ? Date.now() : now;
  if (
    mode === 'guest' &&
    (bootError !== null ||
      (guestExpiresAt !== null && clock >= guestExpiresAt))
  ) {
    return <DeadKey detail={bootError} />;
  }

  return <SignedInHome />;
}

function SignedInHome() {
  const { top: topInset } = useSafeAreaInsets();
  const {
    isDemo,
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
    refreshDoors,
    mode,
    guestExpiresAt,
    guestInvite,
  } = useSession();
  const guest = mode === 'guest';
  const pathname = usePathname();
  const guestSecret = /^\/k\/([^/]+)$/.exec(pathname)?.[1] ?? null;
  const [now, setNow] = useState(0);
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
  const canReset = differsFromBaseLayout(
    doors,
    zoneByDoorId,
    arrangement,
    hiddenByDoorId,
  );
  useEffect(() => {
    if (!guest || guestExpiresAt === null) {
      return;
    }
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [guest, guestExpiresAt]);

  const heroUri = layout.hero?.uri ?? fallbackBuilding.hero?.uri;
  const title = layout.displayName ?? (buildingName.length > 0 ? buildingName : APP_NAME);
  const kicker = guest
    ? (layout.address ?? guestKicker(guestExpiresAt, now))
    : arranging
      ? 'Drag sections to reorder'
      : (layout.address ?? '');
  const empty = groups.length === 0 && hidden.length === 0;
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
      [heroH.value - topInset - 84, heroH.value - topInset - 32],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const syncPinnedSection = (y: number) => {
    const pin = y + topInset + 76;
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
    const pinned = y > heroHRef.current - topInset - 48;
    if (pinned !== pinnedRef.current) {
      pinnedRef.current = pinned;
      setChromePinned(pinned);
    }
  };

  return (
    <AppShell edgeToEdge>
      <PageTitle title={latchTitle(title)} />
      <Sortable.PortalProvider enabled={arranging}>
        <View style={styles.screen}>
            <Animated.ScrollView
              ref={scrollableRef}
              style={styles.scroller}
              contentContainerStyle={styles.scrollerContent}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                const y = event.nativeEvent.contentOffset.y;
                scrollY.value = y;
                syncPinnedSection(y);
              }}
            >
              <View
                style={[
                  styles.heroBlock,
                  { paddingTop: topInset },
                  heroUri ? { minHeight: 200 + topInset } : null,
                ]}
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
                      guest={guest}
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
                  {bootError !== null ? (
                    <View style={styles.errorRow}>
                      <Text style={styles.error}>{bootError}</Text>
                      <Pressable
                        onPress={() => {
                          void refreshDoors();
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.retry}>Retry</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
              {guest ? (
                <GuestBanner
                  invite={guestInvite}
                  expiresLabel={guestKicker(guestExpiresAt, now)}
                />
              ) : null}
              <View
                style={styles.listMeasure}
                onLayout={(event) => {
                  listYRef.current = event.nativeEvent.layout.y;
                }}
              >
                {empty && bootError === null ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>No doors yet</Text>
                    <Text style={styles.emptyBody}>
                      {APP_NAME} couldn’t find an unlockable door on this account.
                    </Text>
                    <Pressable
                      onPress={() => {
                        void refreshDoors();
                      }}
                      style={styles.emptyRetry}
                    >
                      <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                  </View>
                ) : empty ? null : (
                  <DoorList
                    groups={groups}
                    hidden={hidden}
                    arranging={arranging}
                    scrollableRef={scrollableRef}
                    openUntilByDoorId={openUntilByDoorId}
                    onUnlock={unlock}
                    onHide={guest ? undefined : hideDoor}
                    onReveal={guest ? undefined : showDoor}
                    onGroupLayout={(id, y) => {
                      sectionYRef.current[id] = y;
                    }}
                    reorderGroups={reorderGroups}
                    reorderDoors={reorderDoors}
                  />
                )}
              </View>
            </Animated.ScrollView>
            <StickyBuildingHeader
              title={title}
              section={pinnedSection}
              sectionInk={pinnedInk}
              style={stickyStyle}
              interactive={chromePinned}
              topInset={topInset}
              actions={
                <BuildingActions
                  guest={guest}
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
            {guest && guestSecret !== null && bootError === null ? (
              <GuestWelcome
                demo={isDemo}
                secret={guestSecret}
                buildingName={title}
                address={layout.address ?? null}
                mapsQuery={layout.mapsQuery ?? null}
              />
            ) : null}
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
    </AppShell>
  );
}

function guestKicker(expiresAt: number | null, now: number): string {
  if (expiresAt === null || now === 0) {
    return 'Guest access';
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return 'This key expired';
  }
  return approxRemaining(left);
}

function BuildingActions({
  guest,
  arranging,
  canReset,
  onToggleArrange,
  onReset,
}: {
  guest: boolean;
  arranging: boolean;
  canReset: boolean;
  onToggleArrange: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.toolbar}>
      {guest ? null : arranging && canReset ? (
        <IconButton icon={ArrowCounterClockwiseIcon} label="Reset order" onPress={onReset} />
      ) : null}
      {guest ? null : (
        <IconButton
          icon={ListIcon}
          label={arranging ? 'Done arranging' : 'Arrange sections'}
          active={arranging}
          onPress={onToggleArrange}
        />
      )}
      {guest ? null : (
        <IconButton
          icon={KeyIcon}
          label="Keys"
          onPress={() => {
            router.push('/keys');
          }}
        />
      )}
      <IconButton
        icon={GearSixIcon}
        label="Settings"
        onPress={() => {
          router.push('/settings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loginIdentity: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  loginTitle: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 34,
    lineHeight: 40,
  },
  loginDock: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 8,
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
  errorRow: {
    marginTop: 8,
    gap: 6,
  },
  error: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  retry: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 14,
    textDecorationLine: 'underline',
    textDecorationColor: color.accent,
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  emptyTitle: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  emptyBody: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyRetry: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
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
