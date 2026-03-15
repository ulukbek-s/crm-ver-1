'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchContracts() {
  const res = await fetch('/api/finance/contracts', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceContractsPage() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['finance', 'contracts'],
    queryFn: fetchContracts,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Code
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Company
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Service
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Value
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Start / End
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && contracts.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No contracts
            </td>
          </tr>
        )}
        {!isLoading &&
          contracts.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {c.code}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {c.companyId}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {c.serviceType}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {c.currency} {Number(c.totalValue).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'} /{' '}
                {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                {c.status}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Contracts"
      description="Financial contracts with companies"
      table={table}
    />
  );
}

