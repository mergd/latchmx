import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/lib/session';
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

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        {status === 'error' ? 'Could not connect' : 'Connecting…'}
      </Text>
      {message !== null ? <Text style={styles.body}>{message}</Text> : null}
      {status === 'error' ? (
        <Text
          style={styles.link}
          onPress={() => {
            setStatus('done');
          }}
        >
          Back to Latch
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.canvas,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 28,
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: color.accent,
    fontFamily: type.body,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
