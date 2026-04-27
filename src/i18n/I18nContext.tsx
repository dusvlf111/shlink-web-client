import type { FC, PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MESSAGES } from './messages';
import type { Locale, MessageKey, TranslateFn, TranslateParams } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';

const STORAGE_KEY = 'shlink-locale';

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value);

const readStoredLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

const writeStoredLocale = (locale: Locale) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 저장 실패 시 무시
  }
};

const interpolate = (template: string, params?: TranslateParams) => {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export type I18nProviderProps = PropsWithChildren<{
  initialLocale?: Locale;
}>;

export const I18nProvider: FC<I18nProviderProps> = ({ initialLocale, children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());

  useEffect(() => {
    if (initialLocale) {
      setLocaleState(initialLocale);
    }
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key: MessageKey, params?: TranslateParams) => {
      const dictionary = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
      const fallback = MESSAGES[DEFAULT_LOCALE];
      const template = dictionary[key] ?? fallback[key] ?? key;
      return interpolate(template, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
};

export const useT = (): TranslateFn => useI18n().t;

export const useLocale = () => {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
};
