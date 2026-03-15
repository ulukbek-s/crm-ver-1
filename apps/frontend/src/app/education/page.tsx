'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2 } from 'lucide-react';

function authHeaders(): HeadersInit {
  return {
    Authorization:
      'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
  };
}

async function fetchJson(path: string) {
  const res = await fetch(path, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function createCoursePayment(
  candidateId: string,
  body: { amount: number; currency?: string; status?: string; maxAmount?: number },
) {
  const res = await fetch('/api/finance/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    } as any,
    body: JSON.stringify({ candidateId, ...body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Failed to create course payment');
  }
  return res.json();
}

export default function EducationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'students'
    | 'teachers'
    | 'schedule'
    | 'progress'
    | 'payments'
    | 'exams'
    | 'certificates'
  >('overview');

  const { data: courses = [] } = useQuery({
    queryKey: ['education', 'courses'],
    queryFn: () => fetchJson('/api/education/courses'),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['education', 'groups'],
    queryFn: () => fetchJson('/api/education/groups'),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['education', 'students'],
    queryFn: () => fetchJson('/api/education/students'),
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ['education', 'teachers'],
    queryFn: () => fetchJson('/api/education/teachers'),
  });
  const { data: coursePayments = [] } = useQuery({
    queryKey: ['education', 'course-payments'],
    queryFn: () => fetchJson('/api/education/course-payments'),
  });
  const { data: exams = [] } = useQuery({
    queryKey: ['education', 'exams'],
    queryFn: () => fetchJson('/api/education/exams'),
  });
  const { data: certificates = [] } = useQuery({
    queryKey: ['education', 'certificates'],
    queryFn: () => fetchJson('/api/education/certificates'),
  });
  const { data: stats } = useQuery({
    queryKey: ['education', 'stats'],
    queryFn: () => fetchJson('/api/education/stats'),
  });

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [price, setPrice] = useState('');
  const [requiredForProgram, setRequiredForProgram] = useState('');
  const [description, setDescription] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newGroupCourseId, setNewGroupCourseId] = useState('');
  const [newGroupTeacherId, setNewGroupTeacherId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStart, setNewGroupStart] = useState('');
  const [newGroupEnd, setNewGroupEnd] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [studentCourseSelection, setStudentCourseSelection] = useState<Record<string, string>>({});
  const [studentGroupSelection, setStudentGroupSelection] = useState<Record<string, string>>({});
  const [studentFilterStatus, setStudentFilterStatus] = useState<string>('');
  const [studentFilterCourseId, setStudentFilterCourseId] = useState<string>('');
  const [studentFilterName, setStudentFilterName] = useState<string>('');
  const [paymentsCandidateId, setPaymentsCandidateId] = useState<string>('');
  const [paymentsAmount, setPaymentsAmount] = useState<string>('');
  const [paymentsCurrency, setPaymentsCurrency] = useState<string>('EUR');
  const [paymentsStatus, setPaymentsStatus] = useState<string>('pending');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherUserId, setNewTeacherUserId] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('');
  const [examCourseId, setExamCourseId] = useState('');
  const [examGroupId, setExamGroupId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examMaxScore, setExamMaxScore] = useState('');
  const [certificateStudentId, setCertificateStudentId] = useState('');
  const [certificateCourseId, setCertificateCourseId] = useState('');
  const [certificateLevel, setCertificateLevel] = useState('');
  const [certificateDate, setCertificateDate] = useState('');

  const saveCourseMutation = useMutation({
    mutationFn: async () => {
      const body: any = { name: name.trim() };
      if (!body.name) throw new Error('Name is required');
      if (language.trim()) body.language = language.trim();
      if (level.trim()) body.level = level.trim();
      if (durationWeeks.trim()) body.durationWeeks = Number(durationWeeks);
      if (price.trim()) body.price = Number(price);
      if (requiredForProgram.trim()) body.requiredForProgram = requiredForProgram.trim();
      if (description.trim()) body.description = description.trim();

      const url = editingCourseId
        ? `/api/education/courses/${editingCourseId}`
        : '/api/education/courses';
      const method = editingCourseId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to create course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'courses'] });
      setName('');
      setLanguage('');
      setLevel('');
      setDurationWeeks('');
      setPrice('');
      setRequiredForProgram('');
      setDescription('');
      setEditingCourseId(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/education/courses/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'courses'] });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: newGroupName.trim(),
        courseId: newGroupCourseId,
      };
      if (!body.name || !body.courseId) throw new Error('Group name and course are required');
      if (newGroupTeacherId) body.teacherId = newGroupTeacherId;
      if (newGroupStart) body.startDate = newGroupStart;
      if (newGroupEnd) body.endDate = newGroupEnd;

      const url = editingGroupId
        ? `/api/education/groups/${editingGroupId}`
        : '/api/education/groups';
      const method = editingGroupId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save group');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'groups'] });
      setNewGroupName('');
      setNewGroupCourseId('');
      setNewGroupTeacherId('');
      setNewGroupStart('');
      setNewGroupEnd('');
      setEditingGroupId(null);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/education/groups/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete group');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'groups'] });
    },
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async (payload: { studentId: string; candidateId: string; courseId: string; groupId: string }) => {
      const res = await fetch('/api/education/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify({
          candidateId: payload.candidateId,
          courseId: payload.courseId,
          groupId: payload.groupId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to enroll student');
      }
      return res.json();
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['education', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['education', 'groups'] });
      setStudentCourseSelection((prev) => {
        const copy = { ...prev };
        delete copy[payload.studentId];
        return copy;
      });
      setStudentGroupSelection((prev) => {
        const copy = { ...prev };
        delete copy[payload.studentId];
        return copy;
      });
    },
  });

  const updateStudentStatusMutation = useMutation({
    mutationFn: async (payload: { studentId: string; status: string }) => {
      const res = await fetch(`/api/education/students/${payload.studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify({ status: payload.status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update student');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'students'] });
    },
  });

  const saveTeacherMutation = useMutation({
    mutationFn: async () => {
      const body: any = { name: newTeacherName.trim() };
      if (!body.name) throw new Error('Name is required');
      if (newTeacherEmail.trim()) body.email = newTeacherEmail.trim();
      if (newTeacherUserId.trim()) body.userId = newTeacherUserId.trim();

      const url = editingTeacherId
        ? `/api/education/teachers/${editingTeacherId}`
        : '/api/education/teachers';
      const method = editingTeacherId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save teacher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'teachers'] });
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherUserId('');
      setEditingTeacherId(null);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/education/teachers/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete teacher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'teachers'] });
    },
  });

  const createExamMutation = useMutation({
    mutationFn: async () => {
      const body: any = { name: examName.trim() };
      if (!body.name) throw new Error('Name is required');
      if (examType.trim()) body.type = examType.trim();
      if (examCourseId) body.courseId = examCourseId;
      if (examGroupId) body.groupId = examGroupId;
      if (examDate) body.date = examDate;
      if (examMaxScore) body.maxScore = Number(examMaxScore);

      const res = await fetch('/api/education/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to create exam');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'exams'] });
      setExamName('');
      setExamType('');
      setExamCourseId('');
      setExamGroupId('');
      setExamDate('');
      setExamMaxScore('');
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/education/exams/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete exam');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'exams'] });
    },
  });

  const createCertificateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        studentId: certificateStudentId,
        level: certificateLevel.trim(),
      };
      if (!body.studentId || !body.level) {
        throw new Error('Student and level are required');
      }
      if (certificateCourseId) body.courseId = certificateCourseId;
      if (certificateDate) body.issuedAt = certificateDate;

      const res = await fetch('/api/education/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        } as any,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to create certificate');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'certificates'] });
      setCertificateStudentId('');
      setCertificateCourseId('');
      setCertificateLevel('');
      setCertificateDate('');
    },
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/education/certificates/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete certificate');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'certificates'] });
    },
  });

  const createCoursePaymentMutation = useMutation({
    mutationFn: (payload: {
      candidateId: string;
      amount: number;
      status?: string;
      maxAmount?: number;
    }) =>
      createCoursePayment(payload.candidateId, {
        amount: payload.amount,
        currency: 'EUR',
        status: payload.status ?? 'completed',
        ...(payload.maxAmount != null && { maxAmount: payload.maxAmount }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
    },
  });

  const createPaymentFromTabMutation = useMutation({
    mutationFn: () => {
      const amount = Number(paymentsAmount);
      if (!paymentsCandidateId || !amount || Number.isNaN(amount)) {
        throw new Error('Candidate and amount are required');
      }
      const student = students.find((s: any) => s.candidate?.id === paymentsCandidateId);
      const firstGroup = (student?.groups ?? [])[0]?.group;
      const coursePrice = firstGroup?.course?.price != null ? Number(firstGroup.course.price) : null;
      const totalPaid = (coursePayments as any[])
        .filter((p: any) => p.candidateId === paymentsCandidateId && p.status === 'completed')
        .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
      const maxAmount = coursePrice != null ? Math.max(0, coursePrice - totalPaid) : undefined;
      return createCoursePayment(paymentsCandidateId, {
        amount,
        currency: paymentsCurrency || 'EUR',
        status: paymentsStatus || 'pending',
        ...(maxAmount != null && { maxAmount }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
      queryClient.invalidateQueries({ queryKey: ['education', 'students'] });
      setPaymentsAmount('');
      setPaymentsStatus('pending');
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) => {
      const res = await fetch(`/api/finance/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() } as any,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
    },
  });

  const attachReceiptMutation = useMutation({
    mutationFn: async ({
      paymentId,
      candidateId,
      file,
    }: {
      paymentId: string;
      candidateId: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'receipt');
      const uploadRes = await fetch(`/api/documents/upload/candidate/${candidateId}`, {
        method: 'POST',
        headers: authHeaders() as any,
        body: form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.message || 'Upload failed');
      }
      const doc = await uploadRes.json();
      const patchRes = await fetch(`/api/finance/payments/${paymentId}/receipt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() } as any,
        body: JSON.stringify({ documentId: doc.id }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(err?.message || 'Attach receipt failed');
      }
      return patchRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
    },
  });

  const removeReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/finance/payments/${paymentId}/receipt`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Remove receipt failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/finance/payments/${paymentId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Delete payment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', 'course-payments'] });
    },
  });

  const filteredStudents = students.filter((s: any) => {
    const statusOk = !studentFilterStatus || s.status === studentFilterStatus;
    const courseOk =
      !studentFilterCourseId ||
      (s.groups ?? []).some((g: any) => g.group?.courseId === studentFilterCourseId);
    const nameOk = !studentFilterName.trim() || (() => {
      const fullName = `${s.candidate?.firstName ?? ''} ${s.candidate?.lastName ?? ''}`.trim().toLowerCase();
      const code = (s.candidate?.candidateCode ?? '').toLowerCase();
      const q = studentFilterName.trim().toLowerCase();
      return fullName.includes(q) || code.includes(q);
    })();
    return statusOk && courseOk && nameOk;
  });

  const paymentsToShow = paymentsCandidateId
    ? coursePayments.filter((p: any) => p.candidateId === paymentsCandidateId)
    : coursePayments;

  const [receiptUploadTarget, setReceiptUploadTarget] = useState<{
    paymentId: string;
    candidateId: string;
  } | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownloadReceipt(documentId: string, fileName?: string) {
    const res = await fetch(`/api/documents/${documentId}/download`, {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'receipt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Courses, students, teachers, schedule, exams and certificates
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm">
        <nav className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'students', label: 'Students' },
            { id: 'teachers', label: 'Teachers' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'progress', label: 'Progress' },
            { id: 'payments', label: 'Payments' },
            { id: 'exams', label: 'Exams' },
            { id: 'certificates', label: 'Certificates' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | 'overview'
                    | 'students'
                    | 'teachers'
                    | 'schedule'
                    | 'progress'
                    | 'payments'
                    | 'exams'
                    | 'certificates',
                )
              }
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                Students total
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats?.totalStudents ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                Completed / Failed
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                <span className="font-semibold text-emerald-600">
                  {stats?.completedStudents ?? 0}
                </span>{' '}
                /{' '}
                <span className="font-semibold text-red-600">
                  {stats?.failedStudents ?? 0}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                Revenue from courses
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats
                  ? Number(stats.totalRevenue ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })
                  : 0}{' '}
                €
              </div>
            </div>
          </section>

          {/* Courses */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Courses
              </h2>
            </div>

        {/* Add new course */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {editingCourseId ? 'Edit course' : 'Add new course'}
            </h3>
            {editingCourseId && (
              <button
                type="button"
                onClick={() => {
                  setEditingCourseId(null);
                  setName('');
                  setLanguage('');
                  setLevel('');
                  setDurationWeeks('');
                  setPrice('');
                  setRequiredForProgram('');
                  setDescription('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="German B1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Language
              </label>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="German"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Level
              </label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="B1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Duration (weeks)
              </label>
              <input
                type="number"
                min={0}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="12"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Price
              </label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Required for program
              </label>
              <input
                value={requiredForProgram}
                onChange={(e) => setRequiredForProgram(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                placeholder="Germany Work Visa"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              placeholder="Intensive German B1 course..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => saveCourseMutation.mutate()}
              disabled={saveCourseMutation.isPending}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saveCourseMutation.isPending
                ? 'Saving…'
                : editingCourseId
                ? 'Update course'
                : 'Save course'}
            </button>
            {saveCourseMutation.isError && (
              <p className="text-xs text-red-600">
                {(saveCourseMutation.error as Error)?.message}
              </p>
            )}
          </div>
        </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 col-span-full">No courses</div>
            )}
            {courses.map((c: any) => {
              const studentsSet = new Map<string, any>();
              (c.groups ?? []).forEach((g: any) => {
                (g.students ?? []).forEach((gs: any) => {
                  if (gs.student?.candidate) {
                    studentsSet.set(gs.student.candidate.id, gs.student.candidate);
                  }
                });
              });
              const studentsArr = Array.from(studentsSet.values());
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col gap-3"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {c.language || '—'} · {c.level || '—'}
                    </p>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <p><span className="font-medium">Duration:</span> {c.duration != null ? `${c.duration} weeks` : '—'}</p>
                    <p><span className="font-medium">Price:</span> {c.price != null ? `${Number(c.price).toLocaleString()} €` : '—'}</p>
                    {c.requiredForProgram && (
                      <p><span className="font-medium">Required for:</span> {c.requiredForProgram}</p>
                    )}
                    {c.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.description}</p>
                    )}
                    <p>
                      <span className="font-medium">Students:</span>{' '}
                      {Array.from(
                        new Set(
                          (c.groups ?? [])
                            .flatMap((g: any) => g.students ?? [])
                            .map((gs: any) => gs.student?.candidate?.id)
                            .filter(Boolean),
                        ),
                      ).length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourseId(c.id);
                        setName(c.name ?? '');
                        setLanguage(c.language ?? '');
                        setLevel(c.level ?? '');
                        setDurationWeeks(c.duration != null ? String(c.duration) : '');
                        setPrice(c.price != null ? String(c.price) : '');
                        setRequiredForProgram(c.requiredForProgram ?? '');
                        setDescription(c.description ?? '');
                      }}
                      className="inline-flex items-center rounded-full border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCourseMutation.mutate(c.id)}
                      disabled={deleteCourseMutation.isPending}
                      className="inline-flex items-center rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Students in this course ({studentsArr.length})
                    </p>
                    {studentsArr.length === 0 ? (
                      <p className="text-xs text-gray-400">No students yet</p>
                    ) : (
                      <ul className="space-y-0.5 max-h-24 overflow-y-auto text-xs text-gray-700 dark:text-gray-200">
                        {studentsArr.map((s: any) => (
                          <li key={s.id}>
                            {`${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() ||
                              s.candidateCode ||
                              s.id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      )}

      {activeTab === 'payments' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Course payments
          </h2>
          <div className="mb-4 flex flex-wrap items-end gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Candidate
              </label>
              <select
                value={paymentsCandidateId}
                onChange={(e) => setPaymentsCandidateId(e.target.value)}
                className="w-56 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              >
                <option value="">Select candidate…</option>
                {students
                  .filter((s: any) => s.candidate)
                  .map((s: any) => (
                    <option key={s.id} value={s.candidate.id}>
                      {`${s.candidate.firstName ?? ''} ${s.candidate.lastName ?? ''}`.trim() ||
                        s.candidate.candidateCode ||
                        s.candidate.id}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentsAmount}
                onChange={(e) => setPaymentsAmount(e.target.value)}
                className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Currency
              </label>
              <input
                value={paymentsCurrency}
                onChange={(e) => setPaymentsCurrency(e.target.value)}
                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={paymentsStatus}
                onChange={(e) => setPaymentsStatus(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              >
                <option value="pending">pending</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="refunded">refunded</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => createPaymentFromTabMutation.mutate()}
              disabled={
                !paymentsCandidateId ||
                !paymentsAmount ||
                createPaymentFromTabMutation.isPending
              }
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createPaymentFromTabMutation.isPending ? 'Saving…' : 'Добавить платёж'}
            </button>
            {createPaymentFromTabMutation.isError && (
              <p className="text-xs text-red-600">
                {(createPaymentFromTabMutation.error as Error)?.message}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <input
              ref={receiptFileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && receiptUploadTarget) {
                  attachReceiptMutation.mutate({
                    paymentId: receiptUploadTarget.paymentId,
                    candidateId: receiptUploadTarget.candidateId,
                    file: f,
                  });
                  setReceiptUploadTarget(null);
                }
                e.target.value = '';
              }}
            />
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Paid at
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Остаток
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Чек
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase text-right">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paymentsToShow.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No course payments yet
                    </td>
                  </tr>
                )}
                {paymentsToShow.map((p: any) => {
                  const studentForCandidate = students.find((s: any) => s.candidate?.id === p.candidateId);
                  const firstGroup = (studentForCandidate?.groups ?? [])[0]?.group;
                  const coursePrice = firstGroup?.course?.price != null ? Number(firstGroup.course.price) : null;
                  const totalPaidForCandidate = (coursePayments as any[])
                    .filter((x: any) => x.candidateId === p.candidateId && x.status === 'completed')
                    .reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0);
                  const remaining = coursePrice != null ? Math.max(0, coursePrice - totalPaidForCandidate) : null;
                  return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {p.candidate
                        ? `${p.candidate.firstName ?? ''} ${p.candidate.lastName ?? ''}`.trim() ||
                          p.candidate.candidateCode ||
                          p.candidate.id
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {p.amount != null ? Number(p.amount).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {p.currency ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <select
                        value={p.status ?? 'pending'}
                        onChange={(e) =>
                          updatePaymentStatusMutation.mutate({
                            paymentId: p.id,
                            status: e.target.value,
                          })
                        }
                        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                      >
                        <option value="pending">pending</option>
                        <option value="completed">completed</option>
                        <option value="failed">failed</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {remaining != null ? `${remaining.toLocaleString()} ${p.currency ?? 'EUR'}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptUploadTarget({
                              paymentId: p.id,
                              candidateId: p.candidateId,
                            });
                            receiptFileInputRef.current?.click();
                          }}
                          disabled={attachReceiptMutation.isPending}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                          <Upload className="h-3 w-3" />
                          {p.receiptDocument ? 'Заменить' : 'Загрузить'}
                        </button>
                        {p.receiptDocument && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadReceipt(
                                  p.receiptDocument.id,
                                  p.receiptDocument.fileName,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <Download className="h-3 w-3" />
                              Скачать
                            </button>
                            <button
                              type="button"
                              onClick={() => removeReceiptMutation.mutate(p.id)}
                              disabled={removeReceiptMutation.isPending}
                              className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-700 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Удалить чек
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">
                      <button
                        type="button"
                        onClick={() => deletePaymentMutation.mutate(p.id)}
                        disabled={deletePaymentMutation.isPending}
                        className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-700 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'schedule' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Schedule (groups)
          </h2>
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {editingGroupId ? 'Edit group' : 'Add new group'}
              </h3>
              {editingGroupId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroupId(null);
                    setNewGroupName('');
                    setNewGroupCourseId('');
                    setNewGroupTeacherId('');
                    setNewGroupStart('');
                    setNewGroupEnd('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Course
                </label>
                <select
                  value={newGroupCourseId}
                  onChange={(e) => setNewGroupCourseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select course…</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level ? `(${c.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Group name
                </label>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="B1-01"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Teacher
                </label>
                <select
                  value={newGroupTeacherId}
                  onChange={(e) => setNewGroupTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Not set</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Start
                  </label>
                  <input
                    type="date"
                    value={newGroupStart}
                    onChange={(e) => setNewGroupStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    End
                  </label>
                  <input
                    type="date"
                    value={newGroupEnd}
                    onChange={(e) => setNewGroupEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => createGroupMutation.mutate()}
              disabled={
                !newGroupName.trim() ||
                !newGroupCourseId ||
                createGroupMutation.isPending
              }
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {createGroupMutation.isPending
                ? 'Saving…'
                : editingGroupId
                ? 'Update group'
                : 'Save group'}
            </button>
            {createGroupMutation.isError && (
              <p className="text-xs text-red-600">
                {(createGroupMutation.error as Error)?.message}
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Group
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Course
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Teacher
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Start / End
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Students
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {groups.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No groups
                    </td>
                  </tr>
                )}
                {groups.map((g: any) => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {g.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {g.course?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {g.teacher?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {g.startDate ? new Date(g.startDate).toLocaleDateString() : '—'} /{' '}
                      {g.endDate ? new Date(g.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {g.students?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(g.id);
                            setNewGroupName(g.name ?? '');
                            setNewGroupCourseId(g.courseId ?? '');
                            setNewGroupTeacherId(g.teacherId ?? '');
                            setNewGroupStart(
                              g.startDate
                                ? new Date(g.startDate).toISOString().slice(0, 10)
                                : '',
                            );
                            setNewGroupEnd(
                              g.endDate ? new Date(g.endDate).toISOString().slice(0, 10) : '',
                            );
                          }}
                          className="inline-flex items-center rounded-full border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGroupMutation.mutate(g.id)}
                          disabled={deleteGroupMutation.isPending}
                          className="inline-flex items-center rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'students' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Students
          </h2>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={studentFilterName}
              onChange={(e) => setStudentFilterName(e.target.value)}
              placeholder="Поиск по имени..."
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white w-48"
            />
            <select
              value={studentFilterStatus}
              onChange={(e) => setStudentFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="enrolled">enrolled</option>
              <option value="studying">studying</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="dropped">dropped</option>
            </select>
            <select
              value={studentFilterCourseId}
              onChange={(e) => setStudentFilterCourseId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">All courses</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.level ? `(${c.level})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Country
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Groups
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Enroll to group
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Certificates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No students
                    </td>
                  </tr>
                )}
                {filteredStudents.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {s.candidate
                        ? `${s.candidate.firstName ?? ''} ${s.candidate.lastName ?? ''}`.trim() ||
                          s.candidate.candidateCode ||
                          s.candidate.id
                        : s.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {s.candidate?.country?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <select
                        value={s.status ?? 'enrolled'}
                        onChange={(e) =>
                          updateStudentStatusMutation.mutate({
                            studentId: s.id,
                            status: e.target.value,
                          })
                        }
                        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                      >
                        <option value="enrolled">enrolled</option>
                        <option value="studying">studying</option>
                        <option value="completed">completed</option>
                        <option value="failed">failed</option>
                        <option value="dropped">dropped</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(s.groups ?? [])
                        .map((g: any) => g.group?.name || '')
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex flex-col gap-1">
                        <select
                          value={studentCourseSelection[s.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudentCourseSelection((prev) => ({
                              ...prev,
                              [s.id]: val,
                            }));
                            // сбрасываем выбранную группу при смене курса
                            setStudentGroupSelection((prev) => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                          }}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                        >
                          <option value="">Select course…</option>
                          {courses.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.level ? `(${c.level})` : ''}
                            </option>
                          ))}
                        </select>
                        <select
                          value={studentGroupSelection[s.id] ?? ''}
                          onChange={(e) =>
                            setStudentGroupSelection((prev) => ({
                              ...prev,
                              [s.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                        >
                          <option value="">Select group…</option>
                          {groups
                            .filter((g: any) => g.courseId === studentCourseSelection[s.id])
                            .map((g: any) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={
                            !studentCourseSelection[s.id] ||
                            !studentGroupSelection[s.id] ||
                            enrollStudentMutation.isPending
                          }
                          onClick={() =>
                            enrollStudentMutation.mutate({
                              studentId: s.id,
                              candidateId: s.candidate?.id,
                              courseId: studentCourseSelection[s.id],
                              groupId: studentGroupSelection[s.id],
                            })
                          }
                          className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-xs px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
                        >
                          Enroll
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(s.certificates ?? []).length > 0
                        ? (s.certificates as any[])
                            .map((c) => c.level)
                            .filter(Boolean)
                            .join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'progress' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progress
          </h2>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={studentFilterName}
              onChange={(e) => setStudentFilterName(e.target.value)}
              placeholder="Поиск по имени студента..."
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white w-52"
            />
            <select
              value={studentFilterStatus}
              onChange={(e) => setStudentFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="enrolled">enrolled</option>
              <option value="studying">studying</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="dropped">dropped</option>
            </select>
            <select
              value={studentFilterCourseId}
              onChange={(e) => setStudentFilterCourseId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">All courses</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.level ? `(${c.level})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Groups
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Certificates
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Payments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No students
                    </td>
                  </tr>
                )}
                {filteredStudents.map((s: any) => {
                  const groups = s.groups ?? [];
                  const firstGroup = groups[0]?.group;
                  const startDate = firstGroup?.startDate ? new Date(firstGroup.startDate) : null;
                  const endDate = firstGroup?.endDate ? new Date(firstGroup.endDate) : null;
                  const now = new Date();
                  let progressPercent = 0;
                  if (s.status === 'completed' || s.status === 'failed') progressPercent = 100;
                  else if (s.status === 'dropped') progressPercent = 0;
                  else if (startDate && endDate && endDate > startDate) {
                    const total = endDate.getTime() - startDate.getTime();
                    const elapsed = Math.min(now.getTime() - startDate.getTime(), total);
                    progressPercent = Math.round((elapsed / total) * 100);
                    if (s.status === 'enrolled') progressPercent = Math.max(progressPercent, 5);
                    if (s.status === 'studying') progressPercent = Math.min(100, Math.max(progressPercent, 10));
                  } else {
                    if (s.status === 'enrolled') progressPercent = 10;
                    else if (s.status === 'studying') progressPercent = 50;
                  }
                  const payments = s.candidate?.payments ?? [];
                  const totalPaid = payments
                    .filter((p: any) => p.status === 'completed')
                    .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
                  const lastPaymentStatus = payments[payments.length - 1]?.status;
                  return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {s.candidate
                        ? `${s.candidate.firstName ?? ''} ${s.candidate.lastName ?? ''}`.trim() ||
                          s.candidate.candidateCode ||
                          s.candidate.id
                        : s.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="space-y-1.5 min-w-[120px]">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">{s.status ?? 'enrolled'}</div>
                        <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {progressPercent}%
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(s.groups ?? [])
                        .map((g: any) => g.group?.name || '')
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(s.certificates ?? []).length > 0
                        ? (s.certificates as any[])
                            .map((c) => c.level)
                            .filter(Boolean)
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {(() => {
                        if (!s.candidate?.id) {
                          return 'No candidate';
                        }
                        const mainCourse = (s.groups ?? [])[0]?.group?.course;
                        const coursePrice =
                          mainCourse && mainCourse.price != null
                            ? Number(mainCourse.price)
                            : null;
                        const remaining =
                          coursePrice != null
                            ? Math.max(coursePrice - totalPaid, 0)
                            : null;

                        return (
                          <div className="space-y-1">
                            {payments.length === 0 ? (
                              <div>No payments</div>
                            ) : (
                              <div className="space-y-0.5">
                                <div>
                                  Paid:{' '}
                                  <span className="font-medium">
                                    {totalPaid.toLocaleString()} {payments[0]?.currency ?? ''}
                                  </span>
                                </div>
                                {lastPaymentStatus && (
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Last status: {lastPaymentStatus}
                                  </div>
                                )}
                              </div>
                            )}
                            {remaining != null && remaining > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  createCoursePaymentMutation.mutate({
                                    candidateId: s.candidate.id,
                                    amount: remaining,
                                    status: 'completed',
                                    maxAmount: remaining,
                                  })
                                }
                                disabled={createCoursePaymentMutation.isPending}
                                className="mt-1 inline-flex items-center rounded-md bg-emerald-600 text-white px-2 py-1 text-[10px] hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Add course payment ({remaining.toLocaleString()} EUR)
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'teachers' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Teachers
          </h2>
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {editingTeacherId ? 'Edit teacher' : 'Add teacher'}
              </h3>
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacherId(null);
                    setNewTeacherName('');
                    setNewTeacherEmail('');
                    setNewTeacherUserId('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Name
                </label>
                <input
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="Anna Müller"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="teacher@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Linked userId (optional)
                </label>
                <input
                  value={newTeacherUserId}
                  onChange={(e) => setNewTeacherUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="UUID of system user"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveTeacherMutation.mutate()}
                disabled={saveTeacherMutation.isPending}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saveTeacherMutation.isPending
                  ? 'Saving…'
                  : editingTeacherId
                  ? 'Update teacher'
                  : 'Save teacher'}
              </button>
              {saveTeacherMutation.isError && (
                <p className="text-xs text-red-600">
                  {(saveTeacherMutation.error as Error)?.message}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Groups
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {teachers.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No teachers
                    </td>
                  </tr>
                )}
                {teachers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {t.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {(t.groups ?? []).map((g: any) => g.course?.name ?? g.name).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacherId(t.id);
                            setNewTeacherName(t.name ?? '');
                            setNewTeacherEmail(t.email ?? '');
                            setNewTeacherUserId(t.userId ?? '');
                          }}
                          className="inline-flex items-center rounded-full border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTeacherMutation.mutate(t.id)}
                          disabled={deleteTeacherMutation.isPending}
                          className="inline-flex items-center rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'exams' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exams</h2>
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add exam</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Name
                </label>
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="Final B1 exam"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Type
                </label>
                <input
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="written / oral"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Course
                </label>
                <select
                  value={examCourseId}
                  onChange={(e) => setExamCourseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Any</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level ? `(${c.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Group (optional)
                </label>
                <select
                  value={examGroupId}
                  onChange={(e) => setExamGroupId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">All groups</option>
                  {groups
                    .filter((g: any) => !examCourseId || g.courseId === examCourseId)
                    .map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Max score
                </label>
                <input
                  type="number"
                  min={0}
                  value={examMaxScore}
                  onChange={(e) => setExamMaxScore(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => createExamMutation.mutate()}
                disabled={createExamMutation.isPending}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {createExamMutation.isPending ? 'Saving…' : 'Save exam'}
              </button>
              {createExamMutation.isError && (
                <p className="text-xs text-red-600">
                  {(createExamMutation.error as Error)?.message}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Course / Group
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Max score
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {exams.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No exams
                    </td>
                  </tr>
                )}
                {exams.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{e.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {e.type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {e.course?.name ?? '—'}{' '}
                    {e.group ? `(${e.group.name})` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {e.date ? new Date(e.date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {e.maxScore ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => deleteExamMutation.mutate(e.id)}
                      disabled={deleteExamMutation.isPending}
                      className="inline-flex items-center rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'certificates' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Certificates
          </h2>
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Create certificate
            </h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Student
                </label>
                <select
                  value={certificateStudentId}
                  onChange={(e) => setCertificateStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select student…</option>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.candidate
                        ? `${s.candidate.firstName ?? ''} ${s.candidate.lastName ?? ''}`.trim() ||
                          s.candidate.candidateCode ||
                          s.candidate.id
                        : s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Course
                </label>
                <select
                  value={certificateCourseId}
                  onChange={(e) => setCertificateCourseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Not linked</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level ? `(${c.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Level
                </label>
                <input
                  value={certificateLevel}
                  onChange={(e) => setCertificateLevel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                  placeholder="B1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Issue date
                </label>
                <input
                  type="date"
                  value={certificateDate}
                  onChange={(e) => setCertificateDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => createCertificateMutation.mutate()}
                disabled={createCertificateMutation.isPending}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {createCertificateMutation.isPending ? 'Saving…' : 'Save certificate'}
              </button>
              {createCertificateMutation.isError && (
                <p className="text-xs text-red-600">
                  {(createCertificateMutation.error as Error)?.message}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Issued at
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {certificates.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No certificates
                    </td>
                  </tr>
                )}
                {certificates.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {c.student?.candidate
                        ? `${c.student.candidate.firstName ?? ''} ${
                            c.student.candidate.lastName ?? ''
                          }`.trim() || c.student.candidate.candidateCode
                        : c.studentId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {c.level}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <button
                        type="button"
                        onClick={() => deleteCertificateMutation.mutate(c.id)}
                        disabled={deleteCertificateMutation.isPending}
                        className="inline-flex items-center rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
