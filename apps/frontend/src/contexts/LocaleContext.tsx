'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { type Locale, locales, getT } from '@/lib/i18n/translations';

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored && locales.includes(stored)) setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('locale', l);
  };

  if (!mounted) return <>{children}</>;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getT(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
