import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { History, ArrowLeft, Package, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StockMovement } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function StockMovementsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: movementsData } = await supabase
    .from('stock_movements')
    .select('*, item:inventory_items(*)')
    .order('created_at', { ascending: false });

  const movements = (movementsData as StockMovement[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Stock Movement Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Permanent historical ledger of inventory additions, job issues, and write-offs.
              </p>
            </div>
            <Link
              href="/inventory/adjust"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record Stock Movement</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {movements.length} Audit Entries
            </span>
          </div>

          {movements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Item SKU / Name</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Qty Adjusted</th>
                    <th className="py-3 px-4 text-right">Previous &rarr; New</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(m.created_at, true)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-blue-600 font-bold mr-1.5">{m.item?.sku}</span>
                        <span className="font-semibold text-slate-900">{m.item?.name}</span>
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.movement_type === 'purchase' || m.movement_type === 'return'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.movement_type === 'issue_to_job'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.movement_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.item?.unit_of_measure}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                        {m.previous_quantity} &rarr; <strong className="text-slate-800">{m.new_quantity}</strong>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {m.reference_id || '—'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">{m.reason}</td>
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
