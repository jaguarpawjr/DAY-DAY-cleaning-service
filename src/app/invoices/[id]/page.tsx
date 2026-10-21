import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InvoiceViewClient from './InvoiceViewClient';
import { Invoice, InvoiceItem, Payment, CompanySettings } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();

  const [invRes, itemsRes, paymentsRes, settingsRes] = await Promise.all([
    supabase.from('invoices').select('*, client:clients(*), job:jobs(*)').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id),
    supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: false }),
    supabase.from('company_settings').select('*').single(),
  ]);

  if (invRes.error || !invRes.data) {
    notFound();
  }

  const invoice = invRes.data as Invoice;
  const items = (itemsRes.data as InvoiceItem[]) || [];
  const payments = (paymentsRes.data as Payment[]) || [];
  const settings = (settingsRes.data as CompanySettings) || null;

  return (
    <DashboardLayout profile={profile}>
      <InvoiceViewClient
        invoice={invoice}
        items={items}
        payments={payments}
        settings={settings}
      />
    </DashboardLayout>
  );
}
