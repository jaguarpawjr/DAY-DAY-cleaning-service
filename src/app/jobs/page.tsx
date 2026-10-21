import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Briefcase, Plus, Calendar, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Job } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const isAdmin = profile.role === 'admin';

  let jobs: Job[] = [];

  if (isAdmin) {
    const { data } = await supabase
      .from('jobs')
      .select('*, client:clients(*), service:services(*), assigned_workers:job_workers(employee:employees(*))')
      .order('scheduled_date', { ascending: false });

    jobs = (data as Job[]) || [];
  } else {
    // If employee, get their assigned jobs
    const { data: empRecord } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (empRecord) {
      const { data } = await supabase
        .from('job_workers')
        .select('job:jobs(*, client:clients(*), service:services(*), assigned_workers:job_workers(employee:employees(*)))')
        .eq('employee_id', empRecord.id);

      if (data) {
        jobs = data.map((d: any) => d.job).filter(Boolean) as Job[];
      }
    }
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Cleaning Jobs & Field Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active cleaning assignments, field crew dispatch, and quality inspections.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Job</span>
            </Link>
          )}
        </div>

        {/* Jobs List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {jobs.length} Cleaning Jobs Recorded
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No cleaning jobs found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Approved bookings or newly created assignments will be listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Job Number</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Service & Location</th>
                    <th className="py-3 px-4">Scheduled Date & Time</th>
                    <th className="py-3 px-4">Crew Assigned</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {jobs.map((job) => {
                    const crewCount = job.assigned_workers?.length || 0;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {job.job_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{job.client?.name}</p>
                          <p className="text-[11px] text-slate-400">{job.client?.phone}</p>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-800">{job.service?.name}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            📍 {job.location}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">
                            {formatDate(job.scheduled_date)}
                          </p>
                          <p className="text-[11px] text-slate-500">{job.scheduled_start_time}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {crewCount} {crewCount === 1 ? 'Cleaner' : 'Cleaners'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatCurrency(job.agreed_price)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : job.status === 'assigned'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {job.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Open Details &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
