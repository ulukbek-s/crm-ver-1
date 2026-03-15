'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { LinkWithTab } from '@/components/LinkWithTab';
import { LayoutGrid, List, Archive, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';

const PIPELINE_STAGES = [
  { id: 'leads', label: 'Leads' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'document_prep', label: 'Подготовка документов' },
  { id: 'send_to_employer', label: 'Отправка работодателю' },
  { id: 'waiting_employer', label: 'Ждём ответа работодателя' },
  { id: 'visa_prep', label: 'Виза подготовка' },
  { id: 'visa_waiting', label: 'Виза ожидание' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
] as const;

type ViewMode = 'kanban' | 'table';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchCandidates(params?: { branchId?: string; pipelineStage?: string; countryId?: string }) {
  const url = new URL('/api/crm/candidates', typeof window !== 'undefined' ? window.location.origin : '');
  if (params?.branchId) url.searchParams.set('branchId', params.branchId);
  if (params?.pipelineStage) url.searchParams.set('pipelineStage', params.pipelineStage);
  if (params?.countryId) url.searchParams.set('countryId', params.countryId);
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchBranches() {
  const res = await fetch('/api/crm/branches', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCountries() {
  const res = await fetch('/api/crm/countries', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function updateCandidateStage(candidateId: string, pipelineStage: string) {
  const res = await fetch(`/api/crm/candidates/${candidateId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ pipelineStage }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data.message === 'string' ? data.message : data.error ?? 'Failed to update stage';
    throw new Error(msg);
  }
  return data;
}

async function updateCandidateAnketa(candidateId: string, anketaStatus: string, archiveReason?: string) {
  const res = await fetch(`/api/crm/candidates/${candidateId}/anketa`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ anketaStatus, archiveReason }),
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function archiveCandidate(candidateId: string, reason: string) {
  const res = await fetch(`/api/crm/candidates/${candidateId}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function fetchVacancies() {
  const res = await fetch('/api/recruitment/vacancies', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function submitCandidatesToVacancy(vacancyId: string, candidateIds: string[]) {
  const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ candidateIds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? 'Ошибка отправки');
  }
  return res.json();
}

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  candidateCode?: string;
  pipelineStage: string;
  country?: { name: string; code?: string } | null;
  manager?: { firstName: string; lastName: string } | null;
  anketaStatus?: string | null;
  paymentStatus?: string | null;
  documents?: { id: string; type: string }[];
  phone?: string | null;
  whatsappPhone?: string | null;
  telegramUsername?: string | null;
};

const ANKETA_OPTIONS = [
  { value: 'not_filled', label: 'Не заполнена' },
  { value: 'accepted', label: 'Принята' },
  { value: 'rejected', label: 'Отказана' },
];

function isGermany(c: Candidate) {
  const name = c.country?.name?.toLowerCase() ?? '';
  const code = c.country?.code?.toLowerCase() ?? '';
  return code === 'de' || name.includes('germany') || name.includes('германия');
}

export default function CrmPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [archiveModal, setArchiveModal] = useState<{ id: string; reason: string } | null>(null);
  const [sendToEmployerModal, setSendToEmployerModal] = useState<{ candidateIds: string[]; selectedVacancyId?: string } | null>(null);
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterCountryId, setFilterCountryId] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const queryClient = useQueryClient();

  const { data: vacancies = [], isLoading: vacanciesLoading } = useQuery({
    queryKey: ['recruitment', 'vacancies'],
    queryFn: fetchVacancies,
  });

  const sendToEmployerMutation = useMutation({
    mutationFn: ({ vacancyId, candidateIds }: { vacancyId: string; candidateIds: string[] }) =>
      submitCandidatesToVacancy(vacancyId, candidateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] });
      setSendToEmployerModal(null);
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['crm', 'branches'],
    queryFn: fetchBranches,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['crm', 'countries'],
    queryFn: fetchCountries,
  });

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ['crm', 'candidates', filterBranchId || null, filterCountryId || null, filterStage || null],
    queryFn: () =>
      fetchCandidates({
        ...(filterBranchId && { branchId: filterBranchId }),
        ...(filterCountryId && { countryId: filterCountryId }),
        ...(filterStage && { pipelineStage: filterStage }),
      }),
  });

  const mutation = useMutation({
    mutationFn: ({ candidateId, pipelineStage }: { candidateId: string; pipelineStage: string }) =>
      updateCandidateStage(candidateId, pipelineStage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] }),
  });
  const anketaMutation = useMutation({
    mutationFn: ({ candidateId, anketaStatus, archiveReason }: { candidateId: string; anketaStatus: string; archiveReason?: string }) =>
      updateCandidateAnketa(candidateId, anketaStatus, archiveReason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] }),
  });
  const archiveMutation = useMutation({
    mutationFn: ({ candidateId, reason }: { candidateId: string; reason: string }) =>
      archiveCandidate(candidateId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] });
      setArchiveModal(null);
    },
  });

  const byStage = PIPELINE_STAGES.reduce<Record<string, Candidate[]>>((acc, { id }) => {
    acc[id] = candidates.filter((c) => (c.pipelineStage || 'candidates') === id);
    return acc;
  }, {} as Record<string, Candidate[]>);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(stageId);
  }, []);

  const handleDragLeave = useCallback(() => setDropTarget(null), []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      setDropTarget(null);
      const id = e.dataTransfer.getData('text/plain');
      if (!id || draggedId !== id) return;
      const c = candidates.find((x) => x.id === id);
      if (c?.pipelineStage === stageId) return;
      setDraggedId(null);
      mutation.mutate({ candidateId: id, pipelineStage: stageId });
    },
    [candidates, draggedId, mutation],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
          <p className="text-gray-500 mt-1">
            {viewMode === 'kanban' ? 'Drag and drop cards between stages' : 'Table view by stage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <List className="h-4 w-4" />
            Table
          </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Фильтр:</span>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Все страны</option>
          {countries.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Все филиалы</option>
          {branches.map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Все этапы</option>
          {PIPELINE_STAGES.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        {(filterBranchId || filterCountryId || filterStage) && (
          <button
            type="button"
            onClick={() => {
              setFilterBranchId('');
              setFilterCountryId('');
              setFilterStage('');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      {mutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {mutation.error?.message ?? 'Не удалось сменить этап. Попробуйте снова.'}
          <button type="button" onClick={() => mutation.reset()} className="ml-2 underline">Закрыть</button>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[480px]">
          {PIPELINE_STAGES.map(({ id, label }) => (
            <div
              key={id}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, id)}
              className={clsx(
                'flex-shrink-0 w-72 rounded-xl border-2 border-dashed p-3 flex flex-col transition-colors',
                dropTarget === id
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-200/80 dark:bg-gray-800'
              )}
            >
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center justify-between">
                <span>{label}</span>
                <span className="flex items-center gap-1">
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{(byStage[id]?.length ?? 0)}</span>
                  {id === 'send_to_employer' && (byStage[id]?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSendToEmployerModal({ candidateIds: (byStage[id] ?? []).map((c) => c.id) }); }}
                      className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Отправить
                    </button>
                  )}
                </span>
              </h3>
              <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading…</div>
                ) : (byStage[id] ?? []).map((c) => {
                  const hasContract = (c.documents ?? []).some((d) => d.type === 'contract');
                  const hasInitialPayment =
                    c.paymentStatus === 'partial' || c.paymentStatus === 'paid';
                  const anketa = c.anketaStatus ?? 'not_filled';

                  let cardBorder = '';
                  if (c.pipelineStage === 'rejected') {
                    cardBorder = 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/20';
                  } else if (hasContract && hasInitialPayment) {
                    cardBorder = 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-900/20';
                  } else if (c.pipelineStage !== 'leads') {
                    cardBorder = 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20';
                  }
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onDragEnd={handleDragEnd}
                      className={clsx(
                        'rounded-lg border border-gray-200 dark:border-gray-600 p-3 shadow-sm cursor-grab active:cursor-grabbing bg-white dark:bg-gray-700',
                        draggedId === c.id && 'opacity-50',
                        cardBorder
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <LinkWithTab
                            href={`/candidates/${c.id}`}
                            className="font-medium text-gray-900 dark:text-white truncate block hover:text-blue-600"
                          >
                            {c.firstName} {c.lastName}
                            {c.country?.name && (
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                · {c.country.name}
                              </span>
                            )}
                          </LinkWithTab>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {c.paymentStatus ?? '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {(c.telegramUsername || c.whatsappPhone || c.phone) && (
                            <a
                              href={c.telegramUsername
                                ? `https://t.me/${c.telegramUsername.replace(/^@/, '')}`
                                : `https://wa.me/${(c.whatsappPhone || c.phone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                              title={c.telegramUsername ? 'Telegram' : 'WhatsApp'}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setArchiveModal({ id: c.id, reason: '' }); }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 shrink-0"
                            title="Архивировать"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {isGermany(c) && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Анкета:</label>
                          <select
                            value={anketa}
                            onChange={(e) => {
                              e.stopPropagation();
                              const next = e.target.value;
                              let reason: string | undefined;
                              if (next === 'rejected') {
                                reason = window.prompt('Укажите причину отказа по анкете') || undefined;
                              }
                              anketaMutation.mutate({ candidateId: c.id, anketaStatus: next, archiveReason: reason });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 w-full rounded border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-xs py-1"
                          >
                            {ANKETA_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {anketa === 'not_filled' && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Анкета должна быть принята</p>
                          )}
                          {anketa === 'rejected' && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Анкета отказана</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!isLoading && (!byStage[id] || byStage[id].length === 0) && (
                  <div className="text-center py-6 text-gray-400 text-sm">No cards</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sendToEmployerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSendToEmployerModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Отправить работодателю</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Кандидатов: {sendToEmployerModal.candidateIds.length}. Выберите вакансию — они появятся у работодателя и перейдут в этап «Ждём ответа работодателя».
            </p>
            <div>
              <label htmlFor="send-vacancy" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Вакансия</label>
              <select
                id="send-vacancy"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                value={sendToEmployerModal.selectedVacancyId ?? ''}
                onChange={(e) => {
                  const vid = e.target.value;
                  setSendToEmployerModal((m) => m ? { ...m, selectedVacancyId: vid || undefined } : null);
                }}
                disabled={sendToEmployerMutation.isPending || vacanciesLoading}
              >
                <option value="">
                  {vacanciesLoading ? 'Загрузка вакансий…' : '— Выберите вакансию —'}
                </option>
                {!vacanciesLoading && vacancies.map((v: { id: string; title: string; employer?: { name: string } }) => (
                  <option key={v.id} value={v.id}>{v.title} ({v.employer?.name ?? ''})</option>
                ))}
              </select>
              {!vacanciesLoading && vacancies.length === 0 && (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  Нет вакансий. Добавьте вакансию в разделе Вакансии.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const vid = sendToEmployerModal?.selectedVacancyId;
                  if (vid) sendToEmployerMutation.mutate({ vacancyId: vid, candidateIds: sendToEmployerModal.candidateIds });
                }}
                disabled={!sendToEmployerModal?.selectedVacancyId || sendToEmployerMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendToEmployerMutation.isPending ? 'Отправка…' : 'Отправить'}
              </button>
              <button type="button" onClick={() => setSendToEmployerModal(null)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                Отмена
              </button>
            </div>
            {sendToEmployerMutation.isError && (
              <p className="text-sm text-red-600">{sendToEmployerMutation.error?.message}</p>
            )}
          </div>
        </div>
      )}

      {archiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setArchiveModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Архивировать карточку</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Укажите причину архивации:</p>
            <input
              value={archiveModal.reason}
              onChange={(e) => setArchiveModal((m) => m ? { ...m, reason: e.target.value } : null)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white mb-4"
              placeholder="Причина"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setArchiveModal(null)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                Отмена
              </button>
              <button
                type="button"
                onClick={() => archiveModal.reason.trim() && archiveMutation.mutate({ candidateId: archiveModal.id, reason: archiveModal.reason.trim() })}
                disabled={!archiveModal.reason.trim() || archiveMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Архивировать
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              )}
              {!isLoading &&
                candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{c.candidateCode ?? '—'}</td>
                    <td className="px-4 py-3">
                      <LinkWithTab href={`/candidates/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.firstName} {c.lastName}
                        {c.country?.name && (
                          <span className="ml-1 text-xs text-gray-500">
                            · {c.country.name}
                          </span>
                        )}
                      </LinkWithTab>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.pipelineStage || 'candidates'}
                        onChange={(e) => {
                          const stage = e.target.value;
                          if (stage !== (c.pipelineStage || 'candidates')) {
                            mutation.mutate({ candidateId: c.id, pipelineStage: stage });
                          }
                        }}
                        className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {PIPELINE_STAGES.map(({ id, label }) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.country?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'table' && mutation.isError && (
        <p className="text-sm text-red-600 mt-2">{mutation.error?.message ?? 'Не удалось сменить этап.'}</p>
      )}
    </div>
  );
}
