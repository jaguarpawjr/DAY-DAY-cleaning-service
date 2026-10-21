import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PayrollDetailClient from './PayrollDetailClient';
import { Payroll, PayrollItem } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PayrollDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [payrollRes, itemsRes] = await Promise.all([
    supabase.from('payroll').select('*').eq('id', id).single(),
    supabase.from('payroll_items').select('*, employee:employees(*)').eq('payroll_id', id),
  ]);

  if (payrollRes.error || !payrollRes.data) {
    notFound();
  }

  const payroll = payrollRes.data as Payroll;
  const items = (itemsRes.data as PayrollItem[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <PayrollDetailClient payroll={payroll} items={items} />
    </DashboardLayout>
  );
}
