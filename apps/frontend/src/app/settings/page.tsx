'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileCheck, Globe, Plane, Zap, Plug, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SettingsPage() {
  const { data: countries = [] } = useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: () =>
      fetch('/api/admin/countries', { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : [])),
  });

  const firstCode = countries.length ? countries[0].code : '';
  const [visaChecklistOpen, setVisaChecklistOpen] = useState(false);
  const [checklistCountry, setChecklistCountry] = useState(firstCode);
  const [checklistItems, setChecklistItems] = useState<{ code: string; name: string }[]>([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistMessage, setChecklistMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (countries.length && !countries.some((c: { code: string }) => c.code === checklistCountry)) {
      setChecklistCountry(countries[0].code);
    }
  }, [countries, checklistCountry]);

  const loadChecklist = () => {
    fetch(`/api/visa/checklist-template?country=${checklistCountry}`, { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setChecklistItems)
      .catch(() => setChecklistItems([]));
  };

  useEffect(() => {
    if (visaChecklistOpen && checklistCountry) loadChecklist();
  }, [visaChecklistOpen, checklistCountry]);

  const addChecklistItem = () => {
    const code = `doc_${Date.now()}`;
    setChecklistItems((prev) => [...prev, { code, name: 'Новый документ' }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index: number, field: 'code' | 'name', value: string) => {
    setChecklistItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const saveChecklist = () => {
    setChecklistSaving(true);
    setChecklistMessage(null);
    fetch('/api/visa/checklist-template', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ countryCode: checklistCountry, items: checklistItems }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data) => {
        setChecklistItems(data);
        setChecklistMessage({ type: 'success', text: 'Список документов сохранён.' });
      })
      .catch(() => setChecklistMessage({ type: 'error', text: 'Не удалось сохранить.' }))
      .finally(() => setChecklistSaving(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Countries, programs, visa, automation, integrations
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Посольства</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Список посольств для записи на приём
          </p>
          <Link
            href="/profile?tab=embassies"
            className="mt-3 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Настроить посольства →
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Чек-лист визы</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Требуемые документы для визового чек-листа (по странам)
          </p>
          <button
            type="button"
            onClick={() => setVisaChecklistOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {visaChecklistOpen ? 'Скрыть' : 'Настроить требуемые документы'}
            {visaChecklistOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {visaChecklistOpen && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Страна:</label>
                <select
                  value={checklistCountry}
                  onChange={(e) => setChecklistCountry(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  disabled={!countries.length}
                >
                  {!countries.length && <option value="">Сначала добавьте страны</option>}
                  {countries.map((c: { id: string; name: string; code: string }) => (
                    <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {checklistItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 flex-wrap">
                    <input
                      value={item.code}
                      onChange={(e) => updateChecklistItem(i, 'code', e.target.value)}
                      placeholder="Код"
                      className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                    />
                    <input
                      value={item.name}
                      onChange={(e) => updateChecklistItem(i, 'name', e.target.value)}
                      placeholder="Название"
                      className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(i)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4" /> Добавить
                </button>
                <button
                  type="button"
                  onClick={saveChecklist}
                  disabled={checklistSaving}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {checklistSaving ? '...' : 'Сохранить'}
                </button>
              </div>
              {checklistMessage && (
                <p className={checklistMessage.type === 'error' ? 'text-red-600 dark:text-red-400 text-sm' : 'text-green-600 dark:text-green-400 text-sm'}>
                  {checklistMessage.text}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Countries</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage countries and directors</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Visa types</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure visa types per country</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Automation rules</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">IF B1 certificate → move to recruitment</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 shadow-md">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Integrations</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Email, WhatsApp, Telegram, Instagram</p>
        </div>
      </div>
    </div>
  );
}
