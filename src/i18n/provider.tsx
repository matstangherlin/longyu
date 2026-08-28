import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { TARGET_LANGUAGE, type SupportedLocale } from "./config";
import { t, type TranslateVars } from "./catalog";
import type { MessageKey } from "../locales/pt-BR";
import {
  getInterfaceLocale,
  setInterfaceLocale as commitInterfaceLocale,
  subscribeInterfaceLocale,
} from "./locale";
import { activeInterfaceLocaleAdapter } from "./cloudAdapter";

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: MessageKey | string, vars?: TranslateVars) => string;
  targetLanguage: typeof TARGET_LANGUAGE;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function subscribe(callback: () => void) {
  return subscribeInterfaceLocale(() => callback());
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getInterfaceLocale, getInterfaceLocale);

  const setLocale = useCallback((next: SupportedLocale) => {
    commitInterfaceLocale(next);
    void activeInterfaceLocaleAdapter.setInterfaceLocale(next);
  }, []);

  const translate = useCallback(
    (key: MessageKey | string, vars?: TranslateVars) => t(key, vars, locale),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: translate,
      targetLanguage: TARGET_LANGUAGE,
    }),
    [locale, setLocale, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    locale: getInterfaceLocale(),
    setLocale: (next) => {
      commitInterfaceLocale(next);
      void activeInterfaceLocaleAdapter.setInterfaceLocale(next);
    },
    t,
    targetLanguage: TARGET_LANGUAGE,
  };
}

export function useTranslation() {
  const { t: translate, locale, setLocale, targetLanguage } = useI18n();
  return { t: translate, locale, setLocale, targetLanguage };
}
