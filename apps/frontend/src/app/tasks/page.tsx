'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

function authHeaders() {
  return {
    Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
    'Content-Type': 'application/json',
  };
}

async function fetchTasks() {
  const res = await fetch('/api/tasks', {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

async function createTask(body: { title: string; description?: string; deadline?: string; priority?: string }) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

async function updateTaskStatus(id: string, status: string) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

const COLS = ['Todo', 'In Progress', 'Completed'];

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
      setNewDeadline('');
      setNewPriority('medium');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const byStatus = COLS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col] = tasks.filter((t: any) => {
      const s = (t.status || 'todo').toLowerCase().replace(/\s+/, '_');
      const c = col.toLowerCase().replace(/\s+/, '_');
      return s === c;
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Task board</p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            createMutation.mutate({
              title: newTitle.trim(),
              ...(newDeadline && { deadline: newDeadline }),
              priority: newPriority,
            });
          }}
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task title"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending || !newTitle.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'New task'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLS.map((col) => (
          <div key={col} className="bg-gray-100/80 rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">{col}</h3>
            <div className="space-y-2">
              {isLoading && <div className="text-gray-500 text-sm">Loading…</div>}
              {(byStatus[col]?.length ?? 0) === 0 && !isLoading && (
                <div className="text-gray-500 text-sm">No tasks</div>
              )}
              {(byStatus[col] ?? []).map((t: any) => (
                <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-1">
                  <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                  {t.deadline && (
                    <p className="text-xs text-gray-500">
                      Due {new Date(t.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <select
                    value={t.status || 'todo'}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ id: t.id, status: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
