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
const SCAN_MS = 5000;

export function useNearbyDoors(doors: Door[], active: boolean) {
  const eligible = useMemo(
    () => doors.filter((door) => (door.nearbyIdentifiers?.length ?? 0) > 0),
    [doors],
  );
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<NearbyDoorMatch[]>([]);
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

  const scan = useCallback(
    async (source: 'automatic' | 'manual') => {
      if (
        Platform.OS !== 'ios' ||
        !active ||
        eligible.length === 0 ||
        scanInFlight.current
      ) {
        return;
      }
      const sequence = ++scanSequence.current;
      const startedAt = Date.now();
      scanInFlight.current = true;
      setScanning(true);
      setMatches([]);
      try {
        // WaveLynx readers may carry their authorized serial only in service
        // data, without a local name. Keep them in the private scan result and
        // let the exact allowlist matcher decide whether they reach the UI.
        const peripherals = await NearbyDoors.scanAsync(SCAN_MS, true);
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
          capture('nearby_scan_failed', {
            source,
            error_code: nearbyErrorCode(caught),
            eligible_door_count: eligible.length,
            elapsed_ms: Date.now() - startedAt,
          });
        }
      } finally {
        if (sequence === scanSequence.current) {
          scanInFlight.current = false;
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
    const initial = setTimeout(() => {
      void scan('automatic');
    }, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void scan('automatic');
      } else {
        scanSequence.current += 1;
        scanInFlight.current = false;
        setMatches([]);
        setScanning(false);
        void NearbyDoors.stopAsync();
      }
    });
    return () => {
      clearTimeout(initial);
      scanSequence.current += 1;
      scanInFlight.current = false;
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
    enable,
    refresh: () => scan('manual'),
  };
}
