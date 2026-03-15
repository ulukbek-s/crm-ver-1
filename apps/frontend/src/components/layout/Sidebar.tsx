'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plane,
  GraduationCap,
  Wallet,
  BarChart3,
  CheckSquare,
  UserCog,
  Settings,
  MessagesSquare,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';

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

type NavItem = { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const nav: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/crm', labelKey: 'nav.crm', icon: Users },
  { href: '/candidates', labelKey: 'nav.candidates', icon: Users },
  { href: '/vacancies', labelKey: 'nav.vacancies', icon: Briefcase },
  { href: '/visa', labelKey: 'nav.visa', icon: Plane },
  { href: '/education', labelKey: 'nav.education', icon: GraduationCap },
  { href: '/finance', labelKey: 'nav.finance', icon: Wallet },
  { href: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { href: '/tasks', labelKey: 'nav.tasks', icon: CheckSquare },
  { href: '/communications', labelKey: 'nav.communications', icon: MessagesSquare },
  { href: '/employees', labelKey: 'nav.employees', icon: UserCog },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
  { href: '/partner', labelKey: 'nav.partner', icon: Briefcase },
  { href: '/customer', labelKey: 'nav.customer', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { theme } = useTheme();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const roleNames: string[] =
    (profile?.userRoles ?? []).map((ur: { role?: { name?: string } }) => ur.role?.name).filter(Boolean) ?? [];

  const isFounder = roleNames.includes('Founder');
  const isCustomer = roleNames.includes('Customer');
  const isPartner = roleNames.includes('Partner');

  let visibleNav = nav;

  if (isCustomer) {
    visibleNav = nav.filter((item) => ['/customer', '/profile'].includes(item.href));
  } else if (isPartner) {
    visibleNav = nav.filter((item) =>
      ['/dashboard', '/vacancies', '/analytics', '/partner', '/profile'].includes(item.href),
    );
  } else if (!isFounder) {
    visibleNav = nav.filter((item) => item.href !== '/employees' && item.href !== '/settings');
  }

  return (
    <aside
      className={clsx(
        'w-64 flex-shrink-0 flex flex-col',
        theme === 'dark' ? 'bg-gray-900' : 'bg-[hsl(220,18%,12%)]',
      )}
    >
      <div className="p-4 border-b border-white/10">
        <h1 className="text-lg font-semibold tracking-tight">Platform</h1>
        <p className="text-xs text-white/60 mt-0.5">HR · Migration · Education</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {visibleNav.map(({ href, labelKey, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-white/10 text-white'
                    : 'text-white/80 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
