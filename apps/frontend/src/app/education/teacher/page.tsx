'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchJson(path: string) {
  const res = await fetch(path, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export default function TeacherEducationPage() {
  const queryClient = useQueryClient();
  const { data: groups = [] } = useQuery({
    queryKey: ['education', 'my-groups'],
    queryFn: () => fetchJson('/api/education/my-groups'),
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['education', 'lessons', selectedGroupId],
    queryFn: () => fetchJson(`/api/education/groups/${selectedGroupId}/lessons`),
    enabled: !!selectedGroupId,
  });

  const setAttendanceMutation = useMutation({
    mutationFn: async (payload: {
      lessonId: string;
      groupId: string;
      items: { studentId: string; status: string }[];
    }) => {
      const res = await fetch(`/api/education/lessons/${payload.lessonId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify({ groupId: payload.groupId, items: payload.items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save attendance');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['education', 'lessons', variables.groupId],
      });
    },
  });

  const selectedGroup = (groups as any[]).find((g) => g.id === selectedGroupId);
  const students = selectedGroup
    ? (selectedGroup.students ?? []).map((s: any) => s.student)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мои группы</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Расписание занятий и посещаемость
        </p>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Группа
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Выберите группу…</option>
              {(groups as any[]).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.course?.name ?? ''}
                </option>
              ))}
            </select>
          </div>
          {selectedGroup && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>
                Курс:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedGroup.course?.name}
                  {selectedGroup.course?.level ? ` (${selectedGroup.course.level})` : ''}
                </span>
              </div>
              <div>
                Студентов: {students.length}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedGroupId && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Занятия и посещаемость
          </h2>
          {lessonsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка занятий…</p>
          ) : (lessons as any[]).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Для курса этой группы ещё не созданы уроки.
            </p>
          ) : (
            <div className="space-y-4">
              {(lessons as any[]).map((lesson) => {
                const dateLabel = lesson.scheduledAt
                  ? new Date(lesson.scheduledAt).toLocaleString()
                  : 'Без даты';
                const attendanceByStudent: Record<
                  string,
                  { status: string | null }
                > = {};
                for (const a of lesson.attendance ?? []) {
                  attendanceByStudent[a.studentId] = { status: a.status };
                }

                return (
                  <div
                    key={lesson.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {lesson.title || 'Урок'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {dateLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const items = students.map((s: any) => {
                            const current = attendanceByStudent[s.id]?.status ?? 'present';
                            return { studentId: s.id, status: current };
                          });
                          setAttendanceMutation.mutate({
                            lessonId: lesson.id,
                            groupId: selectedGroupId,
                            items,
                          });
                        }}
                        disabled={setAttendanceMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        {setAttendanceMutation.isPending ? 'Сохранение…' : 'Сохранить как присутствие'}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-gray-500 dark:text-gray-300 uppercase">
                              Студент
                            </th>
                            <th className="px-3 py-2 font-semibold text-gray-500 dark:text-gray-300 uppercase">
                              Статус
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {students.map((s: any) => {
                            const currentStatus =
                              attendanceByStudent[s.id]?.status ?? 'present';
                            return (
                              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <td className="px-3 py-2 text-gray-900 dark:text-white">
                                  {s.candidate
                                    ? `${s.candidate.firstName ?? ''} ${
                                        s.candidate.lastName ?? ''
                                      }`.trim() || s.candidate.candidateCode
                                    : s.id}
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    defaultValue={currentStatus}
                                    onChange={(e) => {
                                      const next = e.target.value;
                                      const items = students.map((st: any) => {
                                        const base =
                                          attendanceByStudent[st.id]?.status ?? 'present';
                                        return {
                                          studentId: st.id,
                                          status: st.id === s.id ? next : base,
                                        };
                                      });
                                      setAttendanceMutation.mutate({
                                        lessonId: lesson.id,
                                        groupId: selectedGroupId,
                                        items,
                                      });
                                    }}
                                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                                  >
                                    <option value="present">present</option>
                                    <option value="absent">absent</option>
                                    <option value="late">late</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

