import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });

  const signature = request.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        id?: number;
        reference?: string;
        status?: string;
        amount?: number;
        fees?: number;
        channel?: string;
        paid_at?: string;
        transfer_code?: string;
        transaction_reference?: string;
        reason?: string;
        dispute?: any;
      };
    };

    const eventId = String(event.data?.id || event.data?.reference || event.data?.transfer_code || crypto.randomUUID());
    if (!eventId || !event.event) return NextResponse.json({ received: true });

    const adminClient = createAdminClient();

    // Idempotent webhook event logging
    const { data: inserted, error: insertError } = await adminClient
      .from('paystack_webhook_events')
      .insert({
        event_id: eventId,
        event_type: event.event,
        paystack_reference: event.data?.reference || event.data?.transfer_code || null,
        payload: event,
      })
      .select('id')
      .maybeSingle();

    if (insertError?.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (insertError) throw insertError;
    if (!inserted) throw new Error('Unable to record Paystack webhook event');

    // 1. Successful Customer Payment
    if (event.event === 'charge.success' && event.data?.reference) {
      const { data: payment, error: paymentError } = await adminClient
        .from('payments')
        .select('id, status')
        .eq('paystack_reference', event.data.reference)
        .maybeSingle();

      if (paymentError) throw paymentError;

      if (payment && payment.status !== 'verified') {
        const feeAmount = event.data.fees ? event.data.fees / 100 : 0;
        const totalAmount = (event.data.amount || 0) / 100;

        await adminClient
          .from('payments')
          .update({
            status: 'verified',
            paystack_status: event.data.status || 'success',
            paystack_fee: feeAmount,
            paystack_channel: event.data.channel || null,
            paystack_paid_at: event.data.paid_at || new Date().toISOString(),
            verified_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Record Gross Income in Ledger
        await adminClient.from('financial_ledger_entries').insert({
          entry_ref: `PAYSTACK-${event.data.reference}`,
          entry_date: (event.data.paid_at || new Date().toISOString()).split('T')[0],
          entry_type: 'income',
          category: 'customer_payment',
          amount: totalAmount,
          payment_method: 'paystack',
          account_name: 'Paystack Operating Balance',
          status: 'completed',
          reference: event.data.reference,
          payment_id: payment.id,
        });

        // Record Gateway Processing Fee in Ledger
        if (feeAmount > 0) {
          await adminClient.from('financial_ledger_entries').insert({
            entry_ref: `FEE-PAYSTACK-${event.data.reference}`,
            entry_date: (event.data.paid_at || new Date().toISOString()).split('T')[0],
            entry_type: 'fee',
            category: 'paystack_fees',
            amount: feeAmount,
            payment_method: 'paystack',
            account_name: 'Paystack Gateway Charges',
            status: 'completed',
            reference: event.data.reference,
            payment_id: payment.id,
          });
        }
      }
    }

    // 2. Automated Refunds Ingestion
    else if (event.event === 'refund.processed') {
      const ref = event.data?.transaction_reference || event.data?.reference;
      const refundAmount = (event.data?.amount || 0) / 100;

      let paymentId: string | null = null;
      if (ref) {
        const { data: payment } = await adminClient
          .from('payments')
          .select('id')
          .eq('paystack_reference', ref)
          .maybeSingle();

        if (payment) {
          paymentId = payment.id;
          await adminClient
            .from('payments')
            .update({ status: 'refunded', paystack_status: 'refunded' })
            .eq('id', payment.id);
        }
      }

      await adminClient.from('financial_ledger_entries').insert({
        entry_ref: `REFUND-PAYSTACK-${event.data?.id || ref || Date.now()}`,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'refund',
        category: 'customer_refund',
        amount: refundAmount > 0 ? refundAmount : 1,
        payment_method: 'paystack',
        account_name: 'Paystack Refund',
        status: 'completed',
        reference: ref || 'Refund Processed',
        payment_id: paymentId,
      });
    }

    // 3. Automated Chargeback / Dispute Ingestion
    else if (event.event === 'charge.dispute.create' || event.event === 'charge.dispute.resolve') {
      const ref = event.data?.reference || event.data?.transaction_reference || 'DISPUTE';
      const disputeAmount = (event.data?.amount || 0) / 100;

      await adminClient.from('financial_ledger_entries').insert({
        entry_ref: `DISPUTE-PAYSTACK-${event.data?.id || ref || Date.now()}`,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'adjustment',
        category: 'dispute_chargeback',
        amount: disputeAmount > 0 ? disputeAmount : 1,
        payment_method: 'paystack',
        account_name: 'Paystack Dispute Escrow',
        status: 'completed',
        reference: `Dispute on transaction ${ref}`,
      });
    }

    // 4. Automated Staff Transfer Settlement Updates
    else if (event.event === 'transfer.success') {
      const transferCode = event.data?.transfer_code;
      const ref = event.data?.reference;

      if (transferCode || ref) {
        let query = adminClient.from('payroll_items').update({
          payment_status: 'paid',
          transfer_status: 'success',
        });

        if (transferCode) query = query.eq('paystack_transfer_code', transferCode);
        else if (ref) query = query.eq('paystack_transfer_reference', ref);

        await query;

        // Complete any pending transfer ledger entries
        if (ref) {
          await adminClient
            .from('financial_ledger_entries')
            .update({ status: 'completed' })
            .eq('reference', ref)
            .eq('entry_type', 'expense');
        }
      }
    }

    // 5. Transfer Failed or Reversed
    else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const transferCode = event.data?.transfer_code;
      const ref = event.data?.reference;

      if (transferCode || ref) {
        let query = adminClient.from('payroll_items').update({
          payment_status: 'failed',
          transfer_status: event.event === 'transfer.reversed' ? 'reversed' : 'failed',
        });

        if (transferCode) query = query.eq('paystack_transfer_code', transferCode);
        else if (ref) query = query.eq('paystack_transfer_reference', ref);

        await query;

        // Mark ledger entry reversed
        if (ref) {
          await adminClient
            .from('financial_ledger_entries')
            .update({ status: 'reversed' })
            .eq('reference', ref);
        }
      }
    }

    // 6. Generic Failed Charge
    else if (event.data?.reference && event.event === 'charge.failed') {
      await adminClient
        .from('payments')
        .update({ paystack_status: 'failed', status: 'rejected' })
        .eq('paystack_reference', event.data.reference)
        .neq('status', 'verified');
    }

    await adminClient
      .from('paystack_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', inserted.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
