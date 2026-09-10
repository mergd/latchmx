import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import NearbyDoors, { type NearbyPeripheral } from '../../modules/nearby-doors';
import { AppShell } from '@/components/app-shell';
import { IconButton } from '@/components/icon-button';
import { PageTitle } from '@/components/page-title';
import { capture } from '@/lib/analytics';
import { buildLabel } from '@/lib/build';
import { useI18n } from '@/lib/i18n/context';
import {
  nearbyErrorCode,
  nearbyScanProperties,
  sanitizedReaderSamples,
} from '@/lib/nearby-diagnostic-data';
import { setDiagnosticsEnabled } from '@/lib/nearby-diagnostics';
import { rankNearbyDoors } from '@/lib/nearby-ranking';
import { useSession } from '@/lib/session';
import { APP_NAME, latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';

const SCAN_MS = 5000;

export default function DiagnosticsScreen() {
  const { t } = useI18n();
  const { doors, mode, isDemo } = useSession();
  const [peripherals, setPeripherals] = useState<NearbyPeripheral[]>([]);
  const [scanning, setScanning] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const eligible = useMemo(
    () => doors.filter((door) => (door.nearbyIdentifiers?.length ?? 0) > 0),
    [doors],
  );
  const matches = useMemo(
    () => rankNearbyDoors(eligible, peripherals),
    [eligible, peripherals],
  );
  const matchByReader = useMemo(() => {
    const result = new Map<string, string>();
    for (const peripheral of peripherals) {
      const match = rankNearbyDoors(eligible, [peripheral])[0];
      if (match !== undefined) {
        result.set(peripheral.id, match.door.name);
      }
    }
    return result;
  }, [eligible, peripherals]);

  useEffect(() => {
    if (mode !== 'signed_in' || isDemo) {
      router.replace('/settings');
    }
  }, [isDemo, mode]);

  const scan = async () => {
    const startedAt = Date.now();
    setScanning(true);
    setCopied(false);
    setErrorCode(null);
    try {
      const next = await NearbyDoors.scanAsync(SCAN_MS, true);
      const nextMatches = rankNearbyDoors(eligible, next);
      const matchedReaderIds = new Set(
        next
          .filter((item) => rankNearbyDoors(eligible, [item]).length > 0)
          .map((item) => item.id),
      );
      setPeripherals(next);
      capture('bluetooth_diagnostic_scan_completed', {
        ...nearbyScanProperties(
          next,
          nextMatches,
          eligible.length,
          Date.now() - startedAt,
        ),
        readers: sanitizedReaderSamples(next, matchedReaderIds),
      });
    } catch (error) {
      const code = nearbyErrorCode(error);
      setPeripherals([]);
      setErrorCode(code);
      capture('bluetooth_diagnostic_scan_failed', {
        error_code: code,
        eligible_door_count: eligible.length,
        elapsed_ms: Date.now() - startedAt,
      });
    } finally {
      setScanning(false);
    }
  };

  const copyReport = async () => {
    const report = {
      product: APP_NAME,
      build: buildLabel(),
      generatedAt: new Date().toISOString(),
      eligibleDoorCount: eligible.length,
      errorCode,
      readers: peripherals.map((item) => ({
        ...item,
        name: item.name.length > 0 ? item.name : null,
        match: matchByReader.get(item.id) ?? null,
      })),
    };
    await Clipboard.setStringAsync(JSON.stringify(report, null, 2));
    setCopied(true);
    capture('bluetooth_diagnostic_report_copied', {
      reader_count: peripherals.length,
      matched_door_count: matches.length,
      had_error: errorCode !== null,
    });
  };

  if (mode !== 'signed_in' || isDemo) {
    return null;
  }

  return (
    <AppShell>
      <PageTitle title={latchTitle(t('diagnostics.title'))} />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <IconButton
            icon={CaretLeftIcon}
            label={t('common.back')}
            onPress={() => router.back()}
          />
          <Text style={styles.title}>{t('diagnostics.title')}</Text>
        </View>
        <Text style={styles.privacy}>{t('diagnostics.privacy')}</Text>
        <Text style={styles.eligible}>
          {t('diagnostics.eligible', { count: eligible.length })}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={scanning}
          onPress={() => void scan()}
          style={({ pressed }) => [
            styles.primary,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.primaryLabel}>
            {scanning ? t('diagnostics.scanning') : t('diagnostics.scan')}
          </Text>
        </Pressable>
        {errorCode !== null ? (
          <Text style={styles.error}>{errorCode}</Text>
        ) : null}
        {!scanning && peripherals.length === 0 ? (
          <Text style={styles.empty}>{t('diagnostics.noReaders')}</Text>
        ) : null}
        {peripherals.map((item) => {
          const match = matchByReader.get(item.id);
          const serviceUuids = [
            ...item.serviceUuids,
            ...item.overflowServiceUuids,
            ...item.solicitedServiceUuids,
          ];
          return (
            <View key={item.id} style={styles.reader}>
              <Text style={styles.readerName}>
                {item.name.length > 0 ? item.name : t('diagnostics.unnamed')}
              </Text>
              <Text style={styles.readerMeta}>
                {item.rssi} dBm · {item.samples} samples · {item.id}
              </Text>
              <Text selectable style={styles.readerDetail}>
                {t('diagnostics.connectable')}:{' '}
                {item.connectable === undefined
                  ? t('diagnostics.unknown')
                  : item.connectable
                    ? 'true'
                    : 'false'}
                {item.txPower === undefined ? '' : ` · TX ${item.txPower} dBm`}
              </Text>
              <Text selectable style={styles.readerDetail}>
                {t('diagnostics.services')}:{' '}
                {serviceUuids.length > 0 ? serviceUuids.join(', ') : '—'}
              </Text>
              <Text selectable style={styles.readerDetail}>
                {t('diagnostics.manufacturer')}:{' '}
                {item.manufacturerDataHex === undefined
                  ? '—'
                  : `${item.manufacturerId ?? '?'} · ${item.manufacturerDataHex}`}
              </Text>
              {item.serviceData.map((entry) => (
                <Text
                  key={`${item.id}-${entry.uuid}`}
                  selectable
                  style={styles.readerDetail}
                >
                  {entry.uuid}: {entry.hex}
                </Text>
              ))}
              <Text
                style={match === undefined ? styles.unmatched : styles.matched}
              >
                {match === undefined
                  ? t('diagnostics.unmatched')
                  : t('diagnostics.matched', { door: match })}
              </Text>
            </View>
          );
        })}
        {(peripherals.length > 0 || errorCode !== null) && !scanning ? (
          <Pressable onPress={() => void copyReport()} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>
              {copied ? t('common.copied') : t('diagnostics.copy')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            void setDiagnosticsEnabled(false).then(() =>
              router.replace('/settings'),
            );
          }}
          style={styles.disable}
        >
          <Text style={styles.disableLabel}>{t('diagnostics.disable')}</Text>
        </Pressable>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: color.text, fontFamily: type.title, fontSize: 30, flex: 1 },
  privacy: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  eligible: { color: color.muted, fontFamily: type.body, fontSize: 13 },
  primary: {
    backgroundColor: color.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  primaryLabel: { color: color.onAccent, fontFamily: type.body, fontSize: 15 },
  pressed: { opacity: 0.72 },
  error: { color: color.bad, fontFamily: type.body, fontSize: 13 },
  empty: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    paddingVertical: 12,
  },
  reader: {
    backgroundColor: color.fill,
    borderRadius: 14,
    padding: 14,
    gap: 3,
  },
  readerName: { color: color.text, fontFamily: type.body, fontSize: 16 },
  readerMeta: { color: color.muted, fontFamily: type.body, fontSize: 13 },
  readerDetail: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
  },
  matched: { color: color.ok, fontFamily: type.body, fontSize: 13 },
  unmatched: { color: color.muted, fontFamily: type.body, fontSize: 13 },
  secondary: {
    borderColor: color.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  secondaryLabel: { color: color.text, fontFamily: type.body, fontSize: 14 },
  disable: { alignItems: 'center', padding: 12, marginTop: 8 },
  disableLabel: { color: color.bad, fontFamily: type.body, fontSize: 14 },
});
