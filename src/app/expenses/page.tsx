import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { TrendingUp, Plus, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Expense } from '@/types/database';
import ExpenseActionButtons from './ExpenseActionButtons';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const isAdmin = profile.role === 'admin';

  let query = supabase
    .from('expenses')
    .select('*, supplier:suppliers(*)')
    .order('date_incurred', { ascending: false });

  // If employee, view only own submitted expenses
  if (!isAdmin) {
    query = query.eq('submitted_by', user.id);
  }

  const { data: expensesData } = await query;
  const expenses = (expensesData as Expense[]) || [];

  const totalApproved = expenses
    .filter((e) => e.status === 'approved' || e.status === 'paid')
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalPending = expenses
    .filter((e) => e.status === 'pending')
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Operating Expenses Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track cleaning materials, fuel & transport, machinery repairs, and overhead operating costs.
            </p>
          </div>
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </Link>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Recognized Approved Expenses</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalApproved)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-amber-600">Pending Review</span>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {expenses.length} Expense Records
            </span>
          </div>

          {expenses.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No expenses recorded</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Record receipts for detergents, petrol, employee allowances, or equipment.
              </p>
              <Link
                href="/expenses/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Record First Expense
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Expense #</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4 text-right">Amount (GH₵)</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Approval Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {exp.expense_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{exp.description}</p>
                        {exp.supplier && (
                          <p className="text-[11px] text-slate-400">Supplier: {exp.supplier.name}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {exp.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{formatDate(exp.date_incurred)}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-600">{exp.submitter?.full_name || 'Admin'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.status === 'approved' || exp.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : exp.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          {exp.status === 'pending' ? (
                            <ExpenseActionButtons expenseId={exp.id} />
                          ) : (
                            <span className="text-slate-400 text-[10px]">Processed</span>
                          )}
                        </td>
                      )}
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
