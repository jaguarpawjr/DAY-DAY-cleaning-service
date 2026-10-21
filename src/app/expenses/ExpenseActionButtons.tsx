'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

export default function ExpenseActionButtons({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (status: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/expenses/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_id: expenseId, status }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => handleAction('approved')}
        disabled={isLoading}
        title="Approve Expense"
        className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleAction('rejected')}
        disabled={isLoading}
        title="Reject Expense"
        className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
