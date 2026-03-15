'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { clsx } from 'clsx';
import { FileText, Upload, Download, CreditCard, History, Trash2, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchCandidate(id: string) {
  const res = await fetch(`/api/crm/candidates/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchPayments(candidateId: string) {
  const res = await fetch(`/api/finance/payments?candidateId=${candidateId}`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function createPayment(
  candidateId: string,
  body: { amount: number; currency?: string; status?: string; maxAmount?: number },
) {
  const res = await fetch('/api/finance/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ candidateId, ...body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Failed to create payment');
  }
  return res.json();
}

async function updatePaymentStatus(id: string, status: string) {
  const res = await fetch(`/api/finance/payments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Failed to update status');
  }
  return res.json();
}

async function uploadReceipt(candidateId: string, paymentId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'finance');
  const uploadRes = await fetch(`/api/documents/upload/candidate/${candidateId}`, {
    method: 'POST',
    headers: getAuthHeaders() as Record<string, string>,
    body: form,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to upload receipt');
  }
  const doc = await uploadRes.json();
  const attachRes = await fetch(`/api/finance/payments/${paymentId}/receipt`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ documentId: doc.id }),
  });
  if (!attachRes.ok) {
    const err = await attachRes.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to attach receipt');
  }
  return attachRes.json();
}

async function removeReceipt(paymentId: string) {
  const res = await fetch(`/api/finance/payments/${paymentId}/receipt`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to remove receipt');
  }
  return res.json();
}

async function updatePayment(
  id: string,
  data: { amount?: number; currency?: string; status?: string },
) {
  const res = await fetch(`/api/finance/payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to update payment');
  }
  return res.json();
}

async function deletePayment(id: string) {
  const res = await fetch(`/api/finance/payments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to delete payment');
  }
  return res.json();
}

