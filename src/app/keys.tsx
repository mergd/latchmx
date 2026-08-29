import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { CaretDownIcon, CaretLeftIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { PageTitle } from '@/components/page-title';
import { KeysSkeleton } from '@/components/skeleton';
import { InviteDialog } from '@/components/invite-dialog';
import { approxRemaining, expiryCopy, expiryDialogBody } from '@/lib/expiry';
import { demoKeyPath } from '@/lib/demo';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';
import type { CreatedKey, IssuedKey, KeyTtl } from '@/lib/types';

export default function KeysScreen() {
  const { mode, account, isDemo, buildingName, createKey, listKeys, revokeKey } = useSession();
  const [keys, setKeys] = useState<IssuedKey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<IssuedKey | null>(null);
  const [now, setNow] = useState(0);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [expiredOpen, setExpiredOpen] = useState(false);

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

  const onCreate = async (input: {
    ttl: KeyTtl;
    label: string;
    note: string;
    inviterName: string;
    contact: string;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const next = await createKey(input);
      await refresh();
      const result = isDemo
        ? null
        : await shareText(next.url, inviteShareText(buildingName, next.expiresAt, next.createdAt));
      setComposing(false);
      setCreated(next);
      setCopied(result === 'copied');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create that key.');
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (created === null) {
      return;
    }
    const result = await shareText(
      created.url,
      inviteShareText(buildingName, created.expiresAt, now === 0 ? created.createdAt : now),
    );
    if (result === 'copied') {
      setCopied(true);
    }
  };

  const onCopy = async (key: IssuedKey) => {
    if (key.url === null) {
      return;
    }
    try {
      await Clipboard.setStringAsync(key.url);
      setCopiedKeyId(key.id);
      setError(null);
    } catch {
      setError('Could not copy that link.');
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

  const clock = now === 0 ? Date.now() : now;
  const live = (keys ?? []).filter((key) => key.expiresAt > clock);
  const expired = (keys ?? [])
    .filter((key) => key.expiresAt <= clock)
    .sort((left, right) => right.expiresAt - left.expiresAt);
  const signedIn = mode === 'signed_in';
  const loading = keys === null;

  return (
    <AppShell>
      <PageTitle title={latchTitle('Keys')} />
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton
              icon={CaretLeftIcon}
              label="Back"
              onPress={() => {
                router.back();
              }}
            />
            <Text style={styles.title}>Keys</Text>
          </View>
        </View>

        {isDemo ? (
          <Text style={styles.demoHint}>Demo invites work on this device only. Use Preview to try the guest experience.</Text>
        ) : null}
        {signedIn ? (
          <View style={styles.create}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Invite"
              onPress={() => {
                setError(null);
                setComposing(true);
              }}
              style={({ pressed }) => [
                styles.invite,
                pressed ? styles.invitePressed : null,
              ]}
            >
              <Text style={styles.inviteLabel}>Invite</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>Sign in to make an invite.</Text>
        )}

        {error !== null && !composing ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.list}>
          <Text style={styles.section}>Live invites</Text>
          {loading ? (
            <KeysSkeleton />
          ) : live.length === 0 ? (
            <Text style={styles.empty}>No live invites.</Text>
          ) : (
            live.map((key) => (
              <InviteRow
                key={key.id}
                invite={key}
                clock={clock}
                isDemo={isDemo}
                copied={copiedKeyId === key.id}
                onCopy={() => {
                  void onCopy(key);
                }}
                onPreview={() => {
                  router.push(demoKeyPath(key.id));
                }}
                onRevoke={() => {
                  setPendingRevoke(key);
                }}
              />
            ))
          )}
        </View>
        {!loading && expired.length > 0 ? (
          <View style={styles.list}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expiredOpen
                  ? 'Hide expired invites'
                  : `Show ${expired.length} expired ${expired.length === 1 ? 'invite' : 'invites'}`
              }
              onPress={() => {
                setExpiredOpen((open) => !open);
              }}
              style={({ pressed }) => [
                styles.fold,
                pressed ? styles.invitePressed : null,
              ]}
            >
              <Text style={styles.section}>Expired</Text>
              <View style={styles.foldMeta}>
                <Text style={styles.foldCount}>{expired.length}</Text>
                <View style={expiredOpen ? styles.foldCaretOpen : null}>
                  <CaretDownIcon color={color.muted} size={16} weight="bold" />
                </View>
              </View>
            </Pressable>
            {expiredOpen
              ? expired.map((key) => (
                  <InviteRow
                    key={key.id}
                    invite={key}
                    clock={clock}
                    expired
                    isDemo={isDemo}
                    copied={false}
                    onRevoke={() => {
                      setPendingRevoke(key);
                    }}
                  />
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      <InviteDialog
        visible={composing}
        busy={busy}
        error={error}
        defaultName={account?.name?.trim() ?? ''}
        defaultContact={account?.email?.trim() ?? ''}
        onClose={() => {
          if (!busy) {
            setComposing(false);
            setError(null);
          }
        }}
        onCreate={(input) => {
          void onCreate(input);
        }}
      />
      <ConfirmDialog
        visible={created !== null}
        title={isDemo ? 'Demo invite created' : 'Invite is live'}
        body={
          created === null
            ? ''
            : isDemo
              ? 'Preview the guest experience on this device. This invite cannot open real doors.'
              : copied
              ? `Link copied. ${expiryCopy(created.expiresAt, now === 0 ? created.expiresAt : now).until.replace(/^Until /, 'Dies at ')}.`
              : expiryDialogBody(created.expiresAt, now === 0 ? created.expiresAt : now, created.url)
        }
        confirmLabel={
          isDemo ? 'Preview invite' : copied ? 'Done' : Platform.OS === 'web' ? 'Copy link' : 'Share again'
        }
        onCancel={() => {
          setCreated(null);
          setCopied(false);
        }}
        onConfirm={() => {
          if (isDemo && created !== null) {
            const id = created.id;
            setCreated(null);
            router.push(demoKeyPath(id));
            return;
          }
          if (copied) {
            setCreated(null);
            setCopied(false);
            return;
          }
          if (Platform.OS === 'web' && created !== null) {
            void Clipboard.setStringAsync(created.url).then(() => {
              setCopied(true);
            });
            return;
          }
          void onShare();
        }}
      />
      <ConfirmDialog
        visible={pendingRevoke !== null}
        title="Revoke this invite?"
        body={isDemo ? 'This demo invite will stop working on this device.' : 'The link dies immediately. Anyone holding it loses the doors.'}
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

function InviteRow({
  invite,
  clock,
  expired = false,
  isDemo,
  copied,
  onCopy,
  onPreview,
  onRevoke,
}: {
  invite: IssuedKey;
  clock: number;
  expired?: boolean;
  isDemo: boolean;
  copied: boolean;
  onCopy?: () => void;
  onPreview?: () => void;
  onRevoke: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, expired ? styles.rowTitleExpired : null]}>
          {invite.label}
        </Text>
        <Text style={styles.rowHint}>
          {remainingLabel(invite.expiresAt, clock)} ·{' '}
          {invite.doorCount > 0 ? `${invite.doorCount} doors` : 'All doors'}
        </Text>
      </View>
      <View style={styles.rowActions}>
        {!expired && isDemo && onPreview !== undefined ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Preview ${invite.label}`}
            onPress={onPreview}
            style={styles.rowAction}
          >
            <Text style={styles.copyLabel}>Preview</Text>
          </Pressable>
        ) : null}
        {!expired && invite.url !== null && onCopy !== undefined ? (
          <Pressable
            onPress={onCopy}
            style={({ pressed }) => [
              styles.rowAction,
              pressed ? styles.invitePressed : null,
            ]}
          >
            <Text style={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onRevoke}
          style={({ pressed }) => [
            styles.rowAction,
            pressed ? styles.invitePressed : null,
          ]}
        >
          <Text style={styles.revokeLabel}>Revoke</Text>
        </Pressable>
      </View>
    </View>
  );
}

function inviteShareText(buildingName: string, expiresAt: number, now: number): string {
  const place = buildingName.trim() || 'the building';
  return `Here's my invite to ${place} - it expires in ${expiresInCopy(expiresAt, now)}`;
}

function expiresInCopy(expiresAt: number, now: number): string {
  const left = expiresAt - now;
  if (left <= 0) {
    return 'a moment';
  }
  if (left < 90 * 60_000) {
    const minutes = Math.max(1, Math.round(left / 60_000));
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  const hours = Math.max(1, Math.round(left / 3_600_000));
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

function remainingLabel(expiresAt: number, now: number): string {
  if (now === 0) {
    return 'Live';
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return 'Expired';
  }
  return approxRemaining(left);
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
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
  create: {
    paddingHorizontal: 16,
  },
  demoHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  invite: {
    backgroundColor: color.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    cursor: 'pointer',
  },
  invitePressed: {
    opacity: 0.78,
  },
  inviteLabel: {
    color: color.onAccent,
    fontFamily: type.body,
    fontSize: 16,
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
  fold: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    cursor: 'pointer',
  },
  foldMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  foldCount: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  foldCaretOpen: {
    transform: [{ rotate: '180deg' }],
  },
  section: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    paddingHorizontal: 4,
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
    minHeight: 72,
    paddingHorizontal: 4,
    paddingVertical: 12,
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
  rowTitleExpired: {
    color: color.muted,
  },
  rowHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rowAction: {
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 12,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  copyLabel: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 14,
  },
  revokeLabel: {
    color: color.bad,
    fontFamily: type.body,
    fontSize: 14,
  },
});
