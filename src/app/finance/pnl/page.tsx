import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PnLClient from './PnLClient';
import { Invoice, Expense, Payment, Service } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PnLPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [invoicesRes, expensesRes, paymentsRes, servicesRes] = await Promise.all([
    supabase.from('invoices').select('*, items:invoice_items(*), job:jobs(*, service:services(*))').order('issue_date', { ascending: false }),
    supabase.from('expenses').select('*').order('date_incurred', { ascending: false }),
    supabase.from('payments').select('*').eq('status', 'verified').order('payment_date', { ascending: false }),
    supabase.from('services').select('*'),
  ]);

  const invoices = (invoicesRes.data as Invoice[]) || [];
  const expenses = (expensesRes.data as Expense[]) || [];
  const payments = (paymentsRes.data as Payment[]) || [];
  const services = (servicesRes.data as Service[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <PnLClient
        invoices={invoices}
        expenses={expenses}
        payments={payments}
        services={services}
      />
    </DashboardLayout>
  );
}
