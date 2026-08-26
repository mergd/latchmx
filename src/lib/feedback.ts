import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { capture } from '@/lib/analytics';
import { build, buildLabel, buildStamp } from '@/lib/build';

export async function openFeedback(): Promise<void> {
  capture('feedback_opened', { hash: build.hash || buildStamp() });
  const device = [Device.modelName, Device.osName, Device.osVersion]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' · ');
  const subject = `Latch feedback · ${buildStamp()}`;
  const diagnostics = [`Latch ${buildLabel()}`, Platform.OS];
  if (device.length > 0) {
    diagnostics.push(device);
  }
  const body = `\n\n—\n${diagnostics.join('\n')}`;
  const url = `mailto:${build.feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  await Linking.openURL(url);
}
