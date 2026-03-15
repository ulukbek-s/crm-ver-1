'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { AvatarImage } from '@/components/AvatarImage';
import { Camera, Lock, BarChart3, Settings, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { clsx } from 'clsx';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchProfile() {
  const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchProfileStats() {
  const res = await fetch('/api/auth/me/stats', { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function updateProfile(body: { firstName?: string; lastName?: string; phone?: string; userStatus?: string }) {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText);
  }
  return res.json();
}

async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/auth/me/avatar', {
    method: 'POST',
    headers: getAuthHeaders() as Record<string, string>,
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/me/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Failed');
  }
  return res.json();
}

const adminApi = {
  documentTypes: (countryId?: string) =>
    fetch(`/api/admin/document-types${countryId ? `?countryId=${countryId}` : ''}`, {
      headers: getAuthHeaders(),
    }).then((r) => (r.ok ? r.json() : [])),
  leadSources: () =>
    fetch('/api/admin/lead-sources', { headers: getAuthHeaders() }).then((r) =>
      r.ok ? r.json() : [],
    ),
  countries: () =>
    fetch('/api/admin/countries', { headers: getAuthHeaders() }).then((r) =>
      r.ok ? r.json() : [],
    ),
  branches: (countryId?: string) =>
    fetch(`/api/admin/branches${countryId ? `?countryId=${countryId}` : ''}`, {
      headers: getAuthHeaders(),
    }).then((r) => (r.ok ? r.json() : [])),
  createDocumentType: (body: { countryId: string; code: string; name: string; order?: number }) =>
    fetch('/api/admin/document-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateDocumentType: (id: string, body: { code?: string; name?: string; order?: number }) =>
    fetch(`/api/admin/document-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteDocumentType: (id: string) =>
    fetch(`/api/admin/document-types/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  copyDocumentTypes: (body: { sourceCountryId: string; targetCountryId: string }) =>
    fetch('/api/admin/document-types/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  createLeadSource: (body: { name: string; code: string }) =>
    fetch('/api/admin/lead-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateLeadSource: (id: string, body: { name?: string; code?: string }) =>
    fetch(`/api/admin/lead-sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteLeadSource: (id: string) =>
    fetch(`/api/admin/lead-sources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  createCountry: (body: { name: string; code: string; organizationId?: string }) =>
    fetch('/api/admin/countries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateCountry: (id: string, body: { name?: string; code?: string }) =>
    fetch(`/api/admin/countries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteCountry: (id: string) =>
    fetch(`/api/admin/countries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  createBranch: (body: { name: string; countryId: string }) =>
    fetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateBranch: (id: string, body: { name?: string; countryId?: string }) =>
    fetch(`/api/admin/branches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteBranch: (id: string) =>
    fetch(`/api/admin/branches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  programs: () =>
    fetch('/api/admin/programs', { headers: getAuthHeaders() }).then((r) =>
      r.ok ? r.json() : [],
    ),
  createProgram: (body: {
    name: string;
    code: string;
    order?: number;
    countryId?: string;
    price?: number;
    candidatePrice?: number;
    requiresLanguage?: boolean;
  }) =>
    fetch('/api/admin/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateProgram: (id: string, body: {
    name?: string;
    code?: string;
    order?: number;
    countryId?: string | null;
    price?: number;
    candidatePrice?: number;
    requiresLanguage?: boolean;
  }) =>
    fetch(`/api/admin/programs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteProgram: (id: string) =>
    fetch(`/api/admin/programs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  employers: (countryId?: string) =>
    fetch(`/api/recruitment/employers${countryId ? `?countryId=${countryId}` : ''}`, {
      headers: getAuthHeaders(),
    }).then((r) => (r.ok ? r.json() : [])),
  createEmployer: (body: { name: string; countryId?: string; contact?: string; email?: string }) =>
    fetch('/api/recruitment/employers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateEmployer: (
    id: string,
    body: { name?: string; countryId?: string; contact?: string; email?: string },
  ) =>
    fetch(`/api/recruitment/employers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteEmployer: (id: string) =>
    fetch(`/api/recruitment/employers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
  embassies: () =>
    fetch('/api/admin/embassies', { headers: getAuthHeaders() }).then((r) =>
      r.ok ? r.json() : [],
    ),
  createEmbassy: (body: { name: string; country?: string; city?: string; address?: string }) =>
    fetch('/api/admin/embassies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  updateEmbassy: (
    id: string,
    body: { name?: string; country?: string; city?: string; address?: string },
  ) =>
    fetch(`/api/admin/embassies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }),
  deleteEmbassy: (id: string) =>
    fetch(`/api/admin/embassies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
};

const ADMIN_TABS = ['documentTypes', 'programs', 'leadSources', 'countries', 'branches', 'employers', 'embassies', 'visaChecklist'] as const;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialAdminTab = ADMIN_TABS.includes(tabFromUrl as (typeof ADMIN_TABS)[number]) ? tabFromUrl : undefined;
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', userStatus: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const { data: stats } = useQuery({
    queryKey: ['profile', 'stats'],
    queryFn: fetchProfileStats,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        userStatus: profile.userStatus ?? '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => queryClient.setQueryData(['profile'], data),
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => queryClient.setQueryData(['profile'], data),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ current, new: n }: { current: string; new: string }) => changePassword(current, n),
    onSuccess: () => setPasswordForm({ current: '', new: '' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      userStatus: form.userStatus.trim() || undefined,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    passwordMutation.mutate({ current: passwordForm.current, new: passwordForm.new });
  };

  if (isLoading || !profile) {
    return (
      <div className="max-w-2xl">
        <p className="text-gray-500 dark:text-gray-400">{isLoading ? t('common.loading') : 'Profile not found.'}</p>
      </div>
    );
  }

  const roles: string[] =
    (profile.userRoles ?? []).map((ur: { role?: { name?: string } }) => ur.role?.name).filter(Boolean) ?? [];
  const isFounder: boolean = !!profile.isFounder;
  const primaryRole = isFounder ? 'Founder' : roles[0] ?? null;

  const roleLabel = primaryRole
    ? ({
        Founder: 'Основатель (главный аккаунт)',
        Manager: 'Менеджер',
        Recruiter: 'Рекрутер',
        BranchManager: 'Менеджер филиала',
        VisaOfficer: 'Визовый офицер',
        Accountant: 'Бухгалтер',
        Partner: 'Партнёр',
        Customer: 'Клиент',
      } as Record<string, string>)[primaryRole] || primaryRole
    : 'Пользователь';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('profile.subtitle')}</p>
      </div>

      {/* Avatar + account role + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm flex items-center gap-6">
          <div className="relative group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:border-blue-500 transition-colors"
            >
              <AvatarImage hasAvatar={!!profile.avatarUrl} className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                <Camera className="w-8 h-8 text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMutation.mutate(file);
                e.target.value = '';
              }}
            />
            {avatarMutation.isPending && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-white bg-black/70 px-2 py-0.5 rounded">...</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Статус аккаунта</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-3 py-1 text-xs font-semibold">
                  {roleLabel}
                </span>
                {roles.length > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Роли: {roles.join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Пользовательский статус
              </label>
              <input
                value={form.userStatus}
                onChange={(e) => setForm((f) => ({ ...f, userStatus: e.target.value }))}
                placeholder="Например: Доступен, На встрече…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t('profile.myLeads'), value: stats?.myLeads ?? '—', icon: BarChart3 },
            { label: t('profile.myCandidates'), value: stats?.myCandidates ?? '—', icon: BarChart3 },
            { label: t('profile.myTasks'), value: stats?.myTasks ?? '—', icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile form + password in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.email')}
              </label>
              <input
                type="email"
                value={profile.email ?? ''}
                disabled
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.firstName')}
                </label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.lastName')}
                </label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.phone')}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </div>
            {profile.branch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch
                </label>
                <p className="text-gray-700 dark:text-gray-300">{profile.branch?.name ?? '—'}</p>
              </div>
            )}
            {mutation.isError && <p className="text-sm text-red-600">{mutation.error?.message}</p>}
            {mutation.isSuccess && <p className="text-sm text-green-600">Saved.</p>}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? '...' : t('profile.save')}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('profile.updatePassword')}
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.currentPassword')}
              </label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.newPassword')}
              </label>
              <input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </div>
            {passwordMutation.isError && (
              <p className="text-sm text-red-600">{passwordMutation.error?.message}</p>
            )}
            {passwordMutation.isSuccess && (
              <p className="text-sm text-green-600">Password updated.</p>
            )}
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Update password
            </button>
          </form>
        </div>
      </div>

      {/* Admin CRUD — profile page settings */}
      <AdminCrudSection queryClient={queryClient} t={t} initialTab={initialAdminTab} />
    </div>
  );
}

type AdminTab =
  | 'documentTypes'
  | 'leadSources'
  | 'countries'
  | 'branches'
  | 'programs'
  | 'employers'
  | 'embassies'
  | 'visaChecklist';

function AdminCrudSection({
  queryClient,
  t,
  initialTab,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  t: (key: string) => string;
  initialTab?: string;
}) {
  const validTabs = ['documentTypes', 'programs', 'leadSources', 'countries', 'branches', 'employers', 'embassies', 'visaChecklist'] as const;
  const [tab, setTab] = useState<AdminTab>(
    initialTab && validTabs.includes(initialTab as AdminTab) ? (initialTab as AdminTab) : 'documentTypes'
  );
  const [docTypeCountryId, setDocTypeCountryId] = useState('');
  const [branchCountryId, setBranchCountryId] = useState('');
  const [employerCountryId, setEmployerCountryId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab as AdminTab)) setTab(initialTab as AdminTab);
  }, [initialTab]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const report = (text: string, isError?: boolean) => setMessage({ type: isError ? 'error' : 'success', text });

  const { data: countries = [] } = useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: () => adminApi.countries(),
  });

  const { data: documentTypes = [], refetch: refetchDocTypes } = useQuery({
    queryKey: ['admin', 'document-types', docTypeCountryId || null],
    queryFn: () => adminApi.documentTypes(docTypeCountryId || undefined),
  });

  const { data: leadSources = [], refetch: refetchLeadSources } = useQuery({
    queryKey: ['admin', 'lead-sources'],
    queryFn: () => adminApi.leadSources(),
  });

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ['admin', 'branches', branchCountryId || null],
    queryFn: () => adminApi.branches(branchCountryId || undefined),
  });

  const { data: programs = [], refetch: refetchPrograms } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => adminApi.programs(),
  });

  const { data: employers = [], refetch: refetchEmployers } = useQuery({
    queryKey: ['admin', 'employers', employerCountryId || null],
    queryFn: () => adminApi.employers(employerCountryId || undefined),
  });
  const { data: embassies = [], refetch: refetchEmbassies } = useQuery({
    queryKey: ['admin', 'embassies'],
    queryFn: () => adminApi.embassies(),
  });

  const inval = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    refetchDocTypes();
    refetchLeadSources();
    refetchBranches();
    refetchPrograms();
    refetchEmployers();
    refetchEmbassies();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        {t('profile.adminSettings')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Списки для формы «Добавить кандидата» (программа, источник лида, страна, филиал) и типы документов по странам настраиваются здесь. Типы документов привязаны к стране — в карточке кандидата на вкладке «Документы» показываются только типы выбранной страны.
      </p>
      {message && (
        <p className={clsx('mb-4 py-2 px-3 rounded text-sm', message.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')}>
          {message.text}
        </p>
      )}
      <nav className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-600 mb-4">
        {(['documentTypes', 'programs', 'leadSources', 'countries', 'branches', 'employers', 'embassies', 'visaChecklist'] as const).map((tId) => (
          <button
            key={tId}
            type="button"
            onClick={() => setTab(tId)}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-t border-b-2 -mb-px',
              tab === tId
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            {tId === 'documentTypes' && 'Типы документов (по стране)'}
            {tId === 'programs' && 'Программы'}
            {tId === 'leadSources' && t('profile.leadSources')}
            {tId === 'countries' && t('profile.countries')}
            {tId === 'branches' && t('profile.branches')}
            {tId === 'employers' && 'Работодатели'}
            {tId === 'embassies' && 'Посольства'}
            {tId === 'visaChecklist' && 'Чек-лист визы'}
          </button>
        ))}
      </nav>

      {tab === 'documentTypes' && (
        <AdminDocumentTypes
          countries={countries}
          documentTypes={documentTypes}
          docTypeCountryId={docTypeCountryId}
          setDocTypeCountryId={setDocTypeCountryId}
          adminApi={adminApi}
          onMutate={inval}
          report={report}
        />
      )}
      {tab === 'leadSources' && (
        <AdminLeadSources leadSources={leadSources} adminApi={adminApi} onMutate={inval} report={report} />
      )}
      {tab === 'countries' && (
        <AdminCountries countries={countries} adminApi={adminApi} onMutate={inval} report={report} />
      )}
      {tab === 'branches' && (
        <AdminBranches
          countries={countries}
          branches={branches}
          branchCountryId={branchCountryId}
          setBranchCountryId={setBranchCountryId}
          adminApi={adminApi}
          onMutate={inval}
          report={report}
        />
      )}
      {tab === 'programs' && (
        <AdminPrograms countries={countries} programs={programs} adminApi={adminApi} onMutate={inval} report={report} />
      )}
      {tab === 'employers' && (
        <AdminEmployers
          countries={countries}
          employers={employers}
          employerCountryId={employerCountryId}
          setEmployerCountryId={setEmployerCountryId}
          onMutate={inval}
          report={report}
        />
      )}
      {tab === 'embassies' && (
        <AdminEmbassies embassies={embassies} onMutate={inval} report={report} />
      )}
      {tab === 'visaChecklist' && (
        <AdminVisaChecklist countries={countries} report={report} />
      )}
    </div>
  );
}

function AdminVisaChecklist({
  countries,
  report,
}: {
  countries: { id: string; name: string; code: string }[];
  report: (text: string, isError?: boolean) => void;
}) {
  const firstCode = countries.length ? countries[0].code : '';
  const [countryCode, setCountryCode] = useState(firstCode);
  const [items, setItems] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (countries.length && !countries.some((c) => c.code === countryCode)) {
      setCountryCode(countries[0].code);
    }
  }, [countries, countryCode]);

  const { data: loadedItems = [], refetch } = useQuery({
    queryKey: ['visa', 'checklist-template', countryCode],
    queryFn: () =>
      fetch(`/api/visa/checklist-template?country=${countryCode}`, { headers: getAuthHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
    enabled: !!countryCode,
  });

  useEffect(() => {
    setItems(loadedItems);
  }, [loadedItems]);

  const addItem = () => {
    setItems((prev) => [...prev, { code: `doc_${Date.now()}`, name: 'Новый документ' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: 'code' | 'name', value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const save = () => {
    setSaving(true);
    fetch('/api/visa/checklist-template', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ countryCode, items }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(() => {
        refetch();
        report('Список требуемых документов сохранён.');
      })
      .catch(() => report('Не удалось сохранить.', true))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Требуемые документы для визового чек-листа по странам. Список используется на странице виза-кейса при загрузке документов.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Страна:</label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            disabled={!countries.length}
          >
            {!countries.length && <option value="">Сначала добавьте страны</option>}
            {countries.map((c) => (
              <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus className="h-4 w-4" /> Добавить документ
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Код</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Название</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <input
                    value={item.code}
                    onChange={(e) => updateItem(i, 'code', e.target.value)}
                    className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    className="min-w-[200px] w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Нет документов. Нажмите «Добавить документ» или выберите другую страну.</p>
      )}
    </div>
  );
}

function AdminEmployers({
  countries,
  employers,
  employerCountryId,
  setEmployerCountryId,
  onMutate,
  report,
}: {
  countries: { id: string; name: string; code: string }[];
  employers: { id: string; name: string; countryId?: string | null; contact?: string | null; email?: string | null; country?: { name: string } }[];
  employerCountryId: string;
  setEmployerCountryId: (v: string) => void;
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCountryId, setEditCountryId] = useState('');
  const [search, setSearch] = useState('');
  const filtered = employers.filter(
    (r) =>
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.country?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createEmployer({
        name,
        countryId: employerCountryId || undefined,
        contact: contact.trim() || undefined,
        email: email.trim() || undefined,
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setName('');
      setContact('');
      setEmail('');
      onMutate();
      report('Работодатель добавлен');
    },
    onError: (e: Error) => report(e.message, true),
  });
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; countryId?: string; contact?: string; email?: string };
    }) => {
      const r = await adminApi.updateEmployer(id, data);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setEditingId(null);
      onMutate();
      report('Сохранено');
    },
    onError: (e: Error) => report(e.message, true),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteEmployer(id);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка удаления');
      }
      return r;
    },
    onSuccess: () => {
      onMutate();
      report('Удалено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Страна</label>
          <select
            value={employerCountryId}
            onChange={(e) => setEmployerCountryId(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Все страны</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Care Plus GmbH"
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Контакт / Email</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Контакт"
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-40 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48 text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="button"
          disabled={!name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <input
        type="search"
        placeholder="Поиск по названию, стране, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64 text-gray-900 dark:text-gray-100"
      />
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2 text-gray-800 dark:text-gray-200">Название</th>
            <th className="text-left p-2 text-gray-800 dark:text-gray-200">Страна</th>
            <th className="text-left p-2 text-gray-800 dark:text-gray-200">Контакт / Email</th>
            <th className="w-24 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              {editingId === row.id ? (
                <>
                  <td className="p-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={editCountryId}
                      onChange={(e) => setEditCountryId(e.target.value)}
                      className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    >
                      <option value="">—</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      placeholder="Контакт"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    />
                  </td>
                  <td className="p-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: row.id,
                          data: {
                            name: editName,
                            countryId: editCountryId || undefined,
                            contact: editContact.trim() || undefined,
                            email: editEmail.trim() || undefined,
                          },
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="text-green-600 dark:text-green-400 text-xs font-medium"
                    >
                      Сохранить
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 dark:text-gray-400 text-xs">
                      Отмена
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2 text-gray-800 dark:text-gray-200">{row.name}</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">{row.country?.name ?? '—'}</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">
                    {[row.contact, row.email].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="p-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                        setEditContact(row.contact ?? '');
                        setEditEmail(row.email ?? '');
                        setEditCountryId(row.countryId ?? '');
                      }}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Изменить"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {employers.length === 0 && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Добавьте работодателей — они появятся в форме создания вакансии.
        </p>
      )}
    </div>
  );
}

function AdminEmbassies({
  embassies,
  onMutate,
  report,
}: {
  embassies: { id: string; name: string; country?: string | null; city?: string | null; address?: string | null }[];
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [embassyIdToDelete, setEmbassyIdToDelete] = useState<string | null>(null);

  const filtered = embassies.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.country ?? '').toLowerCase().includes(q) ||
      (e.city ?? '').toLowerCase().includes(q)
    );
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createEmbassy({
        name: name.trim(),
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setName('');
      setCountry('');
      setCity('');
      setAddress('');
      onMutate();
      report('Посольство добавлено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      data: { name?: string; country?: string; city?: string; address?: string };
    }) => {
      const r = await adminApi.updateEmbassy(payload.id, payload.data);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setEditingId(null);
      onMutate();
      report('Сохранено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteEmbassy(id);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка удаления');
      }
      return r;
    },
    onSuccess: () => {
      onMutate();
      report('Удалено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Страна</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Germany"
            className="w-40 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Город</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Berlin"
            className="w-40 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Botschaft der Bundesrepublik Deutschland"
            className="w-64 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Адрес</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес посольства"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            createMutation.mutate();
          }}
          disabled={createMutation.isPending || !name.trim()}
          className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Всего посольств: <strong>{embassies.length}</strong>
        </div>
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, стране или городу…"
            className="w-64 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Страна
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Город
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Название
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Адрес
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {filtered.map((e) => {
              const isEditing = editingId === e.id;
              return (
                <tr key={e.id}>
                  <td className="px-3 py-2 align-top">
                    {isEditing ? (
                      <input
                        value={editCountry}
                        onChange={(ev) => setEditCountry(ev.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span>{e.country || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {isEditing ? (
                      <input
                        value={editCity}
                        onChange={(ev) => setEditCity(ev.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span>{e.city || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(ev) => setEditName(ev.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span>{e.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {isEditing ? (
                      <input
                        value={editAddress}
                        onChange={(ev) => setEditAddress(ev.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span>{e.address || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              updateMutation.mutate({
                                id: e.id,
                                data: {
                                  name: editName.trim() || undefined,
                                  country: editCountry.trim() || undefined,
                                  city: editCity.trim() || undefined,
                                  address: editAddress.trim() || undefined,
                                },
                              });
                            }}
                            disabled={updateMutation.isPending}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(e.id);
                              setEditName(e.name);
                              setEditCountry(e.country ?? '');
                              setEditCity(e.city ?? '');
                              setEditAddress(e.address ?? '');
                            }}
                            className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3 w-3" />
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmbassyIdToDelete(e.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Посольства не найдены.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={embassyIdToDelete !== null}
        title="Удалить посольство?"
        description="Запись о посольстве будет удалена. Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onCancel={() => setEmbassyIdToDelete(null)}
        onConfirm={() => {
          if (!embassyIdToDelete) return;
          deleteMutation.mutate(embassyIdToDelete);
          setEmbassyIdToDelete(null);
        }}
      />
    </div>
  );
}

function AdminDocumentTypes({
  countries,
  documentTypes,
  docTypeCountryId,
  setDocTypeCountryId,
  onMutate,
  report,
}: {
  countries: { id: string; name: string; code: string }[];
  documentTypes: { id: string; countryId: string; code: string; name: string; order: number; country?: { name: string } }[];
  docTypeCountryId: string;
  setDocTypeCountryId: (v: string) => void;
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [copySourceId, setCopySourceId] = useState('');
  const [search, setSearch] = useState('');

  const filtered = documentTypes.filter(
    (r) => !search.trim() || [r.code, r.name, r.country?.name].some((s) => s?.toLowerCase().includes(search.toLowerCase())),
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createDocumentType({
        countryId: docTypeCountryId,
        code,
        name,
        order: order === '' ? 0 : Number(order),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setCode('');
      setName('');
      setOrder('');
      onMutate();
      report('Добавлено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { code?: string; name?: string; order?: number } }) => {
      const r = await adminApi.updateDocumentType(id, data);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка');
      }
      return r;
    },
    onSuccess: () => {
      setEditingId(null);
      onMutate();
      report('Сохранено');
    },
    onError: (e: Error) => report(e.message, true),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteDocumentType(id);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || 'Ошибка удаления');
      }
      return r;
    },
    onSuccess: () => { onMutate(); report('Удалено'); },
    onError: (e: Error) => report(e.message, true),
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.copyDocumentTypes({ sourceCountryId: copySourceId, targetCountryId: docTypeCountryId });
      if (!r.ok) throw new Error('Ошибка');
      return r.json();
    },
    onSuccess: () => { onMutate(); report('Типы документов скопированы'); setCopySourceId(''); },
    onError: (e: Error) => report(e.message, true),
  });

  const startEdit = (row: (typeof documentTypes)[0]) => {
    setEditingId(row.id);
    setEditCode(row.code);
    setEditName(row.name);
    setEditOrder(row.order);
  };

  const reorderMutation = useMutation({
    mutationFn: async ({ row, delta }: { row: (typeof documentTypes)[0]; delta: number }) => {
      const idx = documentTypes.findIndex((r) => r.id === row.id);
      const next = documentTypes[idx + delta];
      if (!next) throw new Error('');
      await adminApi.updateDocumentType(row.id, { order: next.order });
      const r2 = await adminApi.updateDocumentType(next.id, { order: row.order });
      if (!r2.ok) throw new Error('Ошибка');
    },
    onSuccess: () => { onMutate(); report('Порядок изменён'); },
    onError: (e: Error) => e.message && report(e.message, true),
  });

  const moveOrder = (row: (typeof documentTypes)[0], delta: number) => {
    const idx = documentTypes.findIndex((r) => r.id === row.id);
    if (idx < 0 || idx + delta < 0 || idx + delta >= documentTypes.length) return;
    reorderMutation.mutate({ row, delta });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Страна</label>
          <select
            value={docTypeCountryId}
            onChange={(e) => setDocTypeCountryId(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Код</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-32" placeholder="passport" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-40" placeholder="Паспорт" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Порядок</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-16"
          />
        </div>
        <button
          type="button"
          disabled={!docTypeCountryId || !code.trim() || !name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      {docTypeCountryId && countries.length > 1 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400">Скопировать типы из страны:</label>
          <select
            value={copySourceId}
            onChange={(e) => setCopySourceId(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {countries.filter((c) => c.id !== docTypeCountryId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!copySourceId || copyMutation.isPending}
            onClick={() => copyMutation.mutate()}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-600 text-white text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Скопировать
          </button>
        </div>
      )}
      <div>
        <input
          type="search"
          placeholder="Поиск по коду, названию, стране..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64"
        />
      </div>
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2">Страна</th>
            <th className="text-left p-2">Код</th>
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Порядок</th>
            <th className="w-32 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              <td className="p-2">{row.country?.name ?? row.countryId}</td>
              {editingId === row.id ? (
                <>
                  <td className="p-2"><input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2"><input type="number" value={editOrder} onChange={(e) => setEditOrder(Number(e.target.value) || 0)} className="w-14 rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2 flex items-center gap-1">
                    <button type="button" onClick={() => updateMutation.mutate({ id: row.id, data: { code: editCode, name: editName, order: editOrder } })} disabled={updateMutation.isPending} className="text-green-600 text-xs">Сохранить</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 text-xs">Отмена</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">{row.code}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.order}</td>
                  <td className="p-2 flex items-center gap-1">
                    <button type="button" onClick={() => moveOrder(row, -1)} disabled={documentTypes.indexOf(row) <= 0} className="p-0.5 text-gray-500 hover:text-gray-700" title="Вверх"><ChevronUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveOrder(row, 1)} disabled={documentTypes.indexOf(row) >= documentTypes.length - 1} className="p-0.5 text-gray-500 hover:text-gray-700" title="Вниз"><ChevronDown className="h-4 w-4" /></button>
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Изменить"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {documentTypes.length === 0 && <p className="text-sm text-gray-500">Нет типов документов. Выберите страну и добавьте.</p>}
    </div>
  );
}

function AdminLeadSources({
  leadSources,
  onMutate,
  report,
}: {
  leadSources: { id: string; name: string; code: string }[];
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [search, setSearch] = useState('');
  const filtered = leadSources.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createLeadSource({ name, code });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setName(''); setCode(''); onMutate(); report('Добавлено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; code?: string } }) => {
      const r = await adminApi.updateLeadSource(id, data);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setEditingId(null); onMutate(); report('Сохранено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteLeadSource(id);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка удаления'); }
      return r;
    },
    onSuccess: () => { onMutate(); report('Удалено'); },
    onError: (e: Error) => report(e.message, true),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Код</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-32" />
        </div>
        <button type="button" disabled={!name.trim() || !code.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <input type="search" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64" />
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Код</th>
            <th className="w-24 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              {editingId === row.id ? (
                <>
                  <td className="p-2"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2"><input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2 flex gap-1">
                    <button type="button" onClick={() => updateMutation.mutate({ id: row.id, data: { name: editName, code: editCode } })} disabled={updateMutation.isPending} className="text-green-600 text-xs">Сохранить</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 text-xs">Отмена</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.code}</td>
                  <td className="p-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                        setEditCode(row.code);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Изменить"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminCountries({
  countries,
  onMutate,
  report,
}: {
  countries: { id: string; name: string; code: string }[];
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [search, setSearch] = useState('');
  const filtered = countries.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createCountry({ name, code });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setName(''); setCode(''); onMutate(); report('Добавлено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; code?: string } }) => {
      const r = await adminApi.updateCountry(id, data);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setEditingId(null); onMutate(); report('Сохранено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteCountry(id);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка удаления'); }
      return r;
    },
    onSuccess: () => { onMutate(); report('Удалено'); },
    onError: (e: Error) => report(e.message, true),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Код</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-20" placeholder="DE" />
        </div>
        <button type="button" disabled={!name.trim() || !code.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <input type="search" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64" />
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Код</th>
            <th className="w-24 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              {editingId === row.id ? (
                <>
                  <td className="p-2"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2"><input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2 flex gap-1">
                    <button type="button" onClick={() => updateMutation.mutate({ id: row.id, data: { name: editName, code: editCode } })} disabled={updateMutation.isPending} className="text-green-600 text-xs">Сохранить</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 text-xs">Отмена</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.code}</td>
                  <td className="p-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                        setEditCode(row.code);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Изменить"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminBranches({
  countries,
  branches,
  branchCountryId,
  setBranchCountryId,
  onMutate,
  report,
}: {
  countries: { id: string; name: string; code: string }[];
  branches: { id: string; name: string; countryId: string; country?: { name: string } }[];
  branchCountryId: string;
  setBranchCountryId: (v: string) => void;
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');
  const filtered = branches.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || (r.country?.name ?? '').toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createBranch({ name, countryId: branchCountryId });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setName(''); onMutate(); report('Добавлено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string } }) => {
      const r = await adminApi.updateBranch(id, data);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setEditingId(null); onMutate(); report('Сохранено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteBranch(id);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка удаления'); }
      return r;
    },
    onSuccess: () => { onMutate(); report('Удалено'); },
    onError: (e: Error) => report(e.message, true),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Страна</label>
          <select value={branchCountryId} onChange={(e) => setBranchCountryId(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {countries.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Название филиала</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48" />
        </div>
        <button type="button" disabled={!name.trim() || !branchCountryId || createMutation.isPending} onClick={() => createMutation.mutate()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <input type="search" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64" />
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Страна</th>
            <th className="w-24 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              {editingId === row.id ? (
                <>
                  <td className="p-2"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm" /></td>
                  <td className="p-2">{row.country?.name ?? row.countryId}</td>
                  <td className="p-2 flex gap-1">
                    <button type="button" onClick={() => updateMutation.mutate({ id: row.id, data: { name: editName } })} disabled={updateMutation.isPending} className="text-green-600 text-xs">Сохранить</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 text-xs">Отмена</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.country?.name ?? row.countryId}</td>
                  <td className="p-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Изменить"
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {branches.length === 0 && <p className="text-sm text-gray-500">Выберите страну и добавьте филиалы.</p>}
    </div>
  );
}

function AdminPrograms({
  countries,
  programs,
  onMutate,
  report,
}: {
  countries: { id: string; name: string }[];
  programs: { id: string; name: string; code: string; order: number; countryId?: string | null; country?: { id: string; name: string }; price?: number | null; candidatePrice?: number | null; requiresLanguage?: boolean }[];
  onMutate: () => void;
  report: (text: string, isError?: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [order, setOrder] = useState(0);
  const [countryId, setCountryId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [editCountryId, setEditCountryId] = useState('');
  const [price, setPrice] = useState('');
  const [candidatePrice, setCandidatePrice] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCandidatePrice, setEditCandidatePrice] = useState('');
  const [requiresLanguage, setRequiresLanguage] = useState(false);
  const [editRequiresLanguage, setEditRequiresLanguage] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = programs.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.createProgram({
        name,
        code,
        order,
        countryId: countryId || undefined,
        price: price.trim() ? Number(price) : undefined,
        candidatePrice: candidatePrice.trim() ? Number(candidatePrice) : undefined,
        requiresLanguage,
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => {
      setName('');
      setCode('');
      setOrder(0);
      setCountryId('');
      setPrice('');
      setCandidatePrice('');
      onMutate();
      report('Добавлено');
    },
    onError: (e: Error) => report(e.message, true),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; code?: string; order?: number; countryId?: string | null; price?: number; candidatePrice?: number; requiresLanguage?: boolean } }) => {
      const r = await adminApi.updateProgram(id, data);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка'); }
      return r;
    },
    onSuccess: () => { setEditingId(null); onMutate(); report('Сохранено'); },
    onError: (e: Error) => report(e.message, true),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await adminApi.deleteProgram(id);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || 'Ошибка удаления'); }
      return r;
    },
    onSuccess: () => { onMutate(); report('Удалено'); },
    onError: (e: Error) => report(e.message, true),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ row, delta }: { row: (typeof programs)[0]; delta: number }) => {
      const idx = programs.findIndex((r) => r.id === row.id);
      const next = programs[idx + delta];
      if (!next) throw new Error('');
      await adminApi.updateProgram(row.id, { order: next.order });
      const r2 = await adminApi.updateProgram(next.id, { order: row.order });
      if (!r2.ok) throw new Error('Ошибка');
    },
    onSuccess: () => { onMutate(); report('Порядок изменён'); },
    onError: (e: Error) => e.message && report(e.message, true),
  });
  const moveOrder = (row: (typeof programs)[0], delta: number) => {
    const idx = programs.findIndex((r) => r.id === row.id);
    if (idx < 0 || idx + delta < 0 || idx + delta >= programs.length) return;
    reorderMutation.mutate({ row, delta });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Программы привязаны к стране. В форме «Добавить кандидата» список программ фильтруется по выбранной стране. Филиал не привязан к стране.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Страна</label>
          <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-40 text-gray-900 dark:text-white">
            <option value="">—</option>
            {countries.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-48 text-gray-900 dark:text-white" placeholder="Nursing, Care..." />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Код</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-24 text-gray-900 dark:text-white" placeholder="nursing" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Порядок</label>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-16 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400">Стоимость программы</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-28 text-gray-900 dark:text-white"
            placeholder="1000"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Нужен язык
          </label>
          <input
            type="checkbox"
            checked={requiresLanguage}
            onChange={(e) => setRequiresLanguage(e.target.checked)}
            className="rounded"
          />
        </div>
        <button type="button" disabled={!name.trim() || !code.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <input type="search" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm w-64 text-gray-900 dark:text-white" />
      <table className="w-full text-sm border border-gray-200 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="text-left p-2">Страна</th>
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Код</th>
            <th className="text-left p-2">Стоимость</th>
            <th className="text-left p-2">Порядок</th>
            <th className="w-32 p-2" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-600">
              {editingId === row.id ? (
                <>
                  <td className="p-2">
                    <select value={editCountryId} onChange={(e) => setEditCountryId(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5 text-sm text-gray-900 dark:text-white">
                      <option value="">—</option>
                      {countries.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </td>
                  <td className="p-2"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm text-gray-900 dark:text-white" /></td>
                  <td className="p-2"><input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-full rounded border px-1 py-0.5 text-sm text-gray-900 dark:text-white" /></td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-20 rounded border px-1 py-0.5 text-sm text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2"><input type="number" value={editOrder} onChange={(e) => setEditOrder(Number(e.target.value) || 0)} className="w-14 rounded border px-1 py-0.5 text-sm text-gray-900 dark:text-white" /></td>
                  <td className="p-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: row.id,
                          data: {
                            name: editName,
                            code: editCode,
                            order: editOrder,
                            countryId: editCountryId || null,
                            price: editPrice.trim() ? Number(editPrice) : undefined,
                          },
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="text-green-600 text-xs"
                    >
                      Сохранить
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 text-xs">Отмена</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">{row.country?.name ?? '—'}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.code}</td>
                  <td className="p-2">{row.price ?? '—'}</td>
                  <td className="p-2">{row.order}</td>
                  <td className="p-2 flex items-center gap-1">
                    <button type="button" onClick={() => moveOrder(row, -1)} disabled={programs.indexOf(row) <= 0} className="p-0.5 text-gray-500 hover:text-gray-700" title="Вверх"><ChevronUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveOrder(row, 1)} disabled={programs.indexOf(row) >= programs.length - 1} className="p-0.5 text-gray-500 hover:text-gray-700" title="Вниз"><ChevronDown className="h-4 w-4" /></button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                        setEditCode(row.code);
                        setEditOrder(row.order);
                        setEditCountryId(row.countryId ?? '');
                        setEditPrice(row.price != null ? String(row.price) : '');
                        setEditCandidatePrice(row.candidatePrice != null ? String(row.candidatePrice) : '');
                      }}
                      className="text-gray-600 hover:underline"
                      title="Изменить"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteMutation.mutate(row.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:underline" title="Удалить"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {programs.length === 0 && <p className="text-sm text-gray-500">Добавьте программы — они появятся в форме «Добавить кандидата» (по выбранной стране).</p>}
    </div>
  );
}
