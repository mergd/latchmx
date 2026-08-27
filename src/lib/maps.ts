import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function mapsSearchUrl(query: string): string {
  const q = encodeURIComponent(query);
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export async function openMapsSearch(query: string): Promise<void> {
  const url = mapsSearchUrl(query);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  await Linking.openURL(url);
}
