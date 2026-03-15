'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchDashboard() {
  const res = await fetch('/api/analytics/dashboard', {
    headers: {
      Authorization:
        'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchTasks() {
  const res = await fetch('/api/tasks', {
    headers: {
      Authorization:
        'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return [];
  return res.json();
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: fetchDashboard });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', 'summary'], queryFn: fetchTasks });

  const todoCount = tasks.filter((t: any) => (t.status || 'todo') === 'todo').length;
  const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length;
  const completedToday = tasks.filter((t: any) => t.status === 'completed').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">
          Conversion, revenue, visa approvals, manager performance
        </p>
      </div>

      <div className="max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">My tasks</h2>
          <div className="flex items-center gap-4 text-xs text-gray-700">
            <div>
              <div className="text-gray-500">Todo</div>
              <div className="text-lg font-semibold">{todoCount}</div>
            </div>
            <div>
              <div className="text-gray-500">In progress</div>
              <div className="text-lg font-semibold">{inProgressCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Completed</div>
              <div className="text-lg font-semibold">{completedToday}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Leads</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '…' : data?.leadsToday ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Candidates in process</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '…' : data?.candidatesInProcess ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Visa processes</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '…' : data?.visaProcesses ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isLoading ? '…' : data?.revenue != null ? `$${Number(data.revenue).toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-80 flex items-center justify-center text-gray-400">
          Conversion funnel chart
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-80 flex items-center justify-center text-gray-400">
          Revenue by country
        </div>
      </div>
    </div>
  );
}
