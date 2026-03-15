'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchCommissions() {
  const res = await fetch('/api/finance/commissions', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceCommissionsPage() {
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['finance', 'commissions'],
    queryFn: fetchCommissions,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Employee
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Deal value
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            %
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Commission
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && commissions.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No commissions
            </td>
          </tr>
        )}
        {!isLoading &&
          commissions.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {c.employeeId}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {c.currency} {Number(c.dealValue).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {Number(c.commissionPercent).toLocaleString()}%
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {c.currency} {Number(c.commissionAmount).toLocaleString()}
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
      title="Commissions"
      description="Recruiter and sales commissions"
      table={table}
    />
  );
}

