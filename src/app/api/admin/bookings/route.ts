import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  notifyBookingApproved,
  notifyBookingRejected,
  notifyJobScheduled,
} from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const {
      booking_id,
      action, // 'approve', 'reject', 'cancel'
      assigned_employee_ids,
      agreed_price,
      scheduled_start_time,
      materials_required,
    } = body;

    if (!booking_id || !action) {
      return NextResponse.json({ error: 'Missing booking_id or action' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch booking details
    const { data: booking, error: bError } = await adminClient
      .from('bookings')
      .select('*, service:services(*)')
      .eq('id', booking_id)
      .single();

    if (bError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // 2. Ensure Client record exists or create one from booking details
      let clientId = booking.client_id;
      if (!clientId) {
        // Look up client by phone
        const { data: existingClient } = await adminClient
          .from('clients')
          .select('id')
          .eq('phone', booking.customer_phone)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Create new client
          const { data: newClient, error: clientErr } = await adminClient
            .from('clients')
            .insert({
              name: booking.customer_name,
              phone: booking.customer_phone,
              email: booking.customer_email || null,
              service_address: booking.service_address,
              client_type: 'residential',
            })
            .select()
            .single();

          if (clientErr) throw clientErr;
          clientId = newClient.id;
        }

        // Link client to booking
        await adminClient.from('bookings').update({ client_id: clientId }).eq('id', booking.id);
      }

      // 3. Generate Job Number (e.g. JOB-202610-001)
      const { count } = await adminClient.from('jobs').select('*', { count: 'exact', head: true });
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const jobNumber = `JOB-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

      // 4. Create Job in jobs table
      const finalPrice = agreed_price ? parseFloat(agreed_price) : Number(booking.quoted_price);
      const startTime = scheduled_start_time || '09:00:00';

      const { data: job, error: jobErr } = await adminClient
        .from('jobs')
        .insert({
          job_number: jobNumber,
          booking_id: booking.id,
          client_id: clientId,
          service_id: booking.service_id,
          scheduled_date: booking.preferred_date,
          scheduled_start_time: startTime,
          location: booking.service_address,
          agreed_price: finalPrice,
          estimated_cost: Math.round(finalPrice * 0.4),
          materials_required: materials_required || 'Standard cleaning kit, disinfectant, microfiber cloths',
          status: assigned_employee_ids && assigned_employee_ids.length > 0 ? 'assigned' : 'scheduled',
        })
        .select()
        .single();

      if (jobErr) throw jobErr;

      // 5. Assign employees if provided
      if (assigned_employee_ids && Array.isArray(assigned_employee_ids)) {
        for (const empId of assigned_employee_ids) {
          await adminClient.from('job_workers').insert({
            job_id: job.id,
            employee_id: empId,
            role: 'cleaner',
          });
        }
      }

      // 6. Update booking status to approved
      await adminClient
        .from('bookings')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      // 7. Audit log
      await adminClient.from('audit_logs').insert({
        user_id: admin.id,
        action: 'APPROVE_BOOKING_CONVERT_TO_JOB',
        entity: 'jobs',
        entity_id: job.id,
        new_data: { booking_ref: booking.booking_ref, job_number: jobNumber },
      });

      // 8. Notify Customer & Schedule Alerts
      try {
        await notifyBookingApproved({
          id: booking.id,
          booking_ref: booking.booking_ref,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          preferred_date: booking.preferred_date,
          service_address: booking.service_address,
          quoted_price: finalPrice,
          service: booking.service,
        });

        await notifyJobScheduled({
          jobNumber: jobNumber,
          clientName: booking.customer_name,
          clientEmail: booking.customer_email,
          clientPhone: booking.customer_phone,
          serviceName: booking.service?.name || 'Cleaning Service',
          scheduledDate: booking.preferred_date,
          scheduledStartTime: startTime,
          location: booking.service_address,
          crewCount: assigned_employee_ids?.length || 0,
        });
      } catch (notifyErr) {
        console.warn('Booking approval notification warning:', notifyErr);
      }

      return NextResponse.json({ success: true, job_id: job.id, job_number: jobNumber });
    } else if (action === 'reject' || action === 'cancel') {
      await adminClient
        .from('bookings')
        .update({ status: action === 'reject' ? 'rejected' : 'cancelled' })
        .eq('id', booking.id);

      if (action === 'reject') {
        try {
          await notifyBookingRejected({
            id: booking.id,
            booking_ref: booking.booking_ref,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            preferred_date: booking.preferred_date,
            service: booking.service,
          });
        } catch (rejectNotifyErr) {
          console.warn('Booking rejection notification warning:', rejectNotifyErr);
        }
      }

      return NextResponse.json({ success: true, status: action });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Booking action error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
