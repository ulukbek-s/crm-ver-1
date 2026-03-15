'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TOKEN_KEY = 'token';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Ошибка входа');
        return;
      }
      if (data.access_token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.access_token);
        }

        let next = searchParams.get('from');
        if (!next) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${data.access_token}` },
            });
            if (meRes.ok) {
              const me = await meRes.json();
              const roleNames: string[] =
                (me.userRoles ?? []).map((ur: { role?: { name?: string } }) => ur.role?.name).filter(Boolean) ?? [];
              if (roleNames.includes('Customer')) {
                next = '/customer';
              } else if (roleNames.includes('Partner')) {
                next = '/partner';
              } else {
                next = '/dashboard';
              }
            } else {
              next = '/dashboard';
            }
          } catch {
            next = '/dashboard';
          }
        }

        router.push(next);
        router.refresh();
      } else {
        setError('Некорректный ответ сервера');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Вход в CRM</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="admin@test.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Тест: admin@test.com / admin123
        </p>
      </div>
    </div>
  );
}
