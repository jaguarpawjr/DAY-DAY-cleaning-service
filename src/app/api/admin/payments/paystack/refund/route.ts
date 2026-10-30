import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { paystack } from '@/lib/paystack';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const { payment_id, reference, amount, reason } = body;

    const client = createAdminClient();

    let payment = null;
    if (payment_id) {
      const { data, error } = await client.from('payments').select('*').eq('id', payment_id).single();
      if (error || !data) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      payment = data;
    } else if (reference) {
      const { data, error } = await client.from('payments').select('*').eq('paystack_reference', reference).single();
      if (error || !data) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      payment = data;
    } else {
      return NextResponse.json({ error: 'payment_id or reference required' }, { status: 400 });
    }

    if (!payment.paystack_reference) {
      return NextResponse.json({ error: 'Cannot refund non-Paystack payment' }, { status: 400 });
    }

    const refundAmount = amount ? Number(amount) : Number(payment.amount);
    const amountInPesewas = Math.round(refundAmount * 100);

    // Call Paystack API
    const refundRes = await paystack.createRefund({
      transaction: payment.paystack_reference,
      amount: amountInPesewas,
      merchant_note: reason || 'Admin initiated customer refund',
      customer_note: 'Refund processed for cleaning service',
    });

    // Update payment
    await client
      .from('payments')
      .update({
        status: 'refunded',
        paystack_status: 'refunded',
      })
      .eq('id', payment.id);

    // Ingest into Financial Ledger
    const entryRef = `REFUND-${payment.paystack_reference}-${Date.now()}`;
    await client.from('financial_ledger_entries').insert({
      entry_ref: entryRef,
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'refund',
      category: 'customer_refund',
      amount: refundAmount,
      payment_method: 'paystack',
      account_name: 'Paystack Customer Refund',
      status: 'completed',
      reference: payment.paystack_reference,
      payment_id: payment.id,
      recorded_by: admin.id,
      approved_by: admin.id,
    });

    await client.from('audit_logs').insert({
      user_id: admin.id,
      action: 'PROCESS_PAYSTACK_REFUND',
      entity: 'payments',
      entity_id: payment.id,
      new_data: { refundAmount, reference: payment.paystack_reference },
    });

    return NextResponse.json({
      success: true,
      message: 'Refund processed and ledger updated',
      refund: refundRes.data,
    });
  } catch (error: any) {
    console.error('Process refund error:', error);
    return NextResponse.json({ error: error.message || 'Refund processing failed' }, { status: 500 });
  }
}
