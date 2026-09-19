import { I18n, type TranslateOptions } from 'i18n-js';

import { en, type Messages } from './en';
import { es } from './es';
import { hi } from './hi';
import { type AppLocale, localeTag, resolveLocale } from './locales';
import { ne } from './ne';
import { pt } from './pt';
import { zh } from './zh';

export type { Messages };
export type MessageKey = StringPath<Messages>;

const i18n = new I18n({
  en,
  zh,
  es,
  pt,
  hi,
  ne,
});

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = 'en';

export function setActiveLocale(locale: AppLocale): void {
  i18n.locale = locale;
}

export function activeLocale(): AppLocale {
  return resolveLocale(i18n.locale, i18n.locale);
}

export function t(key: MessageKey, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export function localizeError(message: string): string {
  const key = ERROR_KEYS[message];
  return key === undefined ? message : t(key);
}

export function errorText(error: unknown, fallback: MessageKey): string {
  if (error instanceof Error && error.message.length > 0) {
    return localizeError(error.message);
  }
  return t(fallback);
}

export function displayBuildingName(name: string): string {
  return name === en.home.yourBuilding ? t('home.yourBuilding') : name;
}

export function displayInviteLabel(label: string): string {
  return label.length === 0 || label === en.keys.guestInvite
    ? t('keys.guestInvite')
    : label;
}

export function isKeyDeadCopy(value: string): boolean {
  return /this key is dead/i.test(value) || value === t('errors.keyDead');
}

export function isSessionExpiredCopy(value: string): boolean {
  return /session expired/i.test(value) || value === t('errors.sessionExpired');
}

export function formatLocaleDate(
  value: number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(localeTag(activeLocale()), options);
}

export function formatLocaleTime(
  value: number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleTimeString(localeTag(activeLocale()), options);
}

const ERROR_KEYS: Record<string, MessageKey> = {
  [en.errors.keyDead]: 'errors.keyDead',
  [en.errors.loadBuilding]: 'errors.loadBuilding',
  [en.errors.loadBuildingTimeout]: 'errors.loadBuildingTimeout',
  [en.errors.doorClosed]: 'errors.doorClosed',
  [en.errors.signInToUnlock]: 'errors.signInToUnlock',
  [en.errors.missingCredentials]: 'errors.missingCredentials',
  [en.errors.exitDemoFirst]: 'errors.exitDemoFirst',
  [en.errors.pasteCode]: 'errors.pasteCode',
  [en.errors.signInFailed]: 'errors.signInFailed',
  [en.errors.signInFailedShort]: 'errors.signInFailedShort',
  [en.errors.openButterfly]: 'errors.openButterfly',
  [en.errors.createInviteDemo]: 'errors.createInviteDemo',
  [en.errors.signInCreateKey]: 'errors.signInCreateKey',
  [en.errors.signInSeeKeys]: 'errors.signInSeeKeys',
  [en.errors.revokeInviteDemo]: 'errors.revokeInviteDemo',
  [en.errors.signInRevoke]: 'errors.signInRevoke',
  [en.errors.createKey]: 'errors.createKey',
  [en.errors.loadKeys]: 'errors.loadKeys',
  [en.errors.copyLink]: 'errors.copyLink',
  [en.errors.revokeKey]: 'errors.revokeKey',
  [en.errors.updateKey]: 'errors.updateKey',
  [en.errors.shareLink]: 'errors.shareLink',
  [en.errors.sessionExpired]: 'errors.sessionExpired',
  [en.errors.loadDoors]: 'errors.loadDoors',
  [en.errors.releaseDoor]: 'errors.releaseDoor',
  [en.errors.noUnit]: 'errors.noUnit',
  [en.errors.requestFailed]: 'errors.requestFailed',
  [en.errors.unexpectedToken]: 'errors.unexpectedToken',
  [en.errors.localApi]: 'errors.localApi',
  [en.errors.demoInviteDevice]: 'errors.demoInviteDevice',
  [en.errors.showDoorBeforeInvite]: 'errors.showDoorBeforeInvite',
  [en.errors.notDemoDoor]: 'errors.notDemoDoor',
  [en.errors.doorNotInInvite]: 'errors.doorNotInInvite',
};

type StringPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${StringPath<T[K]>}`;
    }[keyof T & string];
