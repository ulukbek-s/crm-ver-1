'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Users, Plane, Wallet, CheckSquare, BarChart3, Activity, Plus, Minus, Briefcase } from 'lucide-react';
import Link from 'next/link';

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  leads: 'Leads',
  candidates: 'Candidates',
  document_prep: 'Подготовка документов',
  send_to_employer: 'Отправка работодателю',
  waiting_employer: 'Ждём ответа',
  visa_prep: 'Виза подготовка',
  visa_waiting: 'Виза ожидание',
  accepted: 'Accepted',
  rejected: 'Rejected',
};
import { useLocale } from '@/contexts/LocaleContext';

const DASHBOARD_WIDGETS_KEY = 'dashboard-widgets';

type WidgetKey = 'pipeline' | 'activity' | 'tasksSummary' | 'workload' | 'candidatesInWork';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchDashboard() {
  const res = await fetch('/api/analytics/dashboard', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchPipelineConversion() {
  const res = await fetch('/api/analytics/pipeline-conversion', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchRecentActivity() {
  const res = await fetch('/api/analytics/recent-activity', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchMyTasks() {
  const res = await fetch('/api/tasks', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCandidatesInWork() {
  const res = await fetch('/api/crm/candidates-in-work', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

const defaultWidgets: Record<WidgetKey, boolean> = {
  pipeline: true,
  activity: true,
  tasksSummary: true,
  workload: true,
  candidatesInWork: true,
};

export default function DashboardPage() {
  const { t } = useLocale();
  const [widgets, setWidgets] = useState(defaultWidgets);

  useEffect(() => {
    try {
      const s = localStorage.getItem(DASHBOARD_WIDGETS_KEY);
      if (s) setWidgets((w) => ({ ...w, ...JSON.parse(s) }));
    } catch {}
  }, []);

  const toggleWidget = (key: WidgetKey) => {
    setWidgets((w) => {
      const next = { ...w, [key]: !w[key] };
      try { localStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });
  const { data: pipelineData = [] } = useQuery({
    queryKey: ['analytics', 'pipeline-conversion'],
    queryFn: fetchPipelineConversion,
    enabled: widgets.pipeline,
  });
  const { data: activityData = [] } = useQuery({
    queryKey: ['analytics', 'recent-activity'],
    queryFn: fetchRecentActivity,
    enabled: widgets.activity,
  });
  const { data: myTasks = [] } = useQuery({ queryKey: ['tasks', 'my'], queryFn: fetchMyTasks });
  const { data: candidatesInWork } = useQuery({
    queryKey: ['crm', 'candidates-in-work'],
    queryFn: fetchCandidatesInWork,
    enabled: widgets.candidatesInWork,
  });

  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter((t: any) => t.status === 'completed').length;
  const openTasks = totalTasks - completedTasks;

  const cards = [
    { label: t('dashboard.leadsToday'), value: data?.leadsToday ?? '—', icon: Users, color: 'bg-blue-500' },
    { label: t('dashboard.candidatesInProcess'), value: data?.candidatesInProcess ?? '—', icon: Users, color: 'bg-emerald-500' },
    { label: t('dashboard.visaProcesses'), value: data?.visaProcesses ?? '—', icon: Plane, color: 'bg-violet-500' },
    { label: t('dashboard.revenue'), value: data?.revenue != null ? `$${Number(data.revenue).toLocaleString()}` : '—', icon: Wallet, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* My Tasks — compact, at top */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            {t('dashboard.myTasks')}
          </h2>
          <Link
            href="/tasks"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Все задачи →
          </Link>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {myTasks.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">No tasks</p>
          )}
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {myTasks.slice(0, 5).map((task: any) => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{task.title ?? '—'}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                      {task.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
              <span className={`p-2 rounded-lg ${color} text-white`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '…' : value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Widgets:</span>
        <button
          type="button"
          onClick={() => toggleWidget('pipeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
            widgets.pipeline
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          {widgets.pipeline ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {t('dashboard.pipelineConversion')}
        </button>
        <button
          type="button"
          onClick={() => toggleWidget('activity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
            widgets.activity
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          {widgets.activity ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {t('dashboard.recentActivity')}
        </button>
        <button
          type="button"
          onClick={() => toggleWidget('tasksSummary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
            widgets.tasksSummary
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          {widgets.tasksSummary ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          Обзор задач
        </button>
        <button
          type="button"
          onClick={() => toggleWidget('workload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
            widgets.workload
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          {widgets.workload ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          Нагрузка по воронке
        </button>
        <button
          type="button"
          onClick={() => toggleWidget('candidatesInWork')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
            widgets.candidatesInWork
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          {widgets.candidatesInWork ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          Кандидаты в работе
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.pipeline && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('dashboard.pipelineConversion')}
            </h2>
            <div className="space-y-2">
              {pipelineData.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
              {pipelineData.map((item: { stage: string; count: number }) => (
                <div key={item.stage} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{item.stage.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {widgets.activity && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('dashboard.recentActivity')}
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activityData.length === 0 && <p className="text-gray-400 text-sm">No activity</p>}
              {activityData.map((a: any, i: number) => (
                <div key={`${a.type}-${a.id}-${i}`} className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {a.type === 'candidate' ? 'Candidate' : 'Lead'}: {a.firstName} {a.lastName}
                    {a.pipelineStage && <span className="text-gray-500 ml-1">({a.pipelineStage})</span>}
                  </span>
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {new Date(a.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {widgets.tasksSummary && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Обзор задач
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Всего задач</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{totalTasks || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Открытые</p>
                <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-300">
                  {openTasks || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Завершённые</p>
                <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-300">
                  {completedTasks || '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {widgets.workload && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Нагрузка по воронке
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Показывает, на каких этапах воронки сейчас больше всего кандидатов.
            </p>
            <div className="space-y-2">
              {pipelineData.length === 0 && (
                <p className="text-gray-400 text-sm">Нет данных по воронке</p>
              )}
              {pipelineData.map((item: { stage: string; count: number }) => (
                <div key={`workload-${item.stage}`} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{item.stage.replace(/_/g, ' ')}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400"
                      style={{
                        width: `${
                          pipelineData.reduce(
                            (max: number, v: { count: number }) => Math.max(max, v.count),
                            1,
                          )
                            ? (item.count /
                                pipelineData.reduce(
                                  (max: number, v: { count: number }) => Math.max(max, v.count),
                                  1,
                                )) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {widgets.candidatesInWork && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Кандидаты в работе
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              По менеджерам: количество кандидатов по этапам; выделены кандидаты без договора.
            </p>
            {!candidatesInWork?.managers?.length && (
              <p className="text-gray-400 text-sm">Нет данных</p>
            )}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {candidatesInWork?.managers?.map((m: any) => (
                <div key={m.managerId} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{m.managerName}</span>
                    <span className="text-sm text-gray-500">Всего: {m.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Object.entries(m.byStage || {}).map(([stage, count]) => (
                      <span
                        key={stage}
                        className="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {PIPELINE_STAGE_LABELS[stage] ?? stage}: {String(count)}
                      </span>
                    ))}
                  </div>
                  {m.missingDocsCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Не хватает документов ({m.missingDocsCount}):
                      </p>
                      <ul className="text-sm space-y-0.5">
                        {m.missingDocsCandidates?.map((c: any) => (
                          <li key={c.id}>
                            <Link
                              href={`/candidates/${c.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {c.firstName} {c.lastName}
                            </Link>
                            <span className="text-gray-500 ml-1">
                              ({PIPELINE_STAGE_LABELS[c.pipelineStage] ?? c.pipelineStage})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
