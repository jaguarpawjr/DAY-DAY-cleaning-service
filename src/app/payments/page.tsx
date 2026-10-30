import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { CreditCard, CheckCircle2, Clock, DollarSign, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Payment } from '@/types/database';
import VerifyPaystackButton from './VerifyPaystackButton';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('*, client:clients(*), invoice:invoices(*)')
    .order('payment_date', { ascending: false });

  const payments = (paymentsData as Payment[]) || [];
  const totalVerified = payments
    .filter((p) => p.status === 'verified')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Payment Transactions & Receipts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Paystack, Mobile Money, Bank Transfer, and Cash payment records with audit verification.
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Verified Cash</span>
            <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalVerified)}</span>
          </div>
        </div>

        {/* Payments Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {payments.length} Payments Recorded
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No payment records found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Payments recorded from customer invoices or bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Receipt Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date Received</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transaction Code</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {p.payment_ref}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.client?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.invoice ? (
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="font-mono text-blue-600 hover:underline"
                          >
                            {p.invoice.invoice_number}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{formatDate(p.payment_date)}</td>
                      <td className="py-3.5 px-4 uppercase font-bold text-slate-800">
                        {p.payment_method === 'paystack'
                          ? '💳 Paystack'
                          : p.payment_method === 'momo'
                            ? '📱 Mobile Money'
                            : p.payment_method === 'bank_transfer'
                              ? '🏦 Bank Transfer'
                              : '💵 Cash'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {p.reference_number || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              p.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {p.status.replace('_', ' ')}
                          </span>
                          {p.payment_method === 'paystack' && p.status !== 'verified' && (p as Payment & { paystack_reference?: string }).paystack_reference && (
                            <VerifyPaystackButton
                              reference={(p as Payment & { paystack_reference: string }).paystack_reference}
                            />
                          )}
                        </div>
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
