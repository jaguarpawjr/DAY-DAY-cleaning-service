import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Banknote, Plus, CheckCircle2, Clock, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Payroll } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PayrollPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: payrollData } = await supabase
    .from('payroll')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  const payrollBatches = (payrollData as Payroll[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Staff Payroll & Salary Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Monthly payroll preparation, salary advances, allowances, and approved payslip disbursement.
            </p>
          </div>
          <Link
            href="/payroll/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Payroll Period</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {payrollBatches.length} Payroll Periods Recorded
            </span>
          </div>

          {payrollBatches.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No payroll batches generated yet. Click &ldquo;Generate New Payroll Period&rdquo; to prepare salaries.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Period Ref</th>
                    <th className="py-3 px-4">Month / Year</th>
                    <th className="py-3 px-4 text-right">Total Gross</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {payrollBatches.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {p.payroll_ref}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.period_month}/{p.period_year}
                      </td>
                      <td className="py-3.5 px-4 text-right">{formatCurrency(p.total_gross)}</td>
                      <td className="py-3.5 px-4 text-right text-red-600">
                        -{formatCurrency(p.total_deductions)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.total_net)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/payroll/${p.id}`}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
