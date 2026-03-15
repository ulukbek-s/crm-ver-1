'use client';

import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertCircle, Droplets } from 'lucide-react';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchFinanceDashboard() {
  const res = await fetch('/api/finance/dashboard', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchFinanceCharts() {
  const res = await fetch('/api/finance/dashboard/charts', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  LANGUAGE_COURSE: 'Курсы',
  VISA_SERVICE: 'Визы',
  RECRUITMENT_SERVICE: 'Рекрутинг',
  AUSBILDUNG: 'Образование',
  OTHER: 'Прочее',
};

export default function FinancePage() {
  const { data: finance, isLoading: financeLoading } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: fetchFinanceDashboard,
  });
  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['finance', 'dashboard-charts'],
    queryFn: fetchFinanceCharts,
  });

  const metrics = [
    {
      label: 'Total Revenue',
      value: Number(finance?.totalRevenue ?? 0).toLocaleString(),
      icon: Wallet,
      color: 'bg-emerald-500',
    },
    {
      label: 'Revenue this month',
      value: Number(finance?.revenueThisMonth ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      label: 'Expenses this month',
      value: Number(finance?.expensesThisMonth ?? 0).toLocaleString(),
      icon: TrendingDown,
      color: 'bg-amber-500',
    },
    {
      label: 'Net profit',
      value: Number(finance?.netProfitThisMonth ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: (finance?.netProfitThisMonth ?? 0) >= 0 ? 'bg-emerald-600' : 'bg-red-500',
    },
    {
      label: 'Pending payments',
      value: `${finance?.pendingPaymentsCount ?? 0} (${Number(finance?.pendingPaymentsAmount ?? 0).toLocaleString()})`,
      icon: Clock,
      color: 'bg-violet-500',
    },
    {
      label: 'Overdue invoices',
      value: String(finance?.overdueInvoices ?? 0),
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      label: 'Cash flow',
      value: Number(finance?.cashFlow ?? 0).toLocaleString(),
      icon: Droplets,
      color: (finance?.cashFlow ?? 0) >= 0 ? 'bg-cyan-500' : 'bg-red-500',
    },
  ];

  const maxRevenue = Math.max(
    1,
    ...(charts?.revenueByMonth ?? []).map((m: any) => m.revenue),
  );
  const maxExpenses = Math.max(
    1,
    ...(charts?.expensesByMonth ?? []).map((m: any) => m.expenses),
  );
  const maxProfit = Math.max(
    1,
    ...(charts?.profitGrowth ?? []).map((m: any) => Math.max(0, m.profit)),
  );
  const maxByService = Math.max(
    1,
    ...(charts?.revenueByServiceType ?? []).map((r: any) => r.revenue),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Финансовая сводка: выручка, расходы, прибыль, платежи
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${color} text-white`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                {label}
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white truncate">
              {financeLoading ? '…' : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Доход по месяцам
          </h3>
          {chartsLoading ? (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">Загрузка…</div>
          ) : (
            <div className="flex items-end gap-0.5 h-36">
              {(charts?.revenueByMonth ?? []).map((m: any, i: number) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  title={`${m.month}: ${m.revenue}`}
                >
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t min-h-[4px]"
                    style={{
                      height: `${(m.revenue / maxRevenue) * 100}%`,
                    }}
                  />
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Расходы по месяцам
          </h3>
          {chartsLoading ? (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">Загрузка…</div>
          ) : (
            <div className="flex items-end gap-0.5 h-36">
              {(charts?.expensesByMonth ?? []).map((m: any, i: number) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  title={`${m.month}: ${m.expenses}`}
                >
                  <div
                    className="w-full bg-amber-500 dark:bg-amber-600 rounded-t min-h-[4px]"
                    style={{
                      height: `${(m.expenses / maxExpenses) * 100}%`,
                    }}
                  />
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Рост прибыли
          </h3>
          {chartsLoading ? (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">Загрузка…</div>
          ) : (
            <div className="flex items-end gap-0.5 h-36">
              {(charts?.profitGrowth ?? []).map((m: any, i: number) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  title={`${m.month}: ${m.profit}`}
                >
                  <div
                    className={`w-full rounded-t min-h-[4px] ${
                      m.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{
                      height: `${Math.min(100, (Math.max(0, m.profit) / maxProfit) * 100)}%`,
                    }}
                  />
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {m.month}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Доход по типу услуги
          </h3>
          {chartsLoading ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Загрузка…</div>
          ) : (
            <div className="space-y-2">
              {(charts?.revenueByServiceType ?? []).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300 w-32 truncate">
                    {SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${(r.revenue / maxByService) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white w-16 text-right">
                    {Number(r.revenue).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
