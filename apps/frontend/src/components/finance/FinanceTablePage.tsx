'use client';

import { ReactNode } from 'react';

type FinanceTablePageProps = {
  title: string;
  description?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  table: ReactNode;
};

export function FinanceTablePage({ title, description, filters, actions, table }: FinanceTablePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {filters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          {filters}
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {table}
      </div>
    </div>
  );
}

