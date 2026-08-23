import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type StorageOptions = {
  secure?: boolean;
};

export async function storageGet(
  key: string,
  options: StorageOptions = {},
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return null;
      }
      return window.localStorage.getItem(key);
    }
    if (options.secure === true) {
      return await SecureStore.getItemAsync(key);
    }
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
    const legacy = await SecureStore.getItemAsync(key);
    if (legacy !== null) {
      await AsyncStorage.setItem(key, legacy);
      await SecureStore.deleteItemAsync(key);
    }
    return legacy;
  } catch {
    return null;
  }
}

export async function storageSet(
  key: string,
  value: string,
  options: StorageOptions = {},
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.setItem(key, value);
      return;
    }
    if (options.secure === true) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    return;
  }
}

export async function storageRemove(
  key: string,
  options: StorageOptions = {},
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.removeItem(key);
      return;
    }
    if (options.secure === true) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch {
    return;
  }
}
