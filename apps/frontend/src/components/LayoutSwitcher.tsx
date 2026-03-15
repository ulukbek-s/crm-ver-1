'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WorkspaceTabs } from '@/components/layout/WorkspaceTabs';
import { SyncTabsToPath } from '@/components/SyncTabsToPath';

const TOKEN_KEY = 'token';

export function LayoutSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      const from = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?from=${from}`);
      return;
    }
    setChecked(true);
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <SyncTabsToPath />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar />
          <WorkspaceTabs />
          <main className="flex-1 overflow-auto p-6 bg-gray-50/80 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
