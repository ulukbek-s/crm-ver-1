'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchOptions() {
  const [employers, countries] = await Promise.all([
    fetch('/api/recruitment/employers', { headers: getAuthHeaders() }).then((r) => r.ok ? r.json() : []),
    fetch('/api/recruitment/countries', { headers: getAuthHeaders() }).then((r) => r.ok ? r.json() : []),
  ]);
  return { employers, countries };
}

async function createVacancy(body: Record<string, unknown>) {
  const res = await fetch('/api/recruitment/vacancies', {
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

export function AddVacancyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    employerId: '',
    countryId: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'EUR',
    requirements: '',
    openPositions: 1,
    status: 'open',
    deadline: '',
  });

  const CURRENCIES = ['EUR', 'USD', 'PLN', 'UAH', 'RUB'];

  const { data: options } = useQuery({
    queryKey: ['recruitment', 'form-options'],
    queryFn: fetchOptions,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createVacancy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'vacancies'] });
      onClose();
      setForm({
        title: '',
        employerId: '',
        countryId: '',
        salaryMin: '',
        salaryMax: '',
        salaryCurrency: 'EUR',
        requirements: '',
        openPositions: 1,
        status: 'open',
        deadline: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const employerId = (form.employerId || '').trim();
    if (!employerId) {
      mutation.reset();
      return;
    }
    const salaryMin = form.salaryMin ? parseFloat(form.salaryMin) : undefined;
    const salaryMax = form.salaryMax ? parseFloat(form.salaryMax) : undefined;
    mutation.mutate({
      title,
      employerId,
      countryId: form.countryId || undefined,
      salaryMin,
      salaryMax,
      salaryCurrency: form.salaryCurrency,
      requirements: form.requirements.trim() || undefined,
      openPositions: Number(form.openPositions) || 1,
      status: form.status,
      deadline: form.deadline || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Добавить вакансию">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="Senior Care Worker"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Работодатель *</label>
          <select
            value={form.employerId}
            onChange={(e) => setForm((f) => ({ ...f, employerId: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          >
            <option value="">Выберите работодателя</option>
            {(options?.employers ?? []).map((e: { id: string; name: string }) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Страна</label>
          <select
            value={form.countryId}
            onChange={(e) => setForm((f) => ({ ...f, countryId: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          >
            <option value="">—</option>
            {(options?.countries ?? []).map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата от</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.salaryMin}
              onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
              placeholder="2500"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата до</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.salaryMax}
              onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
              placeholder="3000"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
            <select
              value={form.salaryCurrency}
              onChange={(e) => setForm((f) => ({ ...f, salaryCurrency: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              {CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Требования</label>
          <textarea
            value={form.requirements}
            onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
            rows={2}
            placeholder="B1 German, 1+ year experience"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Период (действует до)</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кол-во мест</label>
            <input
              type="number"
              min={1}
              value={form.openPositions}
              onChange={(e) => setForm((f) => ({ ...f, openPositions: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="open">Открыта</option>
              <option value="paused">Приостановлена</option>
              <option value="closed">Закрыта</option>
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
          <button
            type="submit"
            disabled={mutation.isPending || !form.title.trim() || !form.employerId}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Сохранение…' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
