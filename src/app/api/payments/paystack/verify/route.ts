import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Paystack is not configured' }, { status: 503 });
    const { reference } = await request.json();
    if (typeof reference !== 'string' || !reference.trim()) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = await response.json();
    if (!response.ok || !result.status || result.data?.status !== 'success') {
      return NextResponse.json({ status: result.data?.status || 'pending' }, { status: 202 });
    }

    const data = result.data;
    const client = createAdminClient();
    const { data: payment, error: paymentError } = await client
      .from('payments')
      .select('id, status')
      .eq('paystack_reference', reference.trim())
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });

    if (payment.status !== 'verified') {
      const { error } = await client.from('payments').update({
        status: 'verified',
        paystack_status: data.status,
        paystack_fee: Number(data.fees || 0) / 100,
        paystack_channel: data.channel || null,
        paystack_paid_at: data.paid_at || new Date().toISOString(),
        verified_at: new Date().toISOString(),
      }).eq('id', payment.id);
      if (error) throw error;
    }
    const { data: existingLedger, error: ledgerLookupError } = await client
      .from('financial_ledger_entries')
      .select('id')
      .eq('payment_id', payment.id)
      .eq('entry_type', 'income')
      .eq('status', 'completed')
      .maybeSingle();
    if (ledgerLookupError) throw ledgerLookupError;
    if (!existingLedger) {
      const { error } = await client.from('financial_ledger_entries').insert({
        entry_ref: `PAYSTACK-${reference.trim()}`,
        entry_type: 'income',
        category: 'customer_payment',
        amount: Number(data.amount || 0) / 100,
        payment_method: 'paystack',
        account_name: 'Paystack',
        status: 'completed',
        reference: reference.trim(),
        payment_id: payment.id,
      });
      if (error) throw error;
    }
    return NextResponse.json({ status: 'verified', reference: reference.trim() });
  } catch (error) {
    console.error('Paystack verification error:', error);
    return NextResponse.json({ error: 'Unable to verify Paystack payment' }, { status: 500 });
  }
}
