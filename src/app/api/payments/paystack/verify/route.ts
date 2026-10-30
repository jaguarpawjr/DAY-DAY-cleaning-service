import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyPaymentReceived } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Paystack is not configured' }, { status: 503 });

    const body = await request.json();
    const reference = body?.reference;
    const optionalInvoiceId = body?.invoice_id;

    if (typeof reference !== 'string' || !reference.trim()) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    const trimmedRef = reference.trim();
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(trimmedRef)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = await response.json();

    if (!response.ok || !result.status || result.data?.status !== 'success') {
      return NextResponse.json({
        status: result.data?.status || 'pending',
        message: result.message || 'Transaction was not successful or still pending on Paystack.',
      }, { status: 202 });
    }

    const data = result.data;
    const client = createAdminClient();

    // Look up existing payment by paystack_reference or reference_number
    let { data: payment, error: paymentError } = await client
      .from('payments')
      .select('id, payment_ref, status, invoice_id, client_id, amount')
      .or(`paystack_reference.eq.${trimmedRef},reference_number.eq.${trimmedRef}`)
      .maybeSingle();

    if (paymentError) throw paymentError;

    // If no payment record found yet in DB, create one automatically from verified Paystack data
    if (!payment) {
      const targetInvoiceId = optionalInvoiceId || data.metadata?.invoice_id || null;
      let targetClientId = data.metadata?.client_id || null;

      if (targetInvoiceId && !targetClientId) {
        const { data: inv } = await client.from('invoices').select('client_id').eq('id', targetInvoiceId).maybeSingle();
        if (inv) targetClientId = inv.client_id;
      }

      if (!targetClientId && data.customer?.email) {
        const { data: cl } = await client.from('clients').select('id').ilike('email', data.customer.email).maybeSingle();
        if (cl) targetClientId = cl.id;
      }

      if (!targetClientId) {
        const { data: fallbackClient } = await client.from('clients').select('id').limit(1).maybeSingle();
        targetClientId = fallbackClient?.id;
      }

      if (targetClientId) {
        const { count } = await client.from('payments').select('*', { count: 'exact', head: true });
        const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
        const paymentRef = `PAY-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;
        const amountGhc = Number(data.amount || 0) / 100;

        const { data: newPay, error: insertError } = await client.from('payments').insert({
          payment_ref: paymentRef,
          invoice_id: targetInvoiceId,
          client_id: targetClientId,
          amount: amountGhc,
          payment_date: (data.paid_at || new Date().toISOString()).split('T')[0],
          payment_method: 'paystack',
          reference_number: trimmedRef,
          paystack_reference: trimmedRef,
          paystack_status: data.status,
          paystack_fee: Number(data.fees || 0) / 100,
          paystack_channel: data.channel || 'card',
          paystack_paid_at: data.paid_at || new Date().toISOString(),
          status: 'verified',
          verified_at: new Date().toISOString(),
        }).select().single();

        if (insertError) throw insertError;
        payment = newPay;
      } else {
        return NextResponse.json({ error: 'Payment verified on Paystack but no matching client found.' }, { status: 404 });
      }
    } else {
      // Payment record exists, ensure it is verified and linked
      const updates: any = {
        status: 'verified',
        paystack_reference: trimmedRef,
        paystack_status: data.status,
        paystack_fee: Number(data.fees || 0) / 100,
        paystack_channel: data.channel || null,
        paystack_paid_at: data.paid_at || new Date().toISOString(),
        verified_at: new Date().toISOString(),
      };
      if (optionalInvoiceId && !payment.invoice_id) {
        updates.invoice_id = optionalInvoiceId;
        payment.invoice_id = optionalInvoiceId;
      }

      const { error: updateError } = await client.from('payments').update(updates).eq('id', payment.id);
      if (updateError) throw updateError;
    }

    if (!payment) {
      return NextResponse.json({ error: 'Unable to process payment record' }, { status: 500 });
    }

    let updatedInvoice = null;
    let allInvoicePayments: any[] = [];

    // Sync invoice balances
    const activeInvoiceId = payment.invoice_id || optionalInvoiceId;
    if (activeInvoiceId) {
      const { data: invoice, error: invoiceError } = await client
        .from('invoices')
        .select('id, total_amount, client_id')
        .eq('id', activeInvoiceId)
        .single();

      if (!invoiceError && invoice) {
        const { data: verifiedPayments } = await client
          .from('payments')
          .select('*')
          .eq('invoice_id', activeInvoiceId)
          .eq('status', 'verified')
          .order('payment_date', { ascending: false });

        allInvoicePayments = verifiedPayments || [];
        const paidAmount = allInvoicePayments.reduce((sum, item) => sum + Number(item.amount), 0);
        const balanceDue = Math.max(0, Number(invoice.total_amount) - paidAmount);
        const newStatus = balanceDue === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'sent');

        const { data: invUpdated } = await client
          .from('invoices')
          .update({
            paid_amount: paidAmount,
            balance_due: balanceDue,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeInvoiceId)
          .select('*, client:clients(*), job:jobs(*)')
          .single();

        updatedInvoice = invUpdated;

        // Keep client outstanding balance updated
        const { data: clientInvoices } = await client
          .from('invoices')
          .select('balance_due')
          .eq('client_id', invoice.client_id);

        if (clientInvoices) {
          const totalOutstanding = clientInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
          await client
            .from('clients')
            .update({
              outstanding_balance: totalOutstanding,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.client_id);
        }
      }
    }

    // Record in ledger
    try {
      const { data: existingLedger } = await client
        .from('financial_ledger_entries')
        .select('id')
        .eq('payment_id', payment.id)
        .eq('entry_type', 'income')
        .eq('status', 'completed')
        .maybeSingle();

      if (!existingLedger) {
        await client.from('financial_ledger_entries').insert({
          entry_ref: `PAYSTACK-${trimmedRef}`,
          entry_type: 'income',
          category: 'customer_payment',
          amount: Number(data.amount || 0) / 100,
          payment_method: 'paystack',
          account_name: 'Paystack',
          status: 'completed',
          reference: trimmedRef,
          payment_id: payment.id,
        });
      }
    } catch (ledgerError) {
      console.warn('Financial ledger entry insertion warning:', ledgerError);
    }

    // Notify Customer & Alert Admin
    try {
      let clientData = updatedInvoice?.client;
      if (!clientData && payment.client_id) {
        const { data: cl } = await client
          .from('clients')
          .select('name, email, phone')
          .eq('id', payment.client_id)
          .maybeSingle();
        clientData = cl;
      }

      await notifyPaymentReceived({
        paymentRef: payment.payment_ref || `PAY-${trimmedRef}`,
        amount: Number(data.amount || 0) / 100,
        paymentMethod: 'paystack',
        referenceNumber: trimmedRef,
        customerName: clientData?.name || data.customer?.first_name || 'Customer',
        customerEmail: clientData?.email || data.customer?.email || null,
        customerPhone: clientData?.phone || data.customer?.phone || null,
        invoiceNumber: updatedInvoice?.invoice_number || null,
        invoiceId: activeInvoiceId || null,
        balanceDue: updatedInvoice?.balance_due ?? null,
      });
    } catch (notifErr) {
      console.warn('Paystack payment verification notification warning:', notifErr);
    }

    return NextResponse.json({
      status: 'verified',
      reference: trimmedRef,
      payment,
      updatedInvoice,
      payments: allInvoicePayments,
    });
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return NextResponse.json({ error: error.message || 'Unable to verify Paystack payment' }, { status: 500 });
  }
}
