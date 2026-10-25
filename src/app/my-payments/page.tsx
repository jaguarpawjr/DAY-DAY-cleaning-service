import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MyPaymentsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect('/login');
  const supabase = await createClient();
  const { data: client } = await supabase.from('clients').select('id').ilike('email', user.email || '').maybeSingle();
  const [{ data: invoices }, { data: payments }, { data: bookings }] = await Promise.all([
    client ? supabase.from('invoices').select('id, invoice_number, issue_date, total_amount, paid_amount, balance_due, status').eq('client_id', client.id).order('issue_date', { ascending: false }) : Promise.resolve({ data: [] }),
    client ? supabase.from('payments').select('id, payment_ref, amount, payment_date, payment_method, reference_number, status, paystack_reference').eq('client_id', client.id).order('payment_date', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('bookings').select('id, booking_ref, preferred_date, quoted_price, status').ilike('customer_email', user.email || '').order('created_at', { ascending: false }),
  ]);

  return (
    <DashboardLayout profile={profile}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div><h1 className="text-2xl font-extrabold text-slate-900">My Payment History</h1><p className="mt-1 text-xs text-slate-500">Your bookings, invoices, balances, and payment references.</p></div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-slate-900">Invoices</h2>{!invoices?.length ? <p className="text-xs text-slate-500">No invoices found.</p> : <div className="space-y-2">{invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="font-mono font-bold text-blue-600">{invoice.invoice_number}</span><span>{formatDate(invoice.issue_date)}</span><span>Total {formatCurrency(invoice.total_amount)}</span><span className="font-bold text-emerald-700">Paid {formatCurrency(invoice.paid_amount)}</span><span className="font-bold text-amber-700">Due {formatCurrency(invoice.balance_due)}</span><span className="capitalize">{invoice.status.replace('_', ' ')}</span></div>)}</div>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-slate-900">Payments</h2>{!payments?.length ? <div className="py-8 text-center text-xs text-slate-500"><CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />No payments found.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b text-[10px] uppercase text-slate-500"><tr><th className="px-2 py-3">Reference</th><th className="px-2 py-3">Date</th><th className="px-2 py-3">Method</th><th className="px-2 py-3">Amount</th><th className="px-2 py-3">Status</th></tr></thead><tbody className="divide-y">{payments.map((payment) => <tr key={payment.id}><td className="px-2 py-3 font-mono text-blue-600">{payment.paystack_reference || payment.reference_number || payment.payment_ref}</td><td className="px-2 py-3">{formatDate(payment.payment_date)}</td><td className="px-2 py-3 capitalize">{payment.payment_method.replace('_', ' ')}</td><td className="px-2 py-3 font-bold">{formatCurrency(payment.amount)}</td><td className="px-2 py-3 capitalize">{payment.status.replace('_', ' ')}</td></tr>)}</tbody></table></div>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-slate-900">Bookings</h2>{!bookings?.length ? <p className="text-xs text-slate-500">No bookings found.</p> : <div className="space-y-2">{bookings.map((booking) => <div key={booking.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="font-mono font-bold text-blue-600">{booking.booking_ref}</span><span>{formatDate(booking.preferred_date)}</span><span>{formatCurrency(booking.quoted_price)}</span><span className="capitalize">{booking.status}</span></div>)}</div>}</section>
      </div>
    </DashboardLayout>
  );
}
