import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JobDetailClient from './JobDetailClient';
import { Job, JobPhoto, Invoice } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  const [jobRes, photosRes, invoiceRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, client:clients(*), service:services(*), assigned_workers:job_workers(*, employee:employees(*))')
      .eq('id', id)
      .single(),
    supabase.from('job_photos').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('job_id', id).maybeSingle(),
  ]);

  if (jobRes.error || !jobRes.data) {
    notFound();
  }

  const job = jobRes.data as Job;
  const photos = (photosRes.data as JobPhoto[]) || [];
  const invoice = (invoiceRes.data as Invoice) || null;

  return (
    <DashboardLayout profile={profile}>
      <JobDetailClient
        job={job}
        photos={photos}
        invoice={invoice}
        profile={profile}
      />
    </DashboardLayout>
  );
}
