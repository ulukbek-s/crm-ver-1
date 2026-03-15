'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Calendar, FileCheck } from 'lucide-react';

const VISA_STAGES = [
  { key: 'contract_received', label: 'Contract received' },
  { key: 'document_prep', label: 'Document preparation' },
  { key: 'embassy_appointment', label: 'Embassy appointment' },
  { key: 'submission', label: 'Submission' },
  { key: 'waiting_decision', label: 'Waiting decision' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_LABELS: Record<string, string> = {
  ...Object.fromEntries(VISA_STAGES.map((s) => [s.key, s.label])),
  tls_appointment: 'Embassy appointment',
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchVisaProcesses() {
  const res = await fetch('/api/visa/processes', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchReminders() {
  const res = await fetch('/api/visa/reminders', { headers: getAuthHeaders() });
  if (!res.ok) return { appointmentReminders: [], expiryReminders: [] };
  return res.json();
}

export default function VisaPage() {
  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['visa', 'processes'],
    queryFn: fetchVisaProcesses,
  });
  const { data: reminders } = useQuery({
    queryKey: ['visa', 'reminders'],
    queryFn: fetchReminders,
  });

  const appointmentReminders = reminders?.appointmentReminders ?? [];
  const expiryReminders = reminders?.expiryReminders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visa management</h1>
        <p className="text-gray-500 mt-1">Pipeline: от контракта до решения по визе</p>
      </div>

      {/* Reminders */}
      {(appointmentReminders.length > 0 || expiryReminders.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {appointmentReminders.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-amber-800">
                <Calendar className="h-5 w-5" />
                Ближайшие приёмы (7 дней)
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {appointmentReminders.map((p: any) => (
                  <li key={p.id}>
                    <Link href={`/visa/${p.id}`} className="hover:underline">
                      {p.candidate?.firstName} {p.candidate?.lastName}
                    </Link>
                    {' — '}
                    {p.appointmentDate
                      ? new Date(p.appointmentDate).toLocaleDateString()
                      : '—'}
                    {p.embassy?.city && ` (${p.embassy.city})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiryReminders.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-blue-800">
                <AlertCircle className="h-5 w-5" />
                Виза истекает (90 дней)
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-900">
                {expiryReminders.map((p: any) => (
                  <li key={p.id}>
                    <Link href={`/visa/${p.id}`} className="hover:underline">
                      {p.candidate?.firstName} {p.candidate?.lastName}
                    </Link>
                    {' — '}
                    {p.visaExpirationDate
                      ? new Date(p.visaExpirationDate).toLocaleDateString()
                      : '—'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Dashboard: counts per stage */}
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-md">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {VISA_STAGES.map(({ key, label }) => {
            const count =
              key === 'embassy_appointment'
                ? processes.filter(
                    (p: { status: string }) =>
                      p.status === 'embassy_appointment' || p.status === 'tls_appointment',
                  ).length
                : processes.filter((p: { status: string }) => p.status === key).length;
            return (
              <div
                key={key}
                className="flex-shrink-0 w-36 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4"
              >
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '…' : count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visa cases: cards */}
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h2 className="font-semibold text-gray-900 dark:text-white">Визовые кейсы</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Загрузка…</div>
          )}
          {!isLoading && processes.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Нет процессов</div>
          )}
          {!isLoading &&
            processes.map((p: any) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {p.candidate?.firstName} {p.candidate?.lastName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.country?.name ?? '—'}
                    {p.appointmentDate && ` • ${new Date(p.appointmentDate).toLocaleDateString()}`}
                  </p>
                </div>
                <span className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1 text-xs font-medium bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/visa/${p.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Виза-кейс
                  </Link>
                  {p.candidate?.id && (
                    <Link
                      href={`/candidates/${p.candidate.id}`}
                      className="inline-flex items-center rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Карточка
                    </Link>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
