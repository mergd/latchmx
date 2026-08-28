import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IconButton } from '@/components/icon-button';
import { PageTitle } from '@/components/page-title';
import { KeysSkeleton } from '@/components/skeleton';
import { InviteDialog } from '@/components/invite-dialog';
import { approxRemaining, expiryCopy, expiryDialogBody } from '@/lib/expiry';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { APP_NAME, latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';
import type { CreatedKey, IssuedKey, KeyTtl } from '@/lib/types';

export default function KeysScreen() {
  const { mode, account, createKey, listKeys, revokeKey } = useSession();
  const [keys, setKeys] = useState<IssuedKey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<IssuedKey | null>(null);
  const [now, setNow] = useState(0);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

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
      const when = expiryCopy(next.expiresAt, next.createdAt).until.replace(
        /^Until /,
        '',
      );
      const result = await shareText(next.url, inviteShareText(next, when));
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
    const when = expiryCopy(
      created.expiresAt,
      now === 0 ? created.createdAt : now,
    ).until.replace(/^Until /, '');
    const result = await shareText(created.url, inviteShareText(created, when));
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
              <View key={key.id} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{key.label}</Text>
                  <Text style={styles.rowHint}>
                    {remainingLabel(key.expiresAt, now)} ·{' '}
                    {key.doorCount > 0 ? `${key.doorCount} doors` : 'All doors'}
                  </Text>
                  {key.contact !== null ? (
                    <Text style={styles.rowNote} numberOfLines={1}>
                      {key.contact}
                    </Text>
                  ) : null}
                  {key.note !== null ? (
                    <Text style={styles.rowNote} numberOfLines={2}>
                      {key.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  {key.url !== null ? (
                    <Pressable
                      onPress={() => {
                        void onCopy(key);
                      }}
                      style={({ pressed }) => [
                        styles.rowAction,
                        pressed ? styles.invitePressed : null,
                      ]}
                    >
                      <Text style={styles.copyLabel}>
                        {copiedKeyId === key.id ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setPendingRevoke(key);
                    }}
                    style={({ pressed }) => [
                      styles.rowAction,
                      pressed ? styles.invitePressed : null,
                    ]}
                  >
                    <Text style={styles.revokeLabel}>Revoke</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
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
        title="Invite is live"
        body={
          created === null
            ? ''
            : copied
              ? `Link copied. ${expiryCopy(created.expiresAt, now === 0 ? created.expiresAt : now).until.replace(/^Until /, 'Dies at ')}.`
              : expiryDialogBody(created.expiresAt, now === 0 ? created.expiresAt : now, created.url)
        }
        confirmLabel={
          copied ? 'Done' : Platform.OS === 'web' ? 'Copy link' : 'Share again'
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

function inviteShareText(key: IssuedKey, when: string): string {
  const from = key.inviterName === null ? '' : ` from ${key.inviterName}`;
  const reach = key.contact === null ? '' : ` Reach them at ${key.contact}.`;
  return `${key.label}${from}. ${APP_NAME} access ends at ${when}.${reach}`;
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
  rowHint: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 13,
  },
  rowNote: {
    marginTop: 4,
    color: color.text,
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
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
