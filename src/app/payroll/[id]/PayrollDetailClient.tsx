'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Payroll, PayrollItem } from '@/types/database';

interface Props {
  payroll: Payroll;
  items: PayrollItem[];
}

export default function PayrollDetailClient({ payroll, items }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(payroll.status);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'mark_paid') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/payroll/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payroll_id: payroll.id, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payroll');

      setStatus(data.status);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          href="/payroll"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Payroll Batches
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {payroll.payroll_ref}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Payroll Period: {payroll.period_month}/{payroll.period_year}
              </h1>
              <span
                className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'approved'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{payroll.notes || 'Monthly salary calculation'}</p>
          </div>

          <div className="flex items-center gap-2">
            {status === 'draft' && (
              <button
                onClick={() => handleAction('approve')}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Processing...' : 'Approve Payroll'}</span>
              </button>
            )}

            {status === 'approved' && (
              <button
                onClick={() => handleAction('mark_paid')}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Processing...' : 'Disburse & Mark Paid (MoMo / Bank)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Gross Salaries & Allowances</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(payroll.total_gross)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-red-600">Total Deductions</span>
          <p className="text-xl font-bold text-red-600 mt-1">-{formatCurrency(payroll.total_deductions)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600">Total Net Disbursed</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(payroll.total_net)}</p>
        </div>
      </div>

      {/* Individual Employee Payslip Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Employee Salary Line Items ({items.length} Staff Members)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Job Title</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-right">Allowances</th>
                <th className="py-3 px-4 text-right">Overtime / Bonus</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{it.employee?.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{it.employee?.employee_id}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{it.employee?.job_title}</td>
                  <td className="py-3.5 px-4 text-right">{formatCurrency(it.basic_salary)}</td>
                  <td className="py-3.5 px-4 text-right text-blue-600 font-semibold">
                    +{formatCurrency(it.allowances)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-600">
                    +{formatCurrency(Number(it.overtime_pay) + Number(it.bonus))}
                  </td>
                  <td className="py-3.5 px-4 text-right text-red-600">
                    -{formatCurrency(it.deductions)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                    {formatCurrency(it.net_salary)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                        it.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {it.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
