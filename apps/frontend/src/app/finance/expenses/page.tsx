'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchExpenses() {
  const res = await fetch('/api/finance/expenses', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinanceExpensesPage() {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['finance', 'expenses'],
    queryFn: fetchExpenses,
  });

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Category
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Amount
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Date
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Employee
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Description
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
        {!isLoading && expenses.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No expenses
            </td>
          </tr>
        )}
        {!isLoading &&
          expenses.map((e: any) => (
            <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {e.category}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {e.currency} {Number(e.amount).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {e.date ? new Date(e.date).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {e.employeeId ?? '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {e.description ?? '—'}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Expenses"
      description="Operational expenses of the company"
      table={table}
    />
  );
}

