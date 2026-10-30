import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyPaymentReceived } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const {
      invoice_id,
      client_id,
      amount,
      payment_method, // 'momo' | 'bank_transfer' | 'cash' | 'paystack'
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

    let updatedInvoice = null;
    let allInvoicePayments: any[] = [];

    if (invoice_id) {
      const { data: invoice, error: invoiceError } = await adminClient
        .from('invoices')
        .select('id, total_amount, client_id')
        .eq('id', invoice_id)
        .single();
      if (invoiceError) throw invoiceError;

      const { data: verifiedPayments, error: verifiedPaymentsError } = await adminClient
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice_id)
        .eq('status', 'verified')
        .order('payment_date', { ascending: false });
      if (verifiedPaymentsError) throw verifiedPaymentsError;

      allInvoicePayments = verifiedPayments || [];
      const paidAmount = allInvoicePayments.reduce((sum, item) => sum + Number(item.amount), 0);
      const balanceDue = Math.max(0, Number(invoice.total_amount) - paidAmount);
      const newStatus = balanceDue === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'sent');

      const { data: updatedInv, error: invoiceUpdateError } = await adminClient
        .from('invoices')
        .update({
          paid_amount: paidAmount,
          balance_due: balanceDue,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice_id)
        .select('*, client:clients(*), job:jobs(*)')
        .single();
      if (invoiceUpdateError) throw invoiceUpdateError;

      updatedInvoice = updatedInv;
    }

    // Always keep client's billing and total outstanding balance completely accurate
    const { data: clientInvoices } = await adminClient
      .from('invoices')
      .select('balance_due')
      .eq('client_id', client_id);

    if (clientInvoices && clientInvoices.length > 0) {
      const totalOutstanding = clientInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      await adminClient
        .from('clients')
        .update({
          outstanding_balance: totalOutstanding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client_id);
    } else {
      // If no invoices or direct payment, reduce client outstanding balance
      const { data: clientRec } = await adminClient
        .from('clients')
        .select('outstanding_balance')
        .eq('id', client_id)
        .single();
      if (clientRec) {
        const newBalance = Math.max(0, Number(clientRec.outstanding_balance || 0) - numericAmount);
        await adminClient
          .from('clients')
          .update({
            outstanding_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client_id);
      }
    }

    // Record in financial ledger if available
    try {
      await adminClient.from('financial_ledger_entries').insert({
        entry_ref: `LEDGER-${paymentRef}`,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'income',
        category: 'customer_payment',
        amount: numericAmount,
        payment_method: payment_method || 'momo',
        account_name: payment_method === 'momo' ? 'Mobile Money' : payment_method === 'bank_transfer' ? 'Bank' : 'Cash',
        status: 'completed',
        reference: reference_number || paymentRef,
        payment_id: payment.id,
        recorded_by: admin.id,
      });
    } catch (ledgerErr) {
      console.warn('Ledger entry insertion non-fatal warning:', ledgerErr);
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: admin.id,
      action: 'RECORD_PAYMENT',
      entity: 'payments',
      entity_id: payment.id,
      new_data: { payment_ref: paymentRef, amount: numericAmount, invoice_id },
    });

    // Notify customer and alert admin
    try {
      const { data: clientInfo } = await adminClient
        .from('clients')
        .select('name, email, phone')
        .eq('id', client_id)
        .single();

      await notifyPaymentReceived({
        paymentRef: paymentRef,
        amount: numericAmount,
        paymentMethod: payment_method || 'momo',
        referenceNumber: reference_number || null,
        customerName: clientInfo?.name || 'Valued Customer',
        customerEmail: clientInfo?.email || null,
        customerPhone: clientInfo?.phone || null,
        invoiceNumber: updatedInvoice?.invoice_number || null,
        invoiceId: invoice_id || null,
        balanceDue: updatedInvoice?.balance_due ?? null,
      });
    } catch (notifError) {
      console.warn('Payment notification warning:', notifError);
    }

    return NextResponse.json({
      success: true,
      payment,
      updatedInvoice,
      payments: allInvoicePayments,
    });
  } catch (err: any) {
    console.error('Record payment error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
