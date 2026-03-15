'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchProfile() {
  const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export default function PartnerPage() {
  const { t } = useLocale();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  if (isLoading || !profile) {
    return (
      <div>
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Партнёрский кабинет
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Здесь вы можете работать со своими вакансиями и кандидатами, которых мы вам отправляем.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Ваш профиль
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Имя</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{profile.email}</dd>
            </div>
            {profile.branch?.name && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Страна / филиал</dt>
                <dd className="text-gray-900 dark:text-gray-100">{profile.branch.name}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Что будет дальше
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>Вы будете видеть открытые вакансии, закреплённые за вашей компанией.</li>
            <li>Сможете отслеживать статус кандидатов, которых мы вам отправили.</li>
            <li>Получать основные отчёты по найму по вашей стране / компании.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

