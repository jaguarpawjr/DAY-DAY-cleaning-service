import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const paymentMethods = ['momo', 'bank_transfer'] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingRef = typeof body.booking_ref === 'string' ? body.booking_ref.trim().toUpperCase() : '';
    const customerPhone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
    const paymentMethod = body.payment_method;
    const referenceNumber = typeof body.reference_number === 'string' ? body.reference_number.trim() : '';

    if (!bookingRef || !customerPhone || !paymentMethods.includes(paymentMethod) || !referenceNumber) {
      return NextResponse.json({ error: 'Booking, phone, payment method, and transaction reference are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('*, service:services(*)')
      .eq('booking_ref', bookingRef)
      .ilike('customer_phone', `%${customerPhone}%`)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'approved') {
      return NextResponse.json({ error: 'Payment is available after the booking has been approved' }, { status: 400 });
    }

    let clientId = booking.client_id;
    if (!clientId) {
      const { data: client, error: clientError } = await adminClient
        .from('clients')
        .select('id')
        .eq('phone', booking.customer_phone)
        .maybeSingle();
      if (clientError) throw clientError;

      if (client) {
        clientId = client.id;
      } else {
        const { data: newClient, error: newClientError } = await adminClient
          .from('clients')
          .insert({
            name: booking.customer_name,
            phone: booking.customer_phone,
            email: booking.customer_email || null,
            service_address: booking.service_address,
            client_type: 'residential',
          })
          .select('id')
          .single();
        if (newClientError) throw newClientError;
        clientId = newClient.id;
      }
      await adminClient.from('bookings').update({ client_id: clientId }).eq('id', booking.id);
    }

    const { data: existingInvoice, error: invoiceLookupError } = await adminClient
      .from('invoices')
      .select('id, total_amount, balance_due')
      .eq('booking_id', booking.id)
      .maybeSingle();
    if (invoiceLookupError) throw invoiceLookupError;

    let invoice = existingInvoice;
    if (!invoice) {
      const { count } = await adminClient.from('invoices').select('*', { count: 'exact', head: true });
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String((count || 0) + 1).padStart(3, '0')}`;
      const totalAmount = Number(booking.deposit_required) > 0
        ? Number(booking.deposit_required)
        : Number(booking.quoted_price);
      const { data: newInvoice, error: invoiceError } = await adminClient
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_id: clientId,
          booking_id: booking.id,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          subtotal: totalAmount,
          tax_rate: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: totalAmount,
          paid_amount: 0,
          balance_due: totalAmount,
          status: 'sent',
          payment_instructions: 'Payment via Mobile Money to 0245558899 (MTN) or Ecobank Ghana transfer.',
        })
        .select('id, total_amount, balance_due')
        .single();
      if (invoiceError) throw invoiceError;
      invoice = newInvoice;
      await adminClient.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: `${booking.service?.name || 'Professional Cleaning Service'} - Booking ${booking.booking_ref}`,
        quantity: 1,
        unit_price: totalAmount,
        total_price: totalAmount,
      });
    }

    const amountDue = Number(invoice.balance_due);
    if (amountDue <= 0) {
      return NextResponse.json({ error: 'This booking has already been paid' }, { status: 400 });
    }

    const { count } = await adminClient.from('payments').select('*', { count: 'exact', head: true });
    const paymentRef = `PAY-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String((count || 0) + 1).padStart(3, '0')}`;
    const { data: payment, error: paymentError } = await adminClient
      .from('payments')
      .insert({
        payment_ref: paymentRef,
        invoice_id: invoice.id,
        client_id: clientId,
        amount: amountDue,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: `Customer payment for booking ${booking.booking_ref}`,
        status: 'pending_verification',
      })
      .select('payment_ref, amount, payment_method, reference_number, status')
      .single();
    if (paymentError) throw paymentError;

    return NextResponse.json({
      success: true,
      receipt: {
        paymentRef: payment.payment_ref,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method,
        referenceNumber: payment.reference_number,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('Public booking payment error:', error);
    return NextResponse.json({ error: 'Unable to submit payment right now. Please try again.' }, { status: 500 });
  }
}
