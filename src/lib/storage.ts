import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
