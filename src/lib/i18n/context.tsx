import { createContext, useContext } from 'react';

import { t } from '@/lib/i18n';
import type { AppLocale, LocalePreference } from '@/lib/i18n';

type Translate = typeof t;

export type I18nContextValue = {
  locale: AppLocale;
  preference: LocalePreference;
  setPreference: (next: LocalePreference) => void;
  t: Translate;
};

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  preference: 'system',
  setPreference: () => undefined,
  t,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function useT(): Translate {
  return useI18n().t;
}
