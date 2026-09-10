import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import NearbyDoors from '../../modules/nearby-doors';
import { capture } from './analytics';
import {
  nearbyErrorCode,
  nearbyScanProperties,
} from './nearby-diagnostic-data';
import { rankNearbyDoors, type NearbyDoorMatch } from './nearby-ranking';
import { storageGet, storageSet } from './storage';
import type { Door } from './types';

const ENABLED_KEY = 'latch.nearby-doors.enabled';
const SCAN_MS = 2200;

export function useNearbyDoors(doors: Door[], active: boolean) {
  const eligible = useMemo(
    () => doors.filter((door) => (door.nearbyIdentifiers?.length ?? 0) > 0),
    [doors],
  );
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<NearbyDoorMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scanSequence = useRef(0);

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

  const scan = useCallback(
    async (source: 'automatic' | 'manual') => {
      if (Platform.OS !== 'ios' || !active || eligible.length === 0) {
        return;
      }
      const sequence = ++scanSequence.current;
      const startedAt = Date.now();
      setScanning(true);
      setError(null);
      try {
        const peripherals = await NearbyDoors.scanAsync(SCAN_MS, false);
        if (sequence === scanSequence.current) {
          const nextMatches = rankNearbyDoors(eligible, peripherals);
          setMatches(nextMatches);
          capture('nearby_scan_completed', {
            source,
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
          setError(
            caught instanceof Error
              ? caught.message
              : 'Bluetooth is unavailable.',
          );
          capture('nearby_scan_failed', {
            source,
            error_code: nearbyErrorCode(caught),
            eligible_door_count: eligible.length,
            elapsed_ms: Date.now() - startedAt,
          });
        }
      } finally {
        if (sequence === scanSequence.current) {
          setScanning(false);
        }
      }
    },
    [active, eligible],
  );

  useEffect(() => {
    if (!loaded || !enabled) {
      return;
    }
    void scan('automatic');
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void scan('automatic');
      }
    });
    return () => {
      scanSequence.current += 1;
      void NearbyDoors.stopAsync();
      subscription.remove();
    };
  }, [enabled, loaded, scan]);

  const enable = useCallback(async () => {
    await storageSet(ENABLED_KEY, 'true');
    setEnabled(true);
    capture('nearby_suggestions_enabled', {
      eligible_door_count: eligible.length,
    });
  }, [eligible.length]);

  return {
    available: Platform.OS === 'ios' && active && eligible.length > 0,
    enabled,
    scanning,
    matches,
    error,
    enable,
    refresh: () => scan('manual'),
  };
}
