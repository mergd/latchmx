import Head from 'expo-router/head';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = title;
    }
  }, [title]);

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
