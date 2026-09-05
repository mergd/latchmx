import { getLocales, useLocales } from 'expo-localization';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  type LocalePreference,
  LOCALE_STORAGE_KEY,
  isLocalePreference,
  localeTag,
  resolveLocale,
  setActiveLocale,
  t,
} from '@/lib/i18n';
import { I18nContext, type I18nContextValue } from '@/lib/i18n/context';
import { storageGet, storageSet } from '@/lib/storage';

function deviceLocaleFromTag(
  languageCode?: string | null,
  languageTag?: string | null,
) {
  return resolveLocale(languageCode, languageTag);
}

function detectDeviceLocale() {
  try {
    const locale = getLocales()[0];
    return deviceLocaleFromTag(locale?.languageCode, locale?.languageTag);
  } catch {
    return 'en' as const;
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const deviceLocales = useLocales();
  const device = deviceLocaleFromTag(
    deviceLocales[0]?.languageCode,
    deviceLocales[0]?.languageTag,
  );
  const [preference, setPreferenceState] = useState<LocalePreference>('system');

  useEffect(() => {
    let cancelled = false;
    void storageGet(LOCALE_STORAGE_KEY).then((value) => {
      if (cancelled || value === null || !isLocalePreference(value)) {
        return;
      }
      setPreferenceState(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const locale = preference === 'system' ? device : preference;

  useEffect(() => {
    setActiveLocale(locale);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = localeTag(locale);
    }
  }, [locale]);

  const setPreference = useCallback((next: LocalePreference) => {
    setPreferenceState(next);
    void storageSet(LOCALE_STORAGE_KEY, next);
    setActiveLocale(next === 'system' ? detectDeviceLocale() : next);
  }, []);

  const translate = useCallback<typeof t>(
    (key, options) => {
      void locale;
      return t(key, options);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      setPreference,
      t: translate,
    }),
    [locale, preference, setPreference, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
