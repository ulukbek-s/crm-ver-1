'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { FinanceTablePage } from '@/components/finance/FinanceTablePage';

const authHeaders = () => ({
  Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
});

async function fetchPayments() {
  const res = await fetch('/api/finance/payments', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export default function FinancePaymentsPage() {
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['finance', 'payments'],
    queryFn: fetchPayments,
  });

  const attachReceiptMutation = useMutation({
    mutationFn: async ({ paymentId, candidateId, file }: { paymentId: string; candidateId: string; file: File }) => {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] }),
  });

  async function handleDownload(documentId: string, fileName?: string) {
    const res = await fetch(`/api/documents/${documentId}/download`, { headers: authHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'receipt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const table = (
    <table className="w-full text-left">
      <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Candidate</th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Amount</th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase text-right">
            Чек
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </td>
          </tr>
        )}
        {!isLoading && payments.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No payments
            </td>
          </tr>
        )}
        {!isLoading &&
          payments.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {p.candidate?.firstName} {p.candidate?.lastName}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {p.currency} {Number(p.amount).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                <ReceiptCell
                  payment={p}
                  onUpload={(file) =>
                    attachReceiptMutation.mutate({
                      paymentId: p.id,
                      candidateId: p.candidateId,
                      file,
                    })
                  }
                  onRemove={() => removeReceiptMutation.mutate(p.id)}
                  onDownload={() =>
                    p.receiptDocument &&
                    handleDownload(p.receiptDocument.id, p.receiptDocument.fileName)
                  }
                  uploadPending={attachReceiptMutation.isPending}
                  removePending={removeReceiptMutation.isPending}
                />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <FinanceTablePage
      title="Payments"
      description="All incoming payments from candidates and clients"
      table={table}
    />
  );
}

function ReceiptCell({
  payment,
  onUpload,
  onRemove,
  onDownload,
  uploadPending,
  removePending,
}: {
  payment: any;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onDownload: () => void;
  uploadPending: boolean;
  removePending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasReceipt = !!payment.receiptDocument;

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadPending}
        className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        <Upload className="h-3 w-3" />
        {hasReceipt ? 'Заменить' : 'Загрузить чек'}
      </button>
      {hasReceipt && (
        <>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Download className="h-3 w-3" />
            Скачать чек
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={removePending}
            className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-700 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Удалить чек
          </button>
        </>
      )}
    </div>
  );
}
