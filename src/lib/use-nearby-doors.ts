import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

import NearbyDoors from '../../modules/nearby-doors';
import { capture } from './analytics';
import {
  nearbyErrorCode,
  nearbyScanProperties,
} from './nearby-diagnostic-data';
import {
  rankNearbyDoors,
  stabilizeNearbyDoors,
  type NearbyDoorMatch,
} from './nearby-ranking';
import {
  loadNearbyDoorPreferences,
  recordNearbyDoorSelection,
  type NearbyDoorPreferences,
} from './nearby-preferences';
import { storageGet, storageSet } from './storage';
import type { Door } from './types';

const ENABLED_KEY = 'latch.nearby-doors.enabled';
const INITIAL_SCAN_MS = 750;
const SCAN_MS = 3000;
const SCAN_INTERVAL_MS = 4000;

export function useNearbyDoors(doors: Door[], active: boolean) {
  const eligible = useMemo(
    () => doors.filter((door) => (door.nearbyIdentifiers?.length ?? 0) > 0),
    [doors],
  );
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [matches, setMatches] = useState<NearbyDoorMatch[]>([]);
  const [preferences, setPreferences] = useState<NearbyDoorPreferences>({});
  const preferencesRef = useRef<NearbyDoorPreferences>({});
  const scanSequence = useRef(0);
  const scanInFlight = useRef(false);

  useEffect(() => {
    let mounted = true;
    void storageGet(ENABLED_KEY).then((value) => {
      if (mounted) {
        setEnabled(value === 'true');
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadNearbyDoorPreferences().then((stored) => {
      if (mounted) {
        preferencesRef.current = stored;
        setPreferences(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const scan = useCallback(
    async (durationMilliseconds = SCAN_MS) => {
      if (
        (Platform.OS !== 'ios' && Platform.OS !== 'android') ||
        !active ||
        AppState.currentState !== 'active' ||
        eligible.length === 0 ||
        scanInFlight.current
      ) {
        return;
      }
      const sequence = ++scanSequence.current;
      const startedAt = Date.now();
      scanInFlight.current = true;
      try {
        // WaveLynx readers may carry their authorized serial only in service
        // data, without a local name. Keep them in the private scan result and
        // let the exact allowlist matcher decide whether they reach the UI.
        const peripherals = await NearbyDoors.scanAsync(
          durationMilliseconds,
          true,
        );
        if (sequence === scanSequence.current) {
          const nextMatches = rankNearbyDoors(eligible, peripherals, preferences);
          setMatches(nextMatches);
          capture('nearby_scan_completed', {
            source: 'automatic',
            ...nearbyScanProperties(
              peripherals,
              nextMatches,
              eligible.length,
              Date.now() - startedAt,
            ),
          });
        }
      } catch (caught) {
        if (sequence === scanSequence.current) {
          setMatches([]);
          capture('nearby_scan_failed', {
            source: 'automatic',
            error_code: nearbyErrorCode(caught),
            eligible_door_count: eligible.length,
            elapsed_ms: Date.now() - startedAt,
          });
        }
      } finally {
        if (sequence === scanSequence.current) {
          scanInFlight.current = false;
        }
      }
    },
    [active, eligible, preferences],
  );

  useFocusEffect(useCallback(() => {
    if (
      !loaded ||
      !enabled ||
      !active ||
      (Platform.OS !== 'ios' && Platform.OS !== 'android') ||
      eligible.length === 0
    ) {
      return;
    }
    setMatches([]);
    if (
      (Platform.OS === 'ios' || Platform.OS === 'android') &&
      typeof NearbyDoors.startContinuousAsync === 'function' &&
      typeof NearbyDoors.addListener === 'function'
    ) {
      const startedAt = Date.now();
      let reportedFirstMatch = false;
      const subscription = NearbyDoors.addListener(
        'onNearbyPeripherals',
        ({ peripherals }) => {
          const nextMatches = rankNearbyDoors(eligible, peripherals, preferencesRef.current);
          setMatches((current) => stabilizeNearbyDoors(current, nextMatches));
          if (!reportedFirstMatch && nextMatches.length > 0) {
            reportedFirstMatch = true;
            capture('nearby_scan_completed', {
              source: 'continuous_first_match',
              optimistic: true,
              ...nearbyScanProperties(
                peripherals,
                nextMatches,
                eligible.length,
                Date.now() - startedAt,
              ),
            });
          }
        },
      );
      void NearbyDoors.startContinuousAsync(true).catch((caught) => {
        setMatches([]);
        capture('nearby_scan_failed', {
          source: 'continuous',
          error_code: nearbyErrorCode(caught),
          eligible_door_count: eligible.length,
          elapsed_ms: Date.now() - startedAt,
        });
      });
      const appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
          setMatches([]);
          void NearbyDoors.stopAsync();
        } else {
          void NearbyDoors.startContinuousAsync(true).catch(() => {});
        }
      });
      return () => {
        subscription.remove();
        appStateSubscription.remove();
        setMatches([]);
        void NearbyDoors.stopAsync();
      };
    }
    const initial = setTimeout(() => {
      void scan(INITIAL_SCAN_MS).then(() => scan());
    }, 0);
    const interval = setInterval(() => void scan(), SCAN_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void scan();
      } else {
        scanSequence.current += 1;
        scanInFlight.current = false;
        setMatches([]);
        void NearbyDoors.stopAsync();
      }
    });
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      scanSequence.current += 1;
      scanInFlight.current = false;
      void NearbyDoors.stopAsync();
      subscription.remove();
    };
  }, [active, eligible, enabled, loaded, scan]));

  const enable = useCallback(async () => {
    if (Platform.OS === 'android') {
      const permissions =
        typeof Platform.Version === 'number' && Platform.Version >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]
          : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      if (
        permissions.some(
          (permission) =>
            results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
        )
      ) {
        capture('nearby_suggestions_permission_denied');
        return;
      }
    }
    await storageSet(ENABLED_KEY, 'true');
    setEnabled(true);
    capture('nearby_suggestions_enabled', {
      eligible_door_count: eligible.length,
    });
  }, [eligible.length]);

  const recordSelection = useCallback(async (door: Door) => {
    const next = await recordNearbyDoorSelection(preferencesRef.current, door);
    preferencesRef.current = next;
    setPreferences(next);
    capture('nearby_suggestion_preference_recorded');
  }, []);

  return {
    available:
      (Platform.OS === 'ios' || Platform.OS === 'android') &&
      active &&
      eligible.length > 0,
    enabled,
    matches,
    enable,
    recordSelection,
  };
}
