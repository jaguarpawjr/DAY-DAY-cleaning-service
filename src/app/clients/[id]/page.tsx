import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  CreditCard,
  Plus,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Client, Job, Invoice, Payment } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [clientRes, jobsRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*, service:services(*)').eq('client_id', id).order('scheduled_date', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', id).order('issue_date', { ascending: false }),
    supabase.from('payments').select('*').eq('client_id', id).order('payment_date', { ascending: false }),
  ]);

  if (clientRes.error || !clientRes.data) {
    notFound();
  }

  const client = clientRes.data as Client;
  const jobs = (jobsRes.data as Job[]) || [];
  const invoices = (invoicesRes.data as Invoice[]) || [];
  const payments = (paymentsRes.data as Payment[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Back and Header */}
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients CRM
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{client.name}</h1>
                <span className="capitalize px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {client.client_type}
                </span>
              </div>
              {client.company_name && (
                <p className="text-sm font-semibold text-slate-500">{client.company_name}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/jobs/new?client_id=${client.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Job
              </Link>
              <Link
                href={`/invoices/new?client_id=${client.id}`}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Create Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Client Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Contact & Address Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold">Phone Number</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> {client.phone}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Email Address</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> {client.email || '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 font-semibold">Service Address</p>
                <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> {client.service_address}
                </p>
                {client.gps_location && (
                  <p className="text-blue-600 font-mono text-[11px] mt-1 ml-5">
                    Ghana Post GPS: {client.gps_location}
                  </p>
                )}
              </div>
              {client.notes && (
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-bold text-[11px]">Internal Notes:</p>
                  <p className="text-slate-700 mt-0.5">{client.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial summary card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Account Balance
              </h2>
              <p
                className={`text-3xl font-extrabold ${
                  Number(client.outstanding_balance) > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(client.outstanding_balance)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {Number(client.outstanding_balance) > 0
                  ? 'Outstanding pending balance due.'
                  : 'Account in good standing (0 due).'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Jobs Completed:</span>
                <span className="font-bold text-slate-800">
                  {jobs.filter((j) => j.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Invoices Issued:</span>
                <span className="font-bold text-slate-800">{invoices.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Cleaning Jobs History</h3>
          {jobs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No jobs scheduled yet for this client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Job Number</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Date Scheduled</th>
                    <th className="py-2.5 px-3">Agreed Price</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{job.job_number}</td>
                      <td className="py-3 px-3">{job.service?.name}</td>
                      <td className="py-3 px-3">{formatDate(job.scheduled_date)}</td>
                      <td className="py-3 px-3 font-bold">{formatCurrency(job.agreed_price)}</td>
                      <td className="py-3 px-3 capitalize">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {job.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/jobs/${job.id}`} className="text-blue-600 font-bold hover:underline">
                          View Job &rarr;
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
