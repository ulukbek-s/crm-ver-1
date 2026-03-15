'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchRefunds() {
  const res = await fetch('/api/finance/refunds', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceRefundsPage() {
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['finance', 'refunds'],
    queryFn: fetchRefunds,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Invoice
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Amount
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Date
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && refunds.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No refunds
            </td>
          </tr>
        )}
        {!isLoading &&
          refunds.map((r: any) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {r.invoice?.number ?? r.invoiceId}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {r.currency} {Number(r.amount).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {r.date ? new Date(r.date).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                {r.status}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Refunds"
      description="Refunds issued for invoices"
      table={table}
    />
  );
}

