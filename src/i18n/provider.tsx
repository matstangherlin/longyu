import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { TARGET_LANGUAGE, type InstructionLocale, type SupportedLocale } from "./config";
import { t, type TranslateVars } from "./catalog";
import type { MessageKey } from "../locales/pt-BR";
import {
  getInterfaceLocale,
  setInterfaceLocale as commitInterfaceLocale,
  subscribeInterfaceLocale,
} from "./locale";
import { activeInterfaceLocaleAdapter } from "./cloudAdapter";
import {
  followInterfaceLocale,
  getInstructionLocale,
  setInstructionLocale as commitInstructionLocale,
  subscribeInstructionLocale,
} from "./instructionLocale";

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  instructionLocale: InstructionLocale;
  setInstructionLocale: (locale: InstructionLocale) => void;
  t: (key: MessageKey | string, vars?: TranslateVars) => string;
  targetLanguage: typeof TARGET_LANGUAGE;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function subscribe(callback: () => void) {
  const offInterface = subscribeInterfaceLocale(() => callback());
  const offInstruction = subscribeInstructionLocale(() => callback());
  return () => {
    offInterface();
    offInstruction();
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getInterfaceLocale, getInterfaceLocale);
  const instructionLocale = useSyncExternalStore(subscribe, getInstructionLocale, getInstructionLocale);

  const setLocale = useCallback((next: SupportedLocale) => {
    commitInterfaceLocale(next);
    followInterfaceLocale(next);
    void activeInterfaceLocaleAdapter.setInterfaceLocale(next);
  }, []);

  const setInstructionLocale = useCallback((next: InstructionLocale) => {
    commitInstructionLocale(next, { userOverride: true });
  }, []);

  const translate = useCallback(
    (key: MessageKey | string, vars?: TranslateVars) => t(key, vars, locale),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      instructionLocale,
      setInstructionLocale,
      t: translate,
      targetLanguage: TARGET_LANGUAGE,
    }),
    [instructionLocale, locale, setInstructionLocale, setLocale, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    locale: getInterfaceLocale(),
    instructionLocale: getInstructionLocale(),
    setLocale: (next) => {
      commitInterfaceLocale(next);
      followInterfaceLocale(next);
      void activeInterfaceLocaleAdapter.setInterfaceLocale(next);
    },
    setInstructionLocale: (next) => commitInstructionLocale(next, { userOverride: true }),
    t,
    targetLanguage: TARGET_LANGUAGE,
  };
}

export function useTranslation() {
  const { t: translate, locale, setLocale, instructionLocale, setInstructionLocale, targetLanguage } = useI18n();
  return { t: translate, locale, setLocale, instructionLocale, setInstructionLocale, targetLanguage };
}
