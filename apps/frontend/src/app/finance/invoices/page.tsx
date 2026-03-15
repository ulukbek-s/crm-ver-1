'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchInvoices() {
  const res = await fetch('/api/finance/invoices', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceInvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['finance', 'invoices'],
    queryFn: fetchInvoices,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Number
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Service
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Amount
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Issue date
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Due date
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && invoices.length === 0 && (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              No invoices
            </td>
          </tr>
        )}
        {!isLoading &&
          invoices.map((inv: any) => (
            <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {inv.number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {inv.serviceType}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {inv.currency} {Number(inv.amount).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs">
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Invoices"
      description="All invoices for clients and students"
      table={table}
    />
  );
}

