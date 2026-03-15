'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTabsStore } from '@/store/tabs';

export function SyncTabsToPath() {
  const pathname = usePathname();
  const addTab = useTabsStore((s) => s.addTab);
  const setActive = useTabsStore((s) => s.setActive);

  useEffect(() => {
    const match = pathname?.match(/^\/(candidates|vacancies|visa)\/([^/]+)/);
    if (match) {
      const [, entity, id] = match;
      const label =
        entity === 'candidates' ? `Candidate` : entity === 'vacancies' ? `Vacancy` : `Visa`;
      addTab({
        id: pathname,
        label: `${label} ${id.slice(0, 8)}`,
        path: pathname,
      });
      setActive(pathname);
    }
  }, [pathname, addTab, setActive]);

  return null;
}
