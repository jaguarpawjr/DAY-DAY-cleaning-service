import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const { job_id } = await request.json();

    if (!job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch job with client and service
    const { data: job, error: jobErr } = await adminClient
      .from('jobs')
      .select('*, client:clients(*), service:services(*)')
      .eq('id', job_id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if invoice already exists for this job
    const { data: existingInv } = await adminClient
      .from('invoices')
      .select('id, invoice_number')
      .eq('job_id', job_id)
      .maybeSingle();

    if (existingInv) {
      return NextResponse.json({
        success: true,
        invoice_id: existingInv.id,
        invoice_number: existingInv.invoice_number,
        message: 'Existing invoice already linked to this job.',
      });
    }

    // Generate Invoice Number (e.g. INV-202610-001)
    const { count } = await adminClient.from('invoices').select('*', { count: 'exact', head: true });
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const invoiceNumber = `INV-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

    const subtotal = Number(job.agreed_price) || 0;
    const taxRate = 0; // Default 0 or from company settings
    const taxAmount = 0;
    const totalAmount = subtotal;

    // Create Invoice
    const { data: invoice, error: invErr } = await adminClient
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        client_id: job.client_id,
        job_id: job.id,
        booking_id: job.booking_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_due: totalAmount,
        status: 'sent',
        payment_instructions: 'Payment via Mobile Money to 0245558899 (MTN) or Ecobank Ghana transfer.',
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Insert Invoice Item
    await adminClient.from('invoice_items').insert({
      invoice_id: invoice.id,
      description: `${job.service?.name || 'Professional Cleaning Service'} - Location: ${job.location}`,
      quantity: 1,
      unit_price: subtotal,
      total_price: subtotal,
    });

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
    });
  } catch (err: any) {
    console.error('Generate invoice error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
