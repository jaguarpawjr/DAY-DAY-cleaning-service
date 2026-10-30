import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith('sk_')) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured or invalid');
  }
  return secret;
}

export async function POST(request: Request) {
  try {
    const secret = getPaystackSecret();
    const body = await request.json();
    const bookingRef = typeof body.booking_ref === 'string' ? body.booking_ref.trim().toUpperCase() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!bookingRef || !email) {
      return NextResponse.json({ error: 'Booking reference and email are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('id, booking_ref, client_id, customer_name, customer_email, quoted_price, deposit_required, status')
      .eq('booking_ref', bookingRef)
      .ilike('customer_email', email)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking || booking.status !== 'approved') {
      return NextResponse.json({ error: 'Approved booking not found' }, { status: 404 });
    }

    const amount = Number(booking.deposit_required || booking.quoted_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Booking has no payable balance' }, { status: 400 });
    }
    if (!booking.client_id) {
      return NextResponse.json({ error: 'Booking is not linked to a customer record' }, { status: 409 });
    }

    const { data: invoice, error: invoiceError } = await adminClient
      .from('invoices')
      .select('id, balance_due')
      .eq('booking_id', booking.id)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice || Number(invoice.balance_due) <= 0) {
      return NextResponse.json({ error: 'Booking does not have an outstanding invoice' }, { status: 409 });
    }

    const { data: existingPayment, error: existingPaymentError } = await adminClient
      .from('payments')
      .select('paystack_reference, status')
      .eq('booking_id', booking.id)
      .in('status', ['pending_verification', 'verified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingPaymentError) throw existingPaymentError;
    if (existingPayment) {
      return NextResponse.json(
        { error: existingPayment.status === 'verified' ? 'This booking has already been paid' : 'A payment is already awaiting verification' },
        { status: 409 },
      );
    }

    const payableAmount = Math.min(amount, Number(invoice.balance_due));
    const reference = `DAYDAY-${booking.booking_ref}-${crypto.randomUUID()}`;
    const { error: paymentError } = await adminClient.from('payments').insert({
      payment_ref: reference,
      invoice_id: invoice.id,
      booking_id: booking.id,
      client_id: booking.client_id,
      amount: payableAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'paystack',
      paystack_reference: reference,
      paystack_status: 'pending',
      status: 'pending_verification',
      notes: `Paystack checkout for booking ${booking.booking_ref}`,
    });
    if (paymentError) throw paymentError;

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${new URL(request.url).origin}/payments/paystack/callback`;
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(payableAmount * 100),
        currency: 'GHS',
        reference,
        metadata: { booking_id: booking.id, booking_ref: booking.booking_ref },
        callback_url: callbackUrl,
      }),
    });

    const responseText = await response.text();
    let result: {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string };
    };
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Paystack initialization returned a non-JSON response:', response.status);
      return NextResponse.json({ error: 'Paystack returned an invalid response' }, { status: 502 });
    }

    if (!response.ok || !result.status) {
      console.error('Paystack initialization failed:', response.status, result.message || 'Unknown Paystack error');
      return NextResponse.json({ error: result.message || 'Unable to initialize Paystack payment' }, { status: 502 });
    }
    if (!result.data?.authorization_url) {
      return NextResponse.json({ error: 'Paystack did not return a checkout URL' }, { status: 502 });
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference,
      amount: payableAmount,
      currency: 'GHS',
    });
  } catch (error) {
    console.error('Paystack initialization error:', error);
    return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 500 });
  }
}
