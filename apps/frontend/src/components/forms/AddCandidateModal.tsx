'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Списки из профиля главного аккаунта (Админ → страны, филиалы, источники, программы)
async function fetchCountries() {
  const res = await fetch('/api/admin/countries', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchBranches(countryId?: string) {
  const url = countryId ? `/api/admin/branches?countryId=${countryId}` : '/api/admin/branches';
  const res = await fetch(url, { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchLeadSources() {
  const res = await fetch('/api/admin/lead-sources', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchPrograms(countryId?: string) {
  const url = countryId ? `/api/admin/programs?countryId=${countryId}` : '/api/admin/programs';
  const res = await fetch(url, { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}

const LANGUAGE_LEVEL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'planned', label: 'Planned (to be learned)' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

async function createCandidate(body: Record<string, unknown>) {
  const res = await fetch('/api/crm/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText);
  }
  return res.json();
}

export function AddCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    candidateCode: '',
    firstName: '',
    lastName: '',
    phone: '',
    whatsappPhone: '',
    telegramUsername: '',
    telegramUsername: '',
    email: '',
    countryId: '',
    branchId: '',
    languageLevel: '',
    programId: '', // выбранная программа → programType отправим как name
    leadSourceId: '',
    paymentStatus: 'none',
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: fetchCountries,
    enabled: open,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: () => fetchBranches(),
    enabled: open,
  });
  const { data: leadSources = [] } = useQuery({
    queryKey: ['admin', 'lead-sources'],
    queryFn: fetchLeadSources,
    enabled: open,
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs', form.countryId || 'all'],
    queryFn: () => fetchPrograms(form.countryId || undefined),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] });
      onClose();
      setForm({
        candidateCode: '',
        firstName: '',
        lastName: '',
        phone: '',
        whatsappPhone: '',
        email: '',
        countryId: '',
        branchId: '',
        languageLevel: '',
        programId: '',
        leadSourceId: '',
        paymentStatus: 'none',
      });
    },
  });

  useEffect(() => {
    if (open && !form.candidateCode) {
      const nextCode = `CAND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      setForm((f) => ({ ...f, candidateCode: nextCode }));
    }
  }, [open, form.candidateCode]);

  useEffect(() => {
    if (form.countryId) setForm((f) => ({ ...f, programId: '' }));
  }, [form.countryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.whatsappPhone.trim() && !form.telegramUsername.trim()) {
      alert('Укажите хотя бы один способ связи: WhatsApp или Telegram.');
      return;
    }
    const selectedProgram = programs.find((p: { id: string }) => p.id === form.programId);
    mutation.mutate({
      candidateCode: form.candidateCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      whatsappPhone: form.whatsappPhone.trim() || undefined,
      telegramUsername: form.telegramUsername.trim() || undefined,
      email: form.email.trim() || undefined,
      countryId: form.countryId || undefined,
      branchId: form.branchId || undefined,
      languageLevel: form.languageLevel || undefined,
      programType: selectedProgram ? (selectedProgram as { name: string }).name : undefined,
      leadSourceId: form.leadSourceId || undefined,
      paymentStatus: form.paymentStatus,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const formEl = e.currentTarget;
    const focusable = Array.from(
      formEl.querySelectorAll<HTMLElement>('input, select, textarea, button'),
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.getAttribute('type') !== 'hidden');
    const idx = focusable.indexOf(target);
    if (idx >= 0 && idx < focusable.length - 1) {
      focusable[idx + 1].focus();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Добавить кандидата">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Код кандидата *</label>
          <input
            value={form.candidateCode}
            onChange={(e) => setForm((f) => ({ ...f, candidateCode: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp (номер) или Telegram (@username)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="tel"
              value={form.whatsappPhone}
              onChange={(e) => setForm((f) => ({ ...f, whatsappPhone: e.target.value }))}
              placeholder="+49..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
            <input
              value={form.telegramUsername}
              onChange={(e) => setForm((f) => ({ ...f, telegramUsername: e.target.value }))}
              placeholder="@username"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Укажите хотя бы один вариант — WhatsApp или Telegram.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Страна</label>
            <select
              value={form.countryId}
              onChange={(e) => setForm((f) => ({ ...f, countryId: e.target.value, branchId: '' }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="">—</option>
              {countries.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Филиал (город)</label>
            <select
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="">—</option>
              {branches.map((b: { id: string; name: string }) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Филиал не привязан к стране</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Уровень языка</label>
            <select
              value={form.languageLevel}
              onChange={(e) => setForm((f) => ({ ...f, languageLevel: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              {LANGUAGE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Программа</label>
            <select
              value={form.programId}
              onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="">—</option>
              {programs.map((p: { id: string; name: string }) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Программы привязаны к выбранной стране</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Источник лида</label>
            <select
              value={form.leadSourceId}
              onChange={(e) => setForm((f) => ({ ...f, leadSourceId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="">—</option>
              {leadSources.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Оплата</label>
            <select
              value={form.paymentStatus}
              onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="none">Нет</option>
              <option value="partial">Частично</option>
              <option value="paid">Полностью оплачено</option>
            </select>
          </div>
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-600">{mutation.error?.message}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? 'Сохранение…' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
