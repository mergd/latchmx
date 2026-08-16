import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function hapticImpact(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function hapticError(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
