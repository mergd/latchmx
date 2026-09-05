export const APP_LOCALES = ['en', 'zh', 'es', 'pt', 'hi', 'ne'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export type LocalePreference = 'system' | AppLocale;

export const LOCALE_STORAGE_KEY = 'latch.locale';

const LOCALE_TAGS: Record<AppLocale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es',
  pt: 'pt-BR',
  hi: 'hi-IN',
  ne: 'ne-NP',
};

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

export function isLocalePreference(value: string): value is LocalePreference {
  return value === 'system' || isAppLocale(value);
}

export function resolveLocale(
  languageCode?: string | null,
  languageTag?: string | null,
): AppLocale {
  const tag = (languageTag ?? languageCode ?? 'en').toLowerCase();
  if (tag.startsWith('zh')) {
    return 'zh';
  }
  if (tag.startsWith('es')) {
    return 'es';
  }
  if (tag.startsWith('pt')) {
    return 'pt';
  }
  if (tag.startsWith('hi')) {
    return 'hi';
  }
  if (tag.startsWith('ne')) {
    return 'ne';
  }
  return 'en';
}

export function localeTag(locale: AppLocale): string {
  return LOCALE_TAGS[locale];
}