async function fetchDocumentTypes(countryId: string | null) {
  if (!countryId) return [];
  const res = await fetch(`/api/admin/document-types?countryId=${countryId}`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const list = await res.json();
  return list as { id: string; code: string; name: string; order: number }[];
}

async function fetchPrograms() {
  const res = await fetch('/api/admin/programs', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchEducationCourses() {
  const res = await fetch('/api/education/courses', { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function fetchEducationGroups(courseId: string | null) {
  if (!courseId) return [];
  const res = await fetch(`/api/education/groups?courseId=${courseId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchEducationProgress(candidateId: string) {
  const res = await fetch(
    `/api/education/progress/by-candidate?candidateId=${candidateId}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) return null;
  return res.json();
}

async function enrollToEducation(body: {
  candidateId: string;
  courseId: string;
  groupId: string;
}) {
  const res = await fetch('/api/education/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Failed to enroll');
  }
  return res.json();
}

type TabId = 'overview' | 'documents' | 'payments' | 'history';

const TABS: { id: TabId; label: string; icon?: React.ReactNode }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'documents', label: 'Документы', icon: <FileText className="h-4 w-4" /> },
  { id: 'payments', label: 'Платежи', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'history', label: 'История', icon: <History className="h-4 w-4" /> },
];

const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [uploadType, setUploadType] = useState('passport');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => fetchCandidate(id),
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => fetchPayments(id),
    enabled: !!id && activeTab === 'payments',
  });

  const countryId = candidate?.countryId ?? null;
  const { data: documentTypesList = [] } = useQuery({
    queryKey: ['admin', 'document-types', countryId],
    queryFn: () => fetchDocumentTypes(countryId),
    enabled: !!id,
  });
  const uploadTypeOptions = documentTypesList.length > 0
    ? documentTypesList
    : [
        { code: 'passport', name: 'Паспорт' },
        { code: 'contract', name: 'Договор' },
        { code: 'cv', name: 'Резюме' },
        { code: 'profile', name: 'Профиль' },
        { code: 'visa', name: 'Визовые' },
      ];

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: fetchPrograms,
    enabled: !!id,
  });

  const { data: educationCourses = [] } = useQuery({
    queryKey: ['education', 'courses'],
    queryFn: fetchEducationCourses,
    enabled: !!id && activeTab === 'overview',
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const { data: educationGroups = [] } = useQuery({
    queryKey: ['education', 'groups', selectedCourseId || null],
    queryFn: () => fetchEducationGroups(selectedCourseId || null),
    enabled: !!id && activeTab === 'overview' && !!selectedCourseId,
  });

  const { data: educationProgress } = useQuery({
    queryKey: ['education', 'progress', id],
    queryFn: () => fetchEducationProgress(id),
    enabled: !!id && activeTab === 'overview',
  });

  const enrollMutation = useMutation({
    mutationFn: (data: { courseId: string; groupId: string }) =>
      enrollToEducation({ candidateId: id, courseId: data.courseId, groupId: data.groupId }),
  });

  useEffect(() => {
    if (uploadTypeOptions.length > 0 && !uploadTypeOptions.some((o) => o.code === uploadType)) {
      setUploadType(uploadTypeOptions[0].code);
    }
  }, [uploadTypeOptions, uploadType]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      const res = await fetch(`/api/documents/upload/candidate/${id}`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
  });

  const anketaMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/crm/candidates/${id}/anketa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ anketaData: data }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_resp, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      // Автоматически сформировать файл анкеты (Word-совместимый)
      const anketa = variables as Record<string, unknown>;
      const lines: string[] = [];
      lines.push('Анкета кандидата (Германия)');
      lines.push('');
      lines.push(`Имя: ${candidate.firstName} ${candidate.lastName}`);
      lines.push(`Код кандидата: ${candidate.candidateCode ?? id}`);
      lines.push('');
      for (const [key, value] of Object.entries(anketa)) {
        lines.push(`${key}: ${String(value ?? '')}`);
      }
      const content = lines.join('\r\n');
      const blob = new Blob([content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anketa_${candidate.candidateCode ?? id}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; currency?: string; status?: string; maxAmount?: number }) =>
      createPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ paymentId, status }: { paymentId: string; status: string }) =>
      updatePaymentStatus(paymentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({ paymentId, file }: { paymentId: string; file: File }) =>
      uploadReceipt(id, paymentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const removeReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => removeReceipt(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: { amount?: number; currency?: string; status?: string };
    }) => updatePayment(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });

  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentCurrency, setNewPaymentCurrency] = useState('EUR');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('pending');

  const { data: documentsFromApi = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const res = await fetch(`/api/documents/candidates/${id}`, { headers: getAuthHeaders() });
      return res.ok ? res.json() : [];
    },
    enabled: !!id && activeTab === 'documents',
  });

  if (isLoading || !candidate) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">{isLoading ? 'Загрузка…' : 'Кандидат не найден.'}</p>
      </div>
    );
  }

  const documents = activeTab === 'documents' && Array.isArray(documentsFromApi)
    ? documentsFromApi
    : (candidate.documents ?? []);
  const statusHistory = candidate.statusHistory ?? [];
  const isGermany = (candidate.country?.name?.toLowerCase().includes('germany') || candidate.country?.code === 'DE');
  const anketaData = (candidate.anketaData as Record<string, unknown>) ?? {};

  const selectedProgram = programs.find(
    (p: { name: string }) => p.name === candidate.programType,
  ) as { candidatePrice?: number; price?: number; requiresLanguage?: boolean } | undefined;
  const totalForCandidate = selectedProgram?.candidatePrice ?? selectedProgram?.price ?? null;
  const paidSoFar = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
  const remaining = totalForCandidate != null ? Math.max(Number(totalForCandidate) - paidSoFar, 0) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-gray-500 mt-1">
            {candidate.candidateCode ?? id?.slice(0, 8)} · {candidate.pipelineStage}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Обзор</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Страна</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{candidate.country?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Уровень языка</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{candidate.languageLevel ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Программа</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{candidate.programType ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Оплата</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{candidate.paymentStatus ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Менеджер</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {candidate.manager
                    ? `${candidate.manager.firstName} ${candidate.manager.lastName}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Телефон</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{candidate.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Связаться</dt>
                <dd className="flex gap-2 mt-1">
                  {(candidate.whatsappPhone || candidate.phone) && (
                    <a
                      href={`https://wa.me/${(candidate.whatsappPhone || candidate.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      WhatsApp
                    </a>
                  )}
                  {candidate.telegramUsername && (
                    <a
                      href={`https://t.me/${candidate.telegramUsername.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500 text-white text-sm hover:bg-sky-600"
                    >
                      Telegram
                    </a>
                  )}
                  {!candidate.whatsappPhone && !candidate.phone && !candidate.telegramUsername && (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="flex items-center gap-3 mt-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {candidate.email ?? '—'}
                  </span>
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}?subject=${encodeURIComponent('По вашему участию в программе')}&body=${encodeURIComponent(`Здравствуйте, ${candidate.firstName} ${candidate.lastName}!\n\nПишем по поводу вашей программы ${candidate.programType ?? ''}.\n\n`)}`
                      }
                      className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                    >
                      Написать
                    </a>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Документы по стране</h2>
            <div className="space-y-2">
              {documentTypesList.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Нет настроенных типов документов для этой страны.
                </p>
              )}
              {documentTypesList.length > 0 && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Какие документы ещё не загружены для кандидата.
                  </p>
                  <ul className="space-y-1 text-sm">
                    {documentTypesList.map((dt) => {
                      const hasDoc = documents.some(
                        (cd: { type: string }) => cd.type === dt.code,
                      );
                      return (
                        <li
                          key={dt.id ?? dt.code}
                          className={clsx(
                            'flex items-center justify-between rounded-lg px-3 py-1.5',
                            hasDoc
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          <span>{dt.name}</span>
                          <span className="text-xs font-medium">
                            {hasDoc ? 'Загружен' : 'Не загружен'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>

          {(!selectedProgram || selectedProgram.requiresLanguage !== false) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Обучение (Education)
              </h2>
              <div className="space-y-4">
                {educationProgress?.hasStudent && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {educationProgress.courseName
                          ? `${educationProgress.courseName}${
                              educationProgress.courseLevel
                                ? ` (${educationProgress.courseLevel})`
                                : ''
                            }`
                          : 'Курс'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Прогресс:{' '}
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {educationProgress.progressPercent}%
                        </span>
                      </p>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, educationProgress.progressPercent ?? 0),
                          )}%`,
                        }}
                      />
                    </div>
                    {educationProgress.status && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Статус обучения: {educationProgress.status}
                      </p>
                    )}
                  </div>
                )}

                {educationCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Курсы ещё не настроены.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Курс
                        </label>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        >
                          <option value="">Выберите курс…</option>
                          {educationCourses.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.level ? `(${c.level})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Группа
                        </label>
                        <select
                          value={
                            (educationGroups as any[]).some(
                              (g) => g.id === (enrollMutation.variables as any)?.groupId,
                            )
                              ? (enrollMutation.variables as any)?.groupId ?? ''
                              : ''
                          }
                          onChange={(e) => {
                            enrollMutation.reset();
                            enrollMutation.mutate({
                              courseId: selectedCourseId,
                              groupId: e.target.value,
                            });
                          }}
                          disabled={!selectedCourseId || (educationGroups as any[]).length === 0}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        >
                          <option value="">
                            {(educationGroups as any[]).length === 0
                              ? 'Нет групп для курса'
                              : 'Выберите группу…'}
                          </option>
                          {(educationGroups as any[]).map((g: any) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {enrollMutation.isSuccess && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Кандидат записан на курс.
                      </p>
                    )}
                    {enrollMutation.isError && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {(enrollMutation.error as Error)?.message || 'Ошибка записи на курс.'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      После успешного прохождения курса вы сможете использовать данные Education для
                      обновления статуса кандидата и визового процесса.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isGermany && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Анкета (Германия)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Заполните анкету для кандидатов, выбравших Германию. Данные сохраняются автоматически.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const data: Record<string, unknown> = {};
                  form.querySelectorAll('input, select, textarea').forEach((el) => {
                    const name = (el as HTMLInputElement).name;
                    if (!name) return;
                    const input = el as HTMLInputElement;
                    const value = input.type === 'checkbox' ? (input.checked ? 'yes' : 'no') : input.value;
                    data[name] = value;
                  });
                  anketaMutation.mutate(data);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'TEXTAREA') return;
                  e.preventDefault();
                  const form = e.currentTarget;
                  const focusable = Array.from(
                    form.querySelectorAll<HTMLElement>('input, select, textarea, button'),
                  ).filter(
                    (el) =>
                      !el.hasAttribute('disabled') &&
                      el.tabIndex !== -1 &&
                      el.getAttribute('type') !== 'hidden',
                  );
                  const index = focusable.indexOf(target);
                  if (index >= 0 && index < focusable.length - 1) {
                    focusable[index + 1].focus();
                  }
                }}
                className="space-y-6"
              >
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">1. Личные данные</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">ФИО (как в паспорте)</label>
                      <input name="fullName" defaultValue={String(anketaData.fullName ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Дата рождения</label>
                      <input
                        name="birthDate"
                        type="text"
                        placeholder="дд.мм.гггг"
                        defaultValue={String(anketaData.birthDate ?? '')}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Гражданство</label>
                      <input name="citizenship" defaultValue={String(anketaData.citizenship ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Город и страна проживания</label>
                      <input name="cityCountry" defaultValue={String(anketaData.cityCountry ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">2. Документы</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="hasPassport" value="yes" defaultChecked={anketaData.hasPassport === 'yes'} className="rounded" />
                      Есть действующий загранпаспорт
                    </label>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Срок действия загранпаспорта</label>
                      <input
                        name="passportExpiry"
                        type="text"
                        placeholder="дд.мм.гггг"
                        defaultValue={String(anketaData.passportExpiry ?? '')}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Наличие визы (тип и срок)</label>
                      <input name="visaInfo" defaultValue={String(anketaData.visaInfo ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" placeholder="Шенген, национальная и т.д." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Другие документы (сертификаты, дипломы)</label>
                      <input name="otherDocs" defaultValue={String(anketaData.otherDocs ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">3. Опыт работы</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Профессия / специальность</label>
                      <input name="profession" defaultValue={String(anketaData.profession ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Стаж (лет)</label>
                      <input name="workExperienceYears" type="number" min={0} defaultValue={String(anketaData.workExperienceYears ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Последнее место работы и обязанности</label>
                      <textarea name="lastWorkplace" rows={2} defaultValue={String(anketaData.lastWorkplace ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">4. Язык</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Уровень немецкого</label>
                      <select name="germanLevel" defaultValue={String(anketaData.germanLevel ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white">
                        <option value="">—</option>
                        <option value="none">Нет</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1 и выше</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Уровень английского</label>
                      <select name="englishLevel" defaultValue={String(anketaData.englishLevel ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white">
                        <option value="">—</option>
                        <option value="none">Нет</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2 и выше</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Сертификаты по языкам</label>
                      <input name="languageCertificates" defaultValue={String(anketaData.languageCertificates ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" placeholder="Goethe, TestDaF и т.д." />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">5. Юридические вопросы</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="noCriminalRecord" value="yes" defaultChecked={anketaData.noCriminalRecord === 'yes'} className="rounded" />
                      Нет судимости
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="consentDataProcessing" value="yes" defaultChecked={anketaData.consentDataProcessing === 'yes'} className="rounded" />
                      Согласие на обработку персональных данных
                    </label>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Комментарий (при необходимости)</label>
                      <input name="legalComment" defaultValue={String(anketaData.legalComment ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">6. Готовность к выезду</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Желаемая дата выезда</label>
                      <input
                        name="desiredDepartureDate"
                        type="text"
                        placeholder="дд.мм.гггг"
                        defaultValue={String(anketaData.desiredDepartureDate ?? '')}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Готовность к переезду</label>
                      <select name="readinessToRelocate" defaultValue={String(anketaData.readinessToRelocate ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white">
                        <option value="">—</option>
                        <option value="immediate">Сразу</option>
                        <option value="1month">В течение месяца</option>
                        <option value="3months">В течение 3 месяцев</option>
                        <option value="flexible">По договорённости</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Примечания по готовности</label>
                      <input name="readinessNotes" defaultValue={String(anketaData.readinessNotes ?? '')} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">7. Подтверждение</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Дата заполнения</label>
                      <input
                        name="formDate"
                        type="text"
                        placeholder="дд.мм.гггг"
                        defaultValue={String(anketaData.formDate ?? '')}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="dataConfirmed" value="yes" defaultChecked={anketaData.dataConfirmed === 'yes'} className="rounded" />
                      Подтверждаю достоверность указанных данных
                    </label>
                  </div>
                </section>
                {anketaMutation.isSuccess && <p className="text-sm text-green-600">Сохранено.</p>}
                {anketaMutation.isError && <p className="text-sm text-red-600">{anketaMutation.error?.message}</p>}
                <button type="submit" disabled={anketaMutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {anketaMutation.isPending ? 'Сохранение…' : 'Сохранить анкету'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Документы</h2>

          <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {uploadTypeOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>{opt.name}</option>
                ))}
              </select>
              {!candidate?.countryId && (
                <p className="text-xs text-gray-500 mt-0.5">Выберите страну у кандидата, чтобы видеть типы документов по стране.</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadMutation.mutate({ file, type: uploadType });
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? 'Загрузка…' : 'Загрузить'}
            </button>
            {uploadMutation.isError && (
              <p className="text-sm text-red-600">{uploadMutation.error?.message}</p>
            )}
          </div>

          <ul className="divide-y divide-gray-200">
            {documents.length === 0 && (
              <li className="py-6 text-center text-gray-500">Нет загруженных документов</li>
            )}
            {documents.map((cd: { id: string; type: string; document?: { id: string; fileName: string }; source?: { label: string } }) => (
              <li key={cd.id} className="py-3 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">{cd.document?.fileName ?? cd.type}</span>
                  {cd.source?.label && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">({cd.source.label})</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{cd.type}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const docId = cd.document?.id;
                      if (!docId) return;
                      const res = await fetch(`/api/documents/${docId}/download`, {
                        headers: getAuthHeaders(),
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = cd.document?.fileName ?? 'document';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Скачать
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cd.document?.id) return;
                      deleteDocMutation.mutate(cd.document.id, {
                        onSuccess: () => {
                          setUploadType(cd.type);
                          setTimeout(() => fileInputRef.current?.click(), 100);
                        },
                      });
                    }}
                    disabled={deleteDocMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:underline"
                    title="Заменить файл (удалить и загрузить другой)"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => cd.document?.id && deleteDocMutation.mutate(cd.document.id)}
                    disabled={deleteDocMutation.isPending}
                    className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Удалить"
                  >
                    <Trash2 className="h-3 w-3" />
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Платежи</h2>
          {totalForCandidate != null && (
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span>
                Всего по программе:{' '}
                <strong>{Number(totalForCandidate).toLocaleString()} {newPaymentCurrency}</strong>
              </span>
              <span>
                Оплачено:{' '}
                <strong>{paidSoFar.toLocaleString()} {newPaymentCurrency}</strong>
              </span>
              <span>
                Осталось:{' '}
                <strong>{remaining != null ? remaining.toLocaleString() : '—'} {newPaymentCurrency}</strong>
              </span>
              {remaining != null && remaining > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setNewPaymentAmount(String(remaining.toFixed(2)));
                    setNewPaymentStatus('completed');
                  }}
                  className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                >
                  Добавить платёж на остаток
                </button>
              )}
            </div>
          )}
          <form
            className="mb-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const amount = Number(newPaymentAmount);
              if (!amount || Number.isNaN(amount)) return;
              createPaymentMutation.mutate({
                amount,
                currency: newPaymentCurrency,
                status: newPaymentStatus,
                ...(totalForCandidate != null && { maxAmount: Number(totalForCandidate) }),
              });
            }}
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Сумма</label>
              <input
                type="number"
                step="0.01"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm w-28"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Валюта</label>
              <input
                value={newPaymentCurrency}
                onChange={(e) => setNewPaymentCurrency(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm w-20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!newPaymentAmount || createPaymentMutation.isPending}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              Добавить платёж
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Валюта</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Оплачено</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Чек</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Нет платежей
                    </td>
                  </tr>
                )}
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.amount != null ? String(p.amount) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.currency ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status ?? 'pending'}
                        onChange={(e) =>
                          updatePaymentStatusMutation.mutate({ paymentId: p.id, status: e.target.value })
                        }
                        className="text-xs rounded border border-gray-300 px-2 py-1"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptPaymentId(p.id);
                            receiptInputRef.current?.click();
                          }}
                          disabled={uploadReceiptMutation.isPending}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Upload className="h-3 w-3" />
                          Загрузить
                        </button>
                        {p.receiptDocument && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/documents/${p.receiptDocument.id}/download`, {
                                headers: getAuthHeaders(),
                              });
                              if (!res.ok) return;
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = p.receiptDocument.fileName ?? 'receipt';
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Download className="h-3 w-3" />
                            Скачать
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setPaymentIdToDelete(p.id)}
                          disabled={deletePaymentMutation.isPending}
                          className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <input
            ref={receiptInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const pid = receiptPaymentId;
              if (file && pid) {
                uploadReceiptMutation.mutate({ paymentId: pid, file });
              }
              e.target.value = '';
            }}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">История этапов</h2>
          <ul className="space-y-3">
            {statusHistory.length === 0 && (
              <li className="text-gray-500">История изменений этапов пуста</li>
            )}
            {statusHistory.map((h: { id: string; fromStage: string | null; toStage: string; changedAt: string }) => (
              <li key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500 w-32">
                  {new Date(h.changedAt).toLocaleString()}
                </span>
                <span className="text-gray-400">{h.fromStage ?? '—'}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium">{h.toStage}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={paymentIdToDelete !== null}
        title="Удалить платёж?"
        description="Запись о платеже будет удалена без возможности восстановления."
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        onCancel={() => setPaymentIdToDelete(null)}
        onConfirm={() => {
          if (!paymentIdToDelete) return;
          deletePaymentMutation.mutate(paymentIdToDelete);
          setPaymentIdToDelete(null);
        }}
      />
    </div>
  );
}
