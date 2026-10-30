import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinancialLedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; method?: string; category?: string; q?: string }> }) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') redirect('/dashboard?error=unauthorized');

  const supabase = await createClient();
  const filters = await searchParams;
  let query = supabase
    .from('financial_ledger_entries')
    .select('id, entry_ref, entry_date, entry_type, category, amount, payment_method, status, reference')
    .order('entry_date', { ascending: false });
  if (filters.from) query = query.gte('entry_date', filters.from);
  if (filters.to) query = query.lte('entry_date', filters.to);
  if (filters.method) query = query.eq('payment_method', filters.method);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.q) query = query.or(`entry_ref.ilike.%${filters.q}%,reference.ilike.%${filters.q}%`);
  const { data: entries } = await query;

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Financial Ledger</h1>
          <p className="mt-1 text-xs text-slate-500">A traceable record of completed income, expenses, fees, refunds, and settlements.</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/ledger/export?${new URLSearchParams({ ...filters, format: 'xlsx' } as Record<string, string>).toString()}`}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-center text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <span>Export Excel (.xlsx)</span>
            </a>
            <a
              href={`/api/admin/ledger/export?${new URLSearchParams({ ...filters, format: 'csv' } as Record<string, string>).toString()}`}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-center text-xs font-bold text-slate-700 shadow-sm transition-colors"
            >
              <span>Export CSV</span>
            </a></div></div>
          </div>
        <form className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs sm:grid-cols-5">
          <input type="date" name="from" defaultValue={filters.from} className="rounded-lg border px-2 py-2" />
          <input type="date" name="to" defaultValue={filters.to} className="rounded-lg border px-2 py-2" />
          <input name="method" placeholder="Payment method" defaultValue={filters.method} className="rounded-lg border px-2 py-2" />
          <input name="category" placeholder="Category" defaultValue={filters.category} className="rounded-lg border px-2 py-2" />
          <button className="rounded-lg bg-slate-900 px-3 py-2 font-bold text-white">Filter</button>
        </form>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!entries?.length ? (
            <div className="p-12 text-center">
              <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-800">No ledger entries yet</p>
              <p className="mt-1 text-xs text-slate-500">Completed financial transactions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{entry.entry_ref}</td>
                      <td className="px-4 py-3">{formatDate(entry.entry_date)}</td>
                      <td className="px-4 py-3 capitalize">{entry.entry_type}</td>
                      <td className="px-4 py-3">{entry.category.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3 capitalize">{entry.payment_method?.replaceAll('_', ' ') || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(entry.amount)}</td>
                      <td className="px-4 py-3 capitalize">{entry.status}</td>
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
