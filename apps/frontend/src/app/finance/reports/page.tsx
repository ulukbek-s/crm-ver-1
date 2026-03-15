'use client';

import { useQuery } from '@tanstack/react-query';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';
import { useState } from 'react';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchCourseRevenue() {
  const res = await fetch('/api/finance/reports/course-revenue', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchOverdueAging() {
  const res = await fetch('/api/finance/reports/overdue-aging', { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export default function FinanceReportsPage() {
  const [tab, setTab] = useState<'courses' | 'overdue'>('courses');

  const { data: courseRevenue = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['finance', 'reports', 'course-revenue'],
    queryFn: fetchCourseRevenue,
  });
  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ['finance', 'reports', 'overdue-aging'],
    queryFn: fetchOverdueAging,
  });

  const tableCourses = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Course
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Level
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Revenue
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Students
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Payments
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {loadingCourses && (
          <tr>
            <td
              colSpan={5}
              className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              Loading…
            </td>
          </tr>
        )}
        {!loadingCourses && courseRevenue.length === 0 && (
          <tr>
            <td
              colSpan={5}
              className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              No data
            </td>
          </tr>
        )}
        {!loadingCourses &&
          courseRevenue.map((row: any) => (
            <tr key={row.courseId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {row.courseName ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {row.courseLevel ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                {Number(row.revenue ?? 0).toLocaleString()} EUR
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {row.studentsCount ?? 0}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {row.paymentsCount ?? 0}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  const tableOverdue = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        {(overdueData?.summary ?? []).map((s: any) => (
          <div
            key={s.bucket}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
              {s.bucket} days
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Number(s.totalAmount ?? 0).toLocaleString()} EUR
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {s.count} invoices
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                Due date
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Days overdue
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loadingOverdue && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loadingOverdue &&
              Object.entries((overdueData?.detailed as Record<string, any[]>) ?? {}).flatMap(
                ([bucket, list]) =>
                  (list as any[]).map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/40"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {inv.number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {inv.currency} {Number(inv.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-white">
                        {inv.daysOverdue} ({bucket})
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {inv.status ?? '—'}
                      </td>
                    </tr>
                  )),
              )}
            {!loadingOverdue &&
              (!overdueData || Object.values(overdueData.detailed ?? {}).every((a) => !a.length)) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No overdue invoices
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <FinanceTablePage
      title="Finance reports"
      description="Revenue by courses and overdue invoices"
      actions={
        <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('courses')}
            className={`px-3 py-1 rounded-full ${
              tab === 'courses'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Courses
          </button>
          <button
            type="button"
            onClick={() => setTab('overdue')}
            className={`px-3 py-1 rounded-full ${
              tab === 'overdue'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Overdue
          </button>
        </div>
      }
      table={tab === 'courses' ? tableCourses : tableOverdue}
    />
  );
}

