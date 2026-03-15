'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { locales, type Locale } from '@/lib/i18n/translations';
import { AvatarImage } from '@/components/AvatarImage';

const TOKEN_KEY = 'token';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchProfile() {
  const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

const localeLabels: Record<Locale, string> = { en: 'EN', ru: 'RU', ky: 'KY' };

export function TopBar() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile });
  const initial = profile?.firstName?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U';

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="h-14 flex-shrink-0 border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            placeholder="Search candidates, vacancies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm py-1.5 px-2"
          aria-label="Language"
        >
          {locales.map((l) => (
            <option key={l} value={l}>{localeLabels[l]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
        >
          <LogOut className="h-5 w-5" />
        </button>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white text-sm font-medium shrink-0 overflow-hidden"
          title={t('nav.profile')}
        >
          {profile?.avatarUrl ? (
            <AvatarImage hasAvatar className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
