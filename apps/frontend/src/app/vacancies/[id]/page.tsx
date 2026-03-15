'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LinkWithTab } from '@/components/LinkWithTab';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STAGE_LABELS: Record<string, string> = {
  submitted: 'В ожидании',
  interview: 'Интервью',
  offer: 'Принят',
  rejected: 'Отказ',
  hired: 'Нанят',
};

async function fetchVacancy(id: string) {
  const res = await fetch(`/api/recruitment/vacancies/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function updateVacancy(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/recruitment/vacancies/${id}`, {
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

async function updateVacancyCandidate(
  vcId: string,
  body: { stage?: string; contractDocumentId?: string | null; contractSentAt?: string | null },
) {
  const res = await fetch(`/api/recruitment/vacancy-candidates/${vcId}`, {
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

async function uploadContract(candidateId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'employer_contract');
  const res = await fetch(`/api/documents/upload/candidate/${candidateId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

function salaryText(v: any) {
  const cur = v.salaryCurrency ?? 'EUR';
  if (v.salaryMin != null && v.salaryMax != null) return `${v.salaryMin}–${v.salaryMax} ${cur}`;
  if (v.salaryMin != null) return `от ${v.salaryMin} ${cur}`;
  if (v.salaryMax != null) return `до ${v.salaryMax} ${cur}`;
  if (v.salary) return String(v.salary);
  return null;
}

const EMPLOYER_STAGES = [
  { value: 'submitted', label: 'В ожидании' },
  { value: 'interview', label: 'Интервью' },
  { value: 'offer', label: 'Принят' },
  { value: 'rejected', label: 'Отказ' },
  { value: 'hired', label: 'Нанят' },
];

export default function VacancyDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<'archive' | 'unarchive' | null>(null);
  const [filterStage, setFilterStage] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetVcRef = useRef<string | null>(null);
  const [uploadingForVcId, setUploadingForVcId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    requirements: '',
    openPositions: 1,
    status: 'open',
    deadline: '',
  });

  const { data: vacancy, isLoading } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => fetchVacancy(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => updateVacancy(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      setEditOpen(false);
    },
  });

  const updateVcMutation = useMutation({
    mutationFn: ({ vcId, body }: { vcId: string; body: { stage?: string; contractDocumentId?: string | null; contractSentAt?: string | null } }) =>
      updateVacancyCandidate(vcId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
    },
  });

  const markContractSent = useCallback(
    (vcId: string) => {
      updateVcMutation.mutate({ vcId, body: { contractSentAt: new Date().toISOString() } });
    },
    [updateVcMutation],
  );

  const handleContractUpload = useCallback(
    async (vc: { id: string; candidate?: { id: string } | null }, file: File | null) => {
      if (!file || !vc.candidate?.id) return;
      setUploadingForVcId(vc.id);
      try {
        const doc = await uploadContract(vc.candidate.id, file);
        await updateVacancyCandidate(vc.id, { contractDocumentId: doc.id });
        queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
      } finally {
        setUploadingForVcId(null);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
      }
    },
    [id, queryClient],
  );

  const openEdit = useCallback(() => {
    if (!vacancy) return;
    setEditForm({
      title: vacancy.title,
      requirements: vacancy.requirements ?? '',
      openPositions: vacancy.openPositions ?? 1,
      status: vacancy.status ?? 'open',
      deadline: vacancy.deadline ? new Date(vacancy.deadline).toISOString().slice(0, 10) : '',
    });
    setEditOpen(true);
  }, [vacancy]);

  const archiveVacancy = useCallback(() => setConfirmArchive('archive'), []);
  const unarchiveVacancy = useCallback(() => setConfirmArchive('unarchive'), []);
  const handleConfirmArchive = useCallback(() => {
    if (confirmArchive === 'archive') updateMutation.mutate({ status: 'archived' });
    else if (confirmArchive === 'unarchive') updateMutation.mutate({ status: 'open' });
    setConfirmArchive(null);
  }, [confirmArchive, updateMutation]);

  if (!id) return <div className="p-6 text-gray-500">No vacancy ID</div>;
  if (isLoading || !vacancy) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  const vcs = vacancy.vacancyCandidates ?? [];
  const byStage = vcs.reduce((acc: Record<string, typeof vcs>, vc: any) => {
    const s = vc.stage ?? 'submitted';
    if (!acc[s]) acc[s] = [];
    acc[s].push(vc);
    return acc;
  }, {});
  const stageCounts = Object.entries(byStage).map(([stage, list]) => ({
    stage,
    label: STAGE_LABELS[stage] ?? stage,
    count: list.length,
  }));
  const filteredCandidates = filterStage
    ? (byStage[filterStage] ?? [])
    : vcs;

  const isArchived = vacancy.status === 'archived';
  const hiredCount = vcs.filter((vc: any) => vc.stage === 'hired').length;
  const openPos = vacancy.openPositions ?? 1;
  const placesLeft = Math.max(0, openPos - hiredCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{vacancy.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              isArchived ? 'bg-gray-200 text-gray-600' :
              vacancy.status === 'open' ? 'bg-green-100 text-green-800' :
              vacancy.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {isArchived ? 'Архив' : vacancy.status === 'open' ? 'Открыта' : vacancy.status === 'paused' ? 'Приостановлена' : 'Закрыта'}
            </span>
          </div>
          <p className="text-gray-600 mt-1">{vacancy.employer?.name ?? '—'}</p>
          <p className="text-sm text-gray-500">{vacancy.country?.name ?? '—'}</p>
          {salaryText(vacancy) && <p className="text-sm text-gray-600 mt-0.5">{salaryText(vacancy)}</p>}
        </div>
        <div className="flex gap-2">
          {!isArchived && (
            <>
              <button
                type="button"
                onClick={openEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={archiveVacancy}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
              >
                Заархивировать
              </button>
            </>
          )}
          {isArchived && (
            <button
              type="button"
              onClick={unarchiveVacancy}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Разархивировать
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Мест</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{openPos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Занято</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{hiredCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Осталось</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{placesLeft}</p>
        </div>
        {stageCounts.map(({ stage, label, count }) => (
          <div key={stage} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Описание и требования</h2>
        <dl className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Работодатель</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{vacancy.employer?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Страна</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{vacancy.country?.name ?? '—'}</dd>
          </div>
          {salaryText(vacancy) && (
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Зарплата</dt>
              <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{salaryText(vacancy)}</dd>
            </div>
          )}
          {vacancy.deadline && (
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Период (действует до)</dt>
              <dd className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{new Date(vacancy.deadline).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Описание</dt>
          {vacancy.requirements ? (
            <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{vacancy.requirements}</dd>
          ) : (
            <dd className="text-sm text-gray-500 dark:text-gray-400">Не указано</dd>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Кандидаты по вакансии</h2>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          >
            <option value="">Все этапы</option>
            {stageCounts.map(({ stage, label }) => (
              <option key={stage} value={stage}>{label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Кандидат</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Этап</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Подача</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Контракт</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const vcId = uploadTargetVcRef.current;
                  const file = e.target.files?.[0];
                  const vc = filteredCandidates.find((c: any) => c.id === vcId);
                  if (vc && file) handleContractUpload(vc, file);
                  uploadTargetVcRef.current = null;
                }}
              />
              {filteredCandidates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Нет кандидатов</td></tr>
              )}
              {filteredCandidates.map((vc: any) => {
                const contractSent = !!(vc.contractSentAt || vc.contractDocumentId);
                const contractLabel = vc.contractDocumentId
                  ? 'Загружен'
                  : vc.contractSentAt
                    ? 'Отправлен'
                    : 'Не отправлен';
                return (
                  <tr key={vc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {vc.candidate ? (
                        <LinkWithTab
                          href={`/candidates/${vc.candidate.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vc.candidate.firstName} {vc.candidate.lastName}
                        </LinkWithTab>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={vc.stage ?? 'submitted'}
                        onChange={(e) => {
                          const stage = e.target.value;
                          if (stage !== (vc.stage ?? 'submitted')) {
                            updateVcMutation.mutate({ vcId: vc.id, body: { stage } });
                          }
                        }}
                        className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {EMPLOYER_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {vc.submittedAt ? new Date(vc.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 mr-2">{contractLabel}</span>
                      {(vc.contractDocumentId || vc.contractDocument?.id) && (
                        <a
                          href={`/api/documents/${(vc.contractDocument?.id || vc.contractDocumentId)}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mr-2"
                        >
                          Скачать
                        </a>
                      )}
                      {!vc.contractSentAt && (
                        <button
                          type="button"
                          onClick={() => markContractSent(vc.id)}
                          className="text-xs text-blue-600 hover:underline mr-2"
                        >
                          Отметить отправленным
                        </button>
                      )}
                      {vc.candidate?.id && (
                        <button
                          type="button"
                          onClick={() => { uploadTargetVcRef.current = vc.id; uploadInputRef.current?.click(); }}
                          disabled={!!uploadingForVcId}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {uploadingForVcId === vc.id ? 'Загрузка…' : 'Загрузить'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Изменить вакансию">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({
              title: editForm.title.trim(),
              requirements: editForm.requirements.trim() || undefined,
              openPositions: editForm.openPositions,
              status: editForm.status,
              deadline: editForm.deadline || null,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Требования / Описание</label>
            <textarea
              value={editForm.requirements}
              onChange={(e) => setEditForm((f) => ({ ...f, requirements: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Количество мест</label>
            <input
              type="number"
              min={1}
              value={editForm.openPositions}
              onChange={(e) => setEditForm((f) => ({ ...f, openPositions: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Период (действует до)</label>
            <input
              type="date"
              value={editForm.deadline}
              onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="open">Открыта</option>
              <option value="paused">Приостановлена</option>
              <option value="closed">Закрыта</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Сохранить
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmArchive === 'archive'}
        onClose={() => setConfirmArchive(null)}
        title="Заархивировать вакансию"
        message="Вакансия будет перемещена в архив и скрыта из списка активных. Вы сможете разархивировать её позже."
        confirmLabel="Заархивировать"
        cancelLabel="Отмена"
        onConfirm={handleConfirmArchive}
        variant="danger"
      />
      <ConfirmModal
        open={confirmArchive === 'unarchive'}
        onClose={() => setConfirmArchive(null)}
        title="Разархивировать вакансию"
        message="Вакансия снова появится в списке активных вакансий."
        confirmLabel="Разархивировать"
        cancelLabel="Отмена"
        onConfirm={handleConfirmArchive}
        variant="success"
      />
    </div>
  );
}
