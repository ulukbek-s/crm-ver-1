'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LinkWithTab } from '@/components/LinkWithTab';
import { AddVacancyModal } from '@/components/forms/AddVacancyModal';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchVacancies(params?: { countryId?: string; status?: string }) {
  const url = new URL('/api/recruitment/vacancies', typeof window !== 'undefined' ? window.location.origin : '');
  if (params?.countryId) url.searchParams.set('countryId', params.countryId);
  if (params?.status) url.searchParams.set('status', params.status);
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCountries() {
  const res = await fetch('/api/recruitment/countries', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}

function salaryText(v: any) {
  const cur = v.salaryCurrency ?? 'EUR';
  if (v.salaryMin != null && v.salaryMax != null) return `${v.salaryMin}–${v.salaryMax} ${cur}`;
  if (v.salaryMin != null) return `от ${v.salaryMin} ${cur}`;
  if (v.salaryMax != null) return `до ${v.salaryMax} ${cur}`;
  if (v.salary) return String(v.salary);
  return null;
}

export default function VacanciesPage() {
  const router = useRouter();
  const [vacancyModalOpen, setVacancyModalOpen] = useState(false);
  const [filterCountryId, setFilterCountryId] = useState('');

  const { data: countries = [] } = useQuery({ queryKey: ['recruitment', 'countries'], queryFn: fetchCountries });
  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['vacancies', filterCountryId || null],
    queryFn: () => fetchVacancies({ ...(filterCountryId && { countryId: filterCountryId }) }),
  });
  const { data: archivedVacancies = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['vacancies', 'archived', filterCountryId || null],
    queryFn: () => fetchVacancies({ status: 'archived', ...(filterCountryId && { countryId: filterCountryId }) }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacancies</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Vacancy-centered recruitment</p>
        </div>
        <button
          type="button"
          onClick={() => setVacancyModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Добавить вакансию
        </button>
      </div>

      <AddVacancyModal open={vacancyModalOpen} onClose={() => setVacancyModalOpen(false)} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-sm font-medium text-gray-700">Фильтр:</span>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Все страны</option>
          {countries.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {filterCountryId && (
          <button type="button" onClick={() => setFilterCountryId('')} className="text-sm text-blue-600 hover:underline">
            Сбросить
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <div className="col-span-full text-center py-8 text-gray-500">Loading…</div>}
        {!isLoading && vacancies.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">Нет активных вакансий</div>
        )}
        {!isLoading && vacancies.map((v: any) => {
          const vcs = v.vacancyCandidates ?? [];
          const hiredCount = vcs.filter((vc: any) => vc.stage === 'hired').length;
          const openPos = v.openPositions ?? 1;
          const left = Math.max(0, openPos - hiredCount);
          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/vacancies/${v.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/vacancies/${v.id}`)}
              className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white flex-1">{v.title}</h3>
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {v.status === 'open' ? 'Открыта' : v.status === 'paused' ? 'Приостановлена' : 'Закрыта'}
                </span>
              </div>
              <dl className="mt-2 space-y-0.5 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Работодатель: </span>
                  <span className="text-gray-800 dark:text-gray-200">{v.employer?.name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Страна: </span>
                  <span className="text-gray-800 dark:text-gray-200">{v.country?.name ?? '—'}</span>
                </div>
                {salaryText(v) && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Зарплата: </span>
                    <span className="text-gray-800 dark:text-gray-200">{salaryText(v)}</span>
                  </div>
                )}
                {v.deadline && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Действует до: </span>
                    <span className="text-gray-800 dark:text-gray-200">{new Date(v.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </dl>
              {v.requirements && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Описание: </span>
                  <p className="text-xs text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-2">{v.requirements}</p>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex flex-wrap gap-x-4 gap-y-0 text-xs">
                <span className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Мест:</span> {openPos}</span>
                <span className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Занято:</span> {hiredCount}</span>
                <span className="text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Осталось:</span> {left}</span>
              </div>
              {vcs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Кандидаты по вакансии</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {vcs.slice(0, 5).map((vc: any) => (
                      <li key={vc.id}>
                        {vc.candidate ? (
                          <LinkWithTab
                            href={`/candidates/${vc.candidate.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {vc.candidate.firstName} {vc.candidate.lastName}
                          </LinkWithTab>
                        ) : null}
                      </li>
                    ))}
                    {vcs.length > 5 && <li className="text-gray-500">и ещё {vcs.length - 5}</li>}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {archivedVacancies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Заархивированные вакансии</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedLoading && <div className="col-span-full text-center py-4 text-gray-500">Loading…</div>}
            {!archivedLoading && archivedVacancies.map((v: any) => (
              <LinkWithTab
                key={v.id}
                href={`/vacancies/${v.id}`}
                className="block bg-gray-50 rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-700 flex-1">{v.title}</h3>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                    Архив
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{v.employer?.name ?? '—'} · {v.country?.name ?? '—'}</p>
                {salaryText(v) && <p className="text-sm text-gray-500">{salaryText(v)}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  Кандидатов: {v._count?.vacancyCandidates ?? 0} · мест: {v.openPositions ?? 1}
                </p>
              </LinkWithTab>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
