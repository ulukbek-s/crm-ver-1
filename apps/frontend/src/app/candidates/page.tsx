'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { LinkWithTab } from '@/components/LinkWithTab';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AddCandidateModal } from '@/components/forms/AddCandidateModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTabsStore } from '@/store/tabs';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const PIPELINE_STAGES = [
  { id: 'leads', label: 'Leads' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'document_prep', label: 'Подготовка документов' },
  { id: 'waiting_employer', label: 'Ждём ответа работодателя' },
  { id: 'visa_prep', label: 'Виза подготовка' },
  { id: 'visa_waiting', label: 'Виза ожидание' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

async function fetchCandidates(params?: { branchId?: string; countryId?: string; pipelineStage?: string }) {
  const url = new URL('/api/crm/candidates', typeof window !== 'undefined' ? window.location.origin : '');
  if (params?.branchId) url.searchParams.set('branchId', params.branchId);
  if (params?.pipelineStage) url.searchParams.set('pipelineStage', params.pipelineStage);
  if (params?.countryId) url.searchParams.set('countryId', params.countryId);
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCountries() {
  const res = await fetch('/api/crm/countries', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchBranches() {
  const res = await fetch('/api/crm/branches', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}

async function fetchArchivedCandidates(params?: { branchId?: string; countryId?: string }) {
  const url = new URL('/api/crm/candidates/archived', typeof window !== 'undefined' ? window.location.origin : '');
  if (params?.branchId) url.searchParams.set('branchId', params.branchId);
  if (params?.countryId) url.searchParams.set('countryId', params.countryId);
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function unarchiveCandidate(id: string) {
  const res = await fetch(`/api/crm/candidates/${id}/unarchive`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function deleteCandidate(id: string) {
  const res = await fetch(`/api/crm/candidates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterCountryId, setFilterCountryId] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [candidateIdToDelete, setCandidateIdToDelete] = useState<string | null>(null);
  const closeTab = useTabsStore((s) => s.closeTab);

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      // закрываем вкладку кандидата, если она была открыта
      closeTab(`/candidates/${id}`);
    },
  });

  const { data: countries = [] } = useQuery({ queryKey: ['crm', 'countries'], queryFn: fetchCountries });
  const { data: branches = [] } = useQuery({ queryKey: ['crm', 'branches'], queryFn: fetchBranches });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['candidates', filterBranchId || null, filterCountryId || null, filterStage || null],
    queryFn: () => fetchCandidates({
      ...(filterBranchId && { branchId: filterBranchId }),
      ...(filterCountryId && { countryId: filterCountryId }),
      ...(filterStage && { pipelineStage: filterStage }),
    }),
  });

  const { data: archivedCandidates = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['candidates', 'archived', filterBranchId || null, filterCountryId || null],
    queryFn: () => fetchArchivedCandidates({
      ...(filterBranchId && { branchId: filterBranchId }),
      ...(filterCountryId && { countryId: filterCountryId }),
    }),
  });

  const exportCsv = () => {
    const headers = ['Код', 'Имя', 'Фамилия', 'Телефон', 'Email', 'WhatsApp', 'Страна', 'Филиал', 'Программа', 'Уровень языка', 'Менеджер', 'Этап', 'Оплата'];
    const escape = (v: string | null | undefined) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = candidates.map((c: any) => [
      escape(c.candidateCode),
      escape(c.firstName),
      escape(c.lastName),
      escape(c.phone),
      escape(c.email),
      escape(c.whatsappPhone),
      escape(c.country?.name),
      escape(c.branch?.name),
      escape(c.programType),
      escape(c.languageLevel),
      escape(c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : null),
      escape(c.pipelineStage),
      escape(c.paymentStatus),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">Filter and manage candidates</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={candidates.length === 0}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Экспорт CSV
          </button>
          <button
            type="button"
            onClick={() => setCandidateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Добавить кандидата
          </button>
        </div>
      </div>

      <AddCandidateModal open={candidateModalOpen} onClose={() => setCandidateModalOpen(false)} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-sm font-medium text-gray-700">Фильтр:</span>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
        >
          <option value="">Все страны</option>
          {countries.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
        >
          <option value="">Все филиалы</option>
          {branches.map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
        >
          <option value="">Все этапы</option>
          {PIPELINE_STAGES.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        {(filterBranchId || filterCountryId || filterStage) && (
          <button
            type="button"
            onClick={() => { setFilterBranchId(''); setFilterCountryId(''); setFilterStage(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Program</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Language</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              )}
              {!isLoading && candidates.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No candidates</td></tr>
              )}
              {!isLoading && candidates.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{c.candidateCode ?? c.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <LinkWithTab href={`/candidates/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.firstName} {c.lastName}
                    </LinkWithTab>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.country?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.programType ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.languageLevel ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {c.pipelineStage ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {archivedCandidates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <h2 className="px-4 py-3 text-lg font-semibold text-gray-700 border-b border-gray-200 bg-gray-50">
            Заархивированные кандидаты
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Archived</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {archivedLoading && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
                )}
                {!archivedLoading && archivedCandidates.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{c.candidateCode ?? c.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <LinkWithTab href={`/candidates/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.firstName} {c.lastName}
                      </LinkWithTab>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.country?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {c.archiveReason ? `Причина: ${c.archiveReason}` : '—'}
                    </td>
                    <td className="px-4 py-3 space-x-3">
                      <button
                        type="button"
                        onClick={() => unarchiveMutation.mutate(c.id)}
                        disabled={unarchiveMutation.isPending}
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      >
                        Восстановить
                      </button>
                      <button
                        type="button"
                        onClick={() => setCandidateIdToDelete(c.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={candidateIdToDelete !== null}
        title="Удалить кандидата?"
        description="Кандидат и все связанные данные будут удалены без возможности восстановления."
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onCancel={() => setCandidateIdToDelete(null)}
        onConfirm={() => {
          if (!candidateIdToDelete) return;
          deleteMutation.mutate(candidateIdToDelete);
          setCandidateIdToDelete(null);
        }}
      />
    </div>
  );
}
