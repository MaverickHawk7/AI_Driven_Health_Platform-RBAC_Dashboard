import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { t, type Language, type TranslationKey } from "@/i18n/translations";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLang(): Language {
  try {
    const stored = localStorage.getItem("app_lang");
    if (stored === "te" || stored === "en") return stored;
  } catch {}
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getStoredLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try { localStorage.setItem("app_lang", newLang); } catch {}
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "te" : "en");
  }, [lang, setLang]);

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
