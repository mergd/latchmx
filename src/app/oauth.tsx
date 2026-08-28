import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FlapLoader } from '@/components/flap-loader';
import { PageTitle } from '@/components/page-title';
import { StatusScreen } from '@/components/status-screen';
import { useSession } from '@/lib/session';
import { APP_NAME, latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';

export default function OAuthRedirect() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const { completeSignIn, mode } = useSession();
  const [status, setStatus] = useState<'wait' | 'done' | 'error'>('wait');
  const [message, setMessage] = useState<string | null>(null);
  const raw = params.code;
  const code = Array.isArray(raw) ? raw[0] : raw;

  useEffect(() => {
    if (mode === 'loading') {
      return;
    }
    if (code === undefined || code.length === 0) {
      setStatus('done');
      return;
    }
    let cancelled = false;
    void completeSignIn(code)
      .then(() => {
        if (!cancelled) {
          setStatus('done');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Sign-in failed.',
          );
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, completeSignIn, mode]);

  if (status === 'done') {
    return <Redirect href="/" />;
  }

  if (status === 'error') {
    return (
      <View style={styles.screen}>
        <StatusScreen title="Could not connect" body={message}>
          <Pressable
            onPress={() => {
              setStatus('done');
            }}
            hitSlop={8}
          >
            <Text style={styles.link}>Back to {APP_NAME}</Text>
          </Pressable>
        </StatusScreen>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PageTitle title={latchTitle('Connecting')} />
      <View style={styles.wait}>
        <FlapLoader size={64} />
        <Text style={styles.waitTitle}>Connecting…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  wait: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  waitTitle: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 28,
  },
  link: {
    marginTop: 4,
    color: color.accent,
    fontFamily: type.body,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
