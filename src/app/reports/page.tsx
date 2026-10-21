import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReportsClient from './ReportsClient';
import { Invoice, Expense, Job, Payment, Client, InventoryItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [invoicesRes, expensesRes, jobsRes, paymentsRes, clientsRes, itemsRes] = await Promise.all([
    supabase.from('invoices').select('*, client:clients(*)').order('issue_date', { ascending: false }),
    supabase.from('expenses').select('*').order('date_incurred', { ascending: false }),
    supabase.from('jobs').select('*, client:clients(*), service:services(*)').order('scheduled_date', { ascending: false }),
    supabase.from('payments').select('*, client:clients(*)').order('payment_date', { ascending: false }),
    supabase.from('clients').select('*'),
    supabase.from('inventory_items').select('*'),
  ]);

  const invoices = (invoicesRes.data as Invoice[]) || [];
  const expenses = (expensesRes.data as Expense[]) || [];
  const jobs = (jobsRes.data as Job[]) || [];
  const payments = (paymentsRes.data as Payment[]) || [];
  const clients = (clientsRes.data as Client[]) || [];
  const inventoryItems = (itemsRes.data as InventoryItem[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <ReportsClient
        invoices={invoices}
        expenses={expenses}
        jobs={jobs}
        payments={payments}
        clients={clients}
        inventoryItems={inventoryItems}
      />
    </DashboardLayout>
  );
}
