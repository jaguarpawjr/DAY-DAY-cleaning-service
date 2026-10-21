import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { FileText, Plus, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .order('issue_date', { ascending: false });

  const invoices = (invoicesData as Invoice[]) || [];

  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Invoices & Billing Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Issue branded invoices, track partial payments, and manage accounts receivable.
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </Link>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced (Revenue)</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Collected Cash</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Outstanding Receivables</span>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {invoices.length} Invoices Issued
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No invoices issued yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Generate an invoice directly from a cleaning job or create a bespoke bill.
              </p>
              <Link
                href="/invoices/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Create First Invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.client?.name}
                      </td>
                      <td className="py-3.5 px-4">{formatDate(inv.issue_date)}</td>
                      <td className="py-3.5 px-4">{formatDate(inv.due_date)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span
                          className={
                            Number(inv.balance_due) > 0 ? 'text-red-600' : 'text-emerald-600'
                          }
                        >
                          {formatCurrency(inv.balance_due)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View & Pay &rarr;
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
