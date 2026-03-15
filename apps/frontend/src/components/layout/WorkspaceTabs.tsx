'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTabsStore } from '@/store/tabs';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export function WorkspaceTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { tabs, activeId, setActive, closeTab } = useTabsStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 border-b border-gray-200 bg-white px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={clsx(
            'group flex items-center gap-1.5 rounded-t-lg border px-3 py-2 text-sm font-medium min-w-0 max-w-[180px]',
            activeId === tab.id
              ? 'border-b-0 border-gray-200 bg-gray-50 text-gray-900 -mb-px'
              : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <button
            type="button"
            onClick={() => {
              setActive(tab.id);
              router.push(tab.path);
            }}
            className="truncate flex-1 text-left"
          >
            {tab.label}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
              if (activeId === tab.id && tabs.length > 1) {
                const next = tabs.filter((t) => t.id !== tab.id);
                const nextTab = next[next.length - 1];
                setActive(nextTab.id);
                router.push(nextTab.path);
              } else if (tabs.length === 1) {
                router.push('/dashboard');
              }
            }}
            className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
            aria-label="Close tab"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
