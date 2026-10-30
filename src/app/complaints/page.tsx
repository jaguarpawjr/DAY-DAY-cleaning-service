import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { MessageSquareWarning, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Complaint } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ComplaintsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: complaintsData } = await supabase
    .from('complaints')
    .select('*, client:clients(*), job:jobs(*)')
    .order('created_at', { ascending: false });

  const complaints = (complaintsData as Complaint[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer Complaints & Quality Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quality assurance, customer feedback tracking, and satisfaction guarantees.
            </p>
          </div>
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Quality Ticket</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {complaints.length} Quality Control Tickets
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              No open customer complaints.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Ticket Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Related Job</th>
                    <th className="py-3 px-4">Date Logged</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                        {c.ticket_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{c.client?.name}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-800">{c.subject}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.description}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-blue-600">
                        {c.job?.job_number || 'General Feedback'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(c.created_at)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.priority === 'urgent' || c.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'resolved' || c.status === 'closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800 animate-pulse'
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
