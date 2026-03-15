'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchSources() {
  const res = await fetch('/api/crm/lead-sources', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchStatuses() {
  const res = await fetch('/api/crm/lead-statuses', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchCountries() {
  const res = await fetch('/api/crm/countries', { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}
async function fetchBranches(countryId?: string) {
  const url = countryId ? `/api/crm/branches?countryId=${countryId}` : '/api/crm/branches';
  const res = await fetch(url, { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}

async function createLead(body: Record<string, unknown>) {
  const res = await fetch('/api/crm/leads', {
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

export function AddLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    sourceId: '',
    statusId: '',
    countryId: '',
    branchId: '',
    notes: '',
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['crm', 'lead-sources'],
    queryFn: fetchSources,
    enabled: open,
  });
  const { data: statuses = [] } = useQuery({
    queryKey: ['crm', 'lead-statuses'],
    queryFn: fetchStatuses,
    enabled: open,
  });
  const { data: countries = [] } = useQuery({
    queryKey: ['crm', 'countries'],
    queryFn: fetchCountries,
    enabled: open,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['crm', 'lead-branches', form.countryId || 'all'],
    queryFn: () => fetchBranches(form.countryId || undefined),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'candidates'] });
      onClose();
      setForm({ firstName: '', lastName: '', phone: '', email: '', sourceId: '', statusId: '', countryId: '', branchId: '', notes: '' });
    },
  });

  useEffect(() => {
    if (open && sources?.length && !form.sourceId) {
      setForm((f) => ({ ...f, sourceId: sources[0].id, statusId: statuses?.[0]?.id ?? '' }));
    }
  }, [open, sources, statuses, form.sourceId]);

  useEffect(() => {
    if (form.countryId) setForm((f) => ({ ...f, branchId: '' }));
  }, [form.countryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      sourceId: form.sourceId || undefined,
      statusId: form.statusId || undefined,
      branchId: form.branchId || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Добавить лида">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Источник</label>
            <select
              value={form.sourceId}
              onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              {sources.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={form.statusId}
              onChange={(e) => setForm((f) => ({ ...f, statusId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              {statuses.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
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
          {form.countryId && (
            <p className="text-xs text-gray-500 mt-1">Только филиалы выбранной страны</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
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
