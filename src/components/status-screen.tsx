import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppMark } from '@/components/app-mark';
import { PageTitle } from '@/components/page-title';
import { latchTitle } from '@/lib/title';
import { color, type } from '@/lib/theme';

type StatusScreenProps = {
  title: string;
  body?: string | null;
  tabTitle?: string | false;
  children?: ReactNode;
};

export function StatusScreen({
  title,
  body,
  tabTitle,
  children,
}: StatusScreenProps) {
  const detail =
    body !== null && body !== undefined && body.trim().length > 0
      ? body.trim()
      : null;

  return (
    <View style={styles.wrap}>
      {tabTitle === false ? null : (
        <PageTitle title={latchTitle(tabTitle ?? title)} />
      )}
      <AppMark />
      <Text style={styles.title}>{title}</Text>
      {detail !== null ? <Text style={styles.body}>{detail}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  title: {
    color: color.text,
    fontFamily: type.title,
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  body: {
    color: color.muted,
    fontFamily: type.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
