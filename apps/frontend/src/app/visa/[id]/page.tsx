'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  X,
  Upload,
  Download,
  Loader2,
  ArrowLeft,
  FileCheck,
  Calendar,
  Send,
  Scale,
  Trash2,
} from 'lucide-react';

const VISA_STATUSES = [
  { value: 'contract_received', label: 'Contract received' },
  { value: 'document_prep', label: 'Document preparation' },
  { value: 'embassy_appointment', label: 'Embassy appointment' },
  { value: 'submission', label: 'Submission' },
  { value: 'waiting_decision', label: 'Waiting decision' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchProcess(id: string) {
  const res = await fetch(`/api/visa/processes/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchChecklist(id: string) {
  const res = await fetch(`/api/visa/processes/${id}/checklist`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchEmbassies() {
  const res = await fetch('/api/visa/embassies', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function updateProcess(
  id: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`/api/visa/processes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.message || 'Ошибка обновления');
  }
  return res.json();
}

async function uploadDocument(processId: string, type: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  const res = await fetch(`/api/visa/processes/${processId}/documents`, {
    method: 'POST',
    headers: getAuthHeaders() as Record<string, string>,
    body: form,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.message || 'Ошибка загрузки');
  }
  return res.json();
}

export default function VisaCasePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  const [status, setStatus] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [embassyId, setEmbassyId] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [biometricsCompleted, setBiometricsCompleted] = useState(false);
  const [decisionApproved, setDecisionApproved] = useState<boolean | null>(null);
  const [decisionDate, setDecisionDate] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [appealStatus, setAppealStatus] = useState('');
  const [reapplyOption, setReapplyOption] = useState('');
  const [visaIssuedDate, setVisaIssuedDate] = useState('');
  const [visaExpirationDate, setVisaExpirationDate] = useState('');
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: process, isLoading } = useQuery({
    queryKey: ['visa', 'process', id],
    queryFn: () => fetchProcess(id),
    enabled: !!id,
  });
  const { data: checklist = [], refetch: refetchChecklist } = useQuery({
    queryKey: ['visa', 'checklist', id],
    queryFn: () => fetchChecklist(id),
    enabled: !!id,
  });
  const { data: embassies = [] } = useQuery({
    queryKey: ['visa', 'embassies'],
    queryFn: fetchEmbassies,
  });

  const submission = process?.submissions?.[0];
  const decision = process?.decisions?.[0];

  useEffect(() => {
    if (!process) return;
    setStatus(process.status || '');
    setAppointmentDate(
      process.appointmentDate
        ? new Date(process.appointmentDate).toISOString().slice(0, 10)
        : '',
    );
    setEmbassyId(process.embassyId || '');
    const sub = process.submissions?.[0];
    setSubmittedAt(
      sub?.submittedAt
        ? new Date(sub.submittedAt).toISOString().slice(0, 10)
        : '',
    );
    setBiometricsCompleted(sub?.biometricsCompleted ?? false);
    const dec = process.decisions?.[0];
    if (dec) {
      setDecisionApproved(dec.approved);
      setDecisionDate(
        dec.decisionDate
          ? new Date(dec.decisionDate).toISOString().slice(0, 10)
          : '',
      );
      setDecisionNotes(dec.notes || '');
      setRejectionReason(dec.rejectionReason || '');
      setAppealStatus(dec.appealStatus || '');
      setReapplyOption(dec.reapplyOption || '');
    } else {
      setDecisionApproved(null);
      setDecisionDate('');
      setDecisionNotes('');
      setRejectionReason('');
      setAppealStatus('');
      setReapplyOption('');
    }
    setVisaIssuedDate(
      process.visaIssuedDate
        ? new Date(process.visaIssuedDate).toISOString().slice(0, 10)
        : '',
    );
    setVisaExpirationDate(
      process.visaExpirationDate
        ? new Date(process.visaExpirationDate).toISOString().slice(0, 10)
        : '',
    );
  }, [process?.id, process?.status, process?.appointmentDate, process?.embassyId, process?.visaIssuedDate, process?.visaExpirationDate, process?.submissions, process?.decisions]);

  const handleSaveStage = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateProcess(id, { status });
      queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
      queryClient.invalidateQueries({ queryKey: ['visa', 'processes'] });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppointment = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateProcess(id, {
        appointmentDate: appointmentDate || undefined,
        embassyId: embassyId || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubmission = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateProcess(id, {
        submittedAt: submittedAt || undefined,
        biometricsCompleted,
      });
      queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateProcess(id, {
        decisionApproved: decisionApproved ?? undefined,
        decisionDate: decisionDate || undefined,
        decisionNotes: decisionNotes || undefined,
        rejectionReason: rejectionReason || undefined,
        appealStatus: appealStatus || undefined,
        reapplyOption: reapplyOption || undefined,
        visaIssuedDate: visaIssuedDate || undefined,
        visaExpirationDate: visaExpirationDate || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
      queryClient.invalidateQueries({ queryKey: ['visa', 'processes'] });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type: string, file: File | null) => {
    if (!id || !file) return;
    setUploadingType(type);
    try {
      await uploadDocument(id, type, file);
      refetchChecklist();
      queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
    } finally {
      setUploadingType(null);
      const input = fileInputRef.current[type];
      if (input) input.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!documentId) return;
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Не удалось удалить документ');
    refetchChecklist();
    queryClient.invalidateQueries({ queryKey: ['visa', 'process', id] });
  };

  if (!id) return null;
  if (isLoading || !process) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const candidate = process.candidate;
  const candidateName =
    candidate?.firstName && candidate?.lastName
      ? `${candidate.firstName} ${candidate.lastName}`
      : 'Кандидат';

  const selectedEmbassy = embassies.find((e: { id: string }) => e.id === embassyId);
  const savedAppointmentLabel =
    appointmentDate && selectedEmbassy
      ? `${new Date(appointmentDate).toLocaleDateString()} — ${selectedEmbassy.name}${selectedEmbassy.city ? `, ${selectedEmbassy.city}` : ''}`
      : process.appointmentDate && process.embassy
      ? `${new Date(process.appointmentDate).toLocaleDateString()} — ${process.embassy.name}${process.embassy.city ? `, ${process.embassy.city}` : ''}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/visa"
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к визам
        </Link>
        {candidate?.id && (
          <Link
            href={`/candidates/${candidate.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            Карточка кандидата
          </Link>
        )}
      </div>

      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visa Case — {candidateName}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {process.country?.name ?? '—'} • Текущий этап: {process.status}
        </p>
      </div>

      {/* 1. Pipeline stage */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-md">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <FileCheck className="h-5 w-5" />
          Этап визового процесса
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {VISA_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveStage}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
          </button>
        </div>
      </section>

      {/* 2. Document checklist */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-md">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <FileCheck className="h-5 w-5" />
          Документы (checklist)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2 pr-4">Документ</th>
                <th className="pb-2 pr-4">Статус</th>
                <th className="pb-2">Действие</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item: { type: string; name: string; status: string; documentId: string | null }) => (
                <tr key={item.type} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="py-2 pr-4">
                    {item.status === 'uploaded' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Загружен
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <X className="h-4 w-4" /> Нет
                      </span>
                    )}
                  </td>
                  <td className="py-2 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRef.current[item.type] = el;
                      }}
                      className="hidden"
                      onChange={(e) => handleUpload(item.type, e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current[item.type]?.click()}
                      disabled={uploadingType === item.type}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {uploadingType === item.type ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Загрузить
                    </button>
                    {item.documentId && (
                      <>
                        <a
                          href={`/api/documents/${item.documentId}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Download className="h-3 w-3" /> Скачать
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(item.documentId!)}
                          className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3 w-3" /> Удалить
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Appointment */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-md">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <Calendar className="h-5 w-5" />
          Запись в посольство
        </h2>
        {(savedAppointmentLabel || (process.appointmentDate && process.embassy)) && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Сохранено: <span className="font-medium text-gray-900 dark:text-white">{savedAppointmentLabel ?? (process.embassy ? `${new Date(process.appointmentDate).toLocaleDateString()} — ${process.embassy.name}${process.embassy.city ? `, ${process.embassy.city}` : ''}` : '—')}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">Посольство</label>
            <select
              value={embassyId}
              onChange={(e) => setEmbassyId(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {embassies.map((e: { id: string; name: string; city?: string }) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.city ? `, ${e.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Дата приёма</label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSaveAppointment}
            disabled={saving}
            className="self-end rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </section>

      {/* 4. Submission */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-md">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <Send className="h-5 w-5" />
          Подача документов
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Дата подачи</label>
            <input
              type="date"
              value={submittedAt}
              onChange={(e) => setSubmittedAt(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={biometricsCompleted}
              onChange={(e) => setBiometricsCompleted(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm">Биометрия сдана</span>
          </label>
          <button
            onClick={handleSaveSubmission}
            disabled={saving}
            className="rounded-lg bg-gray-800 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </section>

      {/* 5. Decision */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-md">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <Scale className="h-5 w-5" />
          Решение по визе
        </h2>
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="decision"
                checked={decisionApproved === true}
                onChange={() => setDecisionApproved(true)}
                className="rounded-full border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Approved</span>
            </label>
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="decision"
                checked={decisionApproved === false}
                onChange={() => setDecisionApproved(false)}
                className="rounded-full border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Rejected</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Дата решения</label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Заметки</label>
              <input
                type="text"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="Заметки"
              />
            </div>
            {decisionApproved === false && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Причина отказа
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Апелляция</label>
                  <input
                    type="text"
                    value={appealStatus}
                    onChange={(e) => setAppealStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    placeholder="Статус апелляции"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Повторная подача
                  </label>
                  <input
                    type="text"
                    value={reapplyOption}
                    onChange={(e) => setReapplyOption(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    placeholder="Возможность повторной подачи"
                  />
                </div>
              </>
            )}
            {decisionApproved === true && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Дата выдачи визы
                  </label>
                  <input
                    type="date"
                    value={visaIssuedDate}
                    onChange={(e) => setVisaIssuedDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Срок действия визы
                  </label>
                  <input
                    type="date"
                    value={visaExpirationDate}
                    onChange={(e) => setVisaExpirationDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSaveDecision}
            disabled={saving}
            className="rounded-lg bg-gray-800 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Сохранить решение
          </button>
        </div>
      </section>
    </div>
  );
}
