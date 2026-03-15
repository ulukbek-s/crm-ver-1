'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchSalaries() {
  const res = await fetch('/api/finance/salaries', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceSalariesPage() {
  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['finance', 'salaries'],
    queryFn: fetchSalaries,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Employee
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Base
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Bonus
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Final
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
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && salaries.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No salaries
            </td>
          </tr>
        )}
        {!isLoading &&
          salaries.map((s: any) => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {s.employeeId}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {s.currency} {Number(s.baseAmount).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {s.currency} {Number(s.bonusAmount ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {s.currency} {Number(s.finalAmount).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {s.paymentDate ? new Date(s.paymentDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                {s.status}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Salaries"
      description="Salary payments to employees"
      table={table}
    />
  );
}

