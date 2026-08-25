import { Platform, Share } from 'react-native';

export async function shareText(
  value: string,
  title?: string,
): Promise<'copied' | 'shared'> {
  if (Platform.OS !== 'web') {
    await Share.share(
      Platform.OS === 'ios'
        ? { url: value, message: title }
        : { message: title === undefined ? value : `${title}\n${value}` },
    );
    return 'shared';
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        url: value,
        text: title,
        title: title ?? 'Latch',
      });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'shared';
      }
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(value);
    return 'copied';
  }
  throw new Error('Could not share that link.');
}
