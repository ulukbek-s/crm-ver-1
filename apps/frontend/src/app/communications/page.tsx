'use client';

import { useQuery } from '@tanstack/react-query';

function authHeaders() {
  return {
    Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchMessages() {
  const res = await fetch('/api/communications/messages', {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export default function CommunicationsPage() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['communications', 'messages'],
    queryFn: fetchMessages,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Связь</h1>
        <p className="text-gray-500 mt-1">
          История автоматических уведомлений и сообщений кандидатам.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Кандидат</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Канал</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сообщение</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && messages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Сообщений пока нет
                </td>
              </tr>
            )}
            {!isLoading &&
              messages.map(
                (m: {
                  id: string;
                  createdAt?: string;
                  channel?: string;
                  content?: string;
                }) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">—</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{m.channel ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{m.content ?? '—'}</td>
                  </tr>
                ),
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

