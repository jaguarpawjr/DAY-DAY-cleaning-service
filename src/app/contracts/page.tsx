import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { FileText, Plus, Calendar, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Contract } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: contractsData } = await supabase
    .from('contracts')
    .select('*, client:clients(*), service:services(*)')
    .order('created_at', { ascending: false });

  const contracts = (contractsData as Contract[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Service Contracts & Recurring Agreements
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Recurring commercial office, clinic, and residential estate contracts.
            </p>
          </div>
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Contract</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {contracts.length} Service Contracts
            </span>
          </div>

          {contracts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No recurring contracts created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Contract Ref</th>
                    <th className="py-3 px-4">Title & Client</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4 text-right">Price per Period</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {c.contract_ref}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.client?.name}</p>
                      </td>
                      <td className="py-3.5 px-4">{c.service?.name}</td>
                      <td className="py-3.5 px-4 capitalize font-semibold text-slate-800">
                        {c.frequency}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(c.price_per_period)}
                      </td>
                      <td className="py-3.5 px-4">
                        {formatDate(c.start_date)} to {formatDate(c.end_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
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
