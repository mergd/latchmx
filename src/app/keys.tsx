import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { expiryCopy, expiryDialogBody } from '@/lib/expiry';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { color, type } from '@/lib/theme';
import type { CreatedKey, IssuedKey, KeyTtl } from '@/lib/types';

const DURATIONS: { ttl: KeyTtl; label: string; hint: string }[] = [
  { ttl: '1h', label: '1 hour', hint: 'For someone on the way' },
  { ttl: 'tonight', label: 'Tonight', hint: 'Dies at midnight Pacific' },
  { ttl: '24h', label: '24 hours', hint: 'Overnight, then gone' },
];

export default function KeysScreen() {
  const { mode, createKey, listKeys, revokeKey } = useSession();
  const [keys, setKeys] = useState<IssuedKey[] | null>(null);
  const [busy, setBusy] = useState<KeyTtl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<IssuedKey | null>(null);
  const [now, setNow] = useState(0);

  const refresh = useCallback(async () => {
    const next = await listKeys();
    setKeys(next.filter((key) => !key.revoked));
  }, [listKeys]);

  useEffect(() => {
    let cancelled = false;
    void listKeys()
      .then((next) => {
        if (!cancelled) {
          setKeys(next.filter((key) => !key.revoked));
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setKeys([]);
          setError(caught instanceof Error ? caught.message : 'Could not load keys.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listKeys]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const onCreate = async (ttl: KeyTtl) => {
    setBusy(ttl);
    setError(null);
    try {
      const next = await createKey(ttl);
      await refresh();
      const when = expiryCopy(next.expiresAt, Date.now()).until.replace(/^Until /, '');
      const result = await shareText(next.url, `Latch key — dies at ${when}`);
      if (result === 'copied') {
        setCreated(next);
        setCopied(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create that key.');
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (created === null) {
      return;
    }
    const when = expiryCopy(created.expiresAt, Date.now()).until.replace(/^Until /, '');
    const result = await shareText(created.url, `Latch key — dies at ${when}`);
    if (result === 'copied') {
      setCopied(true);
    }
  };

  const onRevoke = async () => {
    if (pendingRevoke === null) {
      return;
    }
    const id = pendingRevoke.id;
    setPendingRevoke(null);
    try {
      await revokeKey(id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not revoke that key.');
    }
  };

  const live = (keys ?? []).filter((key) => now === 0 || key.expiresAt > now);
  const signedIn = mode === 'signed_in';
  const loading = keys === null;

  return (
    <AppShell>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton
            icon={ChevronLeft}
            label="Back"
            onPress={() => {
              router.back();
            }}
          />
          <Text style={styles.title}>Keys</Text>
        </View>
        <Text style={styles.lede}>
          A link opens Latch in the browser. No PIN. It dies when the clock runs out.
        </Text>
      </View>

      {signedIn ? (
        <View style={styles.durations}>
          {DURATIONS.map((item) => (
            <Pressable
              key={item.ttl}
              disabled={busy !== null}
              onPress={() => {
                void onCreate(item.ttl);
              }}
              style={({ pressed }) => [
                styles.duration,
                pressed ? styles.durationPressed : null,
                busy === item.ttl ? styles.durationBusy : null,
              ]}
            >
              <Text style={styles.durationLabel}>{item.label}</Text>
              <Text style={styles.durationHint}>{item.hint}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Sign in to mint a key.</Text>
      )}

      {error !== null ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        <Text style={styles.section}>Live</Text>
        {loading ? (
          <ActivityIndicator color={color.accent} style={styles.spinner} />
        ) : live.length === 0 ? (
          <Text style={styles.empty}>No live keys.</Text>
        ) : (
          live.map((key) => (
            <View key={key.id} style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{remainingLabel(key.expiresAt, now)}</Text>
                <Text style={styles.rowHint}>
                  {key.doorCount > 0 ? `${key.doorCount} doors` : 'All doors'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setPendingRevoke(key);
                }}
                style={({ pressed }) => [
                  styles.revoke,
                  pressed ? styles.durationPressed : null,
                ]}
              >
                <Text style={styles.revokeLabel}>Revoke</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <ConfirmDialog
        visible={created !== null}
        title="Key is live"
        body={
          created === null
            ? ''
            : copied
              ? `Link copied. ${expiryCopy(created.expiresAt, now === 0 ? created.expiresAt : now).until.replace(/^Until /, 'Dies at ')}.`
              : expiryDialogBody(created.expiresAt, now === 0 ? created.expiresAt : now, created.url)
        }
        confirmLabel={
          copied ? 'Done' : Platform.OS === 'web' ? 'Copy link' : 'Share'
        }
        onCancel={() => {
          setCreated(null);
          setCopied(false);
        }}
        onConfirm={() => {
          if (copied) {
            setCreated(null);
            setCopied(false);
            return;
          }
          void onShare();
        }}
      />
      <ConfirmDialog
        visible={pendingRevoke !== null}
        title="Revoke this key?"
        body="The link dies immediately. Anyone holding it loses the doors."
        confirmLabel="Revoke"
        onCancel={() => {
          setPendingRevoke(null);
        }}
        onConfirm={() => {
          void onRevoke();
        }}
      />
    </AppShell>
  );
}

function remainingLabel(expiresAt: number, now: number): string {
  if (now === 0) {
    return 'Live';
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return 'Expired';
  }
  if (left < 60_000) {
    return `${Math.max(1, Math.ceil(left / 1000))}s left`;
  }
  if (left < 60 * 60_000) {
    return `${Math.ceil(left / 60_000)}m left`;
  }
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.ceil((left % 3_600_000) / 60_000);
  if (minutes === 60) {
    return `${hours + 1}h left`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
    gap: 10,
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
  lede: {
    paddingHorizontal: 4,
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  durations: {
    paddingHorizontal: 12,
    gap: 8,
  },
  duration: {
    minHeight: 72,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: color.surface,
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  durationPressed: {
    opacity: 0.78,
  },
  durationBusy: {
    opacity: 0.6,
  },
  durationLabel: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 17,
  },
  durationHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  error: {
    marginTop: 16,
    marginHorizontal: 20,
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
  list: {
    marginTop: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  section: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  spinner: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  empty: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: color.text,
    fontFamily: type.body,
    fontSize: 16,
  },
  rowHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  revoke: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  revokeLabel: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
});
