import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const {
      invoice_id,
      client_id,
      amount,
      payment_method, // 'momo' | 'bank_transfer' | 'cash'
      reference_number,
      notes,
    } = body;

    const numericAmount = parseFloat(amount);
    if (!client_id || !numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: 'Valid client and positive amount required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Generate Payment Reference (e.g. PAY-202610-001)
    const { count } = await adminClient.from('payments').select('*', { count: 'exact', head: true });
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const paymentRef = `PAY-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

    // Insert payment with verified status
    const { data: payment, error: payErr } = await adminClient
      .from('payments')
      .insert({
        payment_ref: paymentRef,
        invoice_id: invoice_id || null,
        client_id,
        amount: numericAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'momo',
        reference_number: reference_number || null,
        notes: notes || null,
        status: 'verified', // Auto verified by administrator
        recorded_by: admin.id,
        verified_by: admin.id,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payErr) throw payErr;

    // Trigger will automatically update invoice and client balance

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: admin.id,
      action: 'RECORD_PAYMENT',
      entity: 'payments',
      entity_id: payment.id,
      new_data: { payment_ref: paymentRef, amount: numericAmount, invoice_id },
    });

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    console.error('Record payment error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
