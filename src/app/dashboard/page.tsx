import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardClient from './DashboardClient';
import { Invoice, Expense, Job, Booking, Client, Employee } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const isAdmin = profile.role === 'admin';

  let invoices: Invoice[] = [];
  let expenses: Expense[] = [];
  let jobs: Job[] = [];
  let bookings: Booking[] = [];
  let clients: Client[] = [];
  let employees: Employee[] = [];
  let lowStockCount = 0;
  let pendingExpensesCount = 0;
  let unresolvedComplaintsCount = 0;
  let myJobs: Job[] = [];

  try {
    if (isAdmin) {
      // Admin queries
      const [
        invoicesRes,
        expensesRes,
        jobsRes,
        bookingsRes,
        clientsRes,
        employeesRes,
        inventoryRes,
        complaintsRes,
      ] = await Promise.all([
        supabase.from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date_incurred', { ascending: false }),
        supabase.from('jobs').select('*, service:services(*), client:clients(*)').order('scheduled_date', { ascending: false }),
        supabase.from('bookings').select('*, service:services(*)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('inventory_items').select('id, quantity_on_hand, minimum_stock_level'),
        supabase.from('complaints').select('id, status').in('status', ['open', 'investigating']),
      ]);

      invoices = (invoicesRes.data as Invoice[]) || [];
      expenses = (expensesRes.data as Expense[]) || [];
      jobs = (jobsRes.data as Job[]) || [];
      bookings = (bookingsRes.data as Booking[]) || [];
      clients = (clientsRes.data as Client[]) || [];
      employees = (employeesRes.data as Employee[]) || [];

      // Calculate low stock items
      if (inventoryRes.data) {
        lowStockCount = inventoryRes.data.filter(
          (item) => Number(item.quantity_on_hand) <= Number(item.minimum_stock_level)
        ).length;
      }

      // Pending expenses count
      pendingExpensesCount = expenses.filter((e) => e.status === 'pending').length;

      // Unresolved complaints count
      unresolvedComplaintsCount = complaintsRes.data?.length || 0;
    } else {
      // Employee queries: Fetch their employee record and assigned jobs
      const { data: empRecord } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (empRecord) {
        const { data: assignedJobsData } = await supabase
          .from('job_workers')
          .select('job:jobs(*, service:services(*), client:clients(*))')
          .eq('employee_id', empRecord.id);

        if (assignedJobsData) {
          myJobs = assignedJobsData
            .map((item: any) => item.job)
            .filter(Boolean) as Job[];
        }
      }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }

  return (
    <DashboardLayout profile={profile}>
      <DashboardClient
        profile={profile}
        initialData={{
          invoices,
          expenses,
          jobs,
          bookings,
          clients,
          employees,
          lowStockCount,
          pendingExpensesCount,
          unresolvedComplaintsCount,
          myJobs,
        }}
      />
    </DashboardLayout>
  );
}
