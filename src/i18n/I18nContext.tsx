import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { saveJson, STORAGE_KEYS } from "../lib/platform";
import { localeOf, type Language } from "./languages";
import { MESSAGES, type Messages } from "./messages";

interface I18n {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: keyof Messages) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Language; children: ReactNode }) {
  const [language, setLanguageState] = useState(initial);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18n>(
    () => ({
      language,
      locale: localeOf(language),
      setLanguage: (next) => {
        setLanguageState(next);
        saveJson(STORAGE_KEYS.language, next);
      },
      t: (key) => MESSAGES[language][key],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider가 필요해요.");
  return value;
}
