import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyJobScheduled } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const {
      client_id,
      service_id,
      scheduled_date,
      scheduled_start_time,
      location,
      agreed_price,
      materials_required,
      status,
      assigned_employee_ids,
    } = body;

    if (!client_id || !service_id || !scheduled_date) {
      return NextResponse.json({ error: 'Client, service, and scheduled date are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Generate Job Number (e.g. JOB-202610-001)
    const { count } = await adminClient.from('jobs').select('*', { count: 'exact', head: true });
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const jobNumber = `JOB-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;
    const initialStatus = status || (assigned_employee_ids && assigned_employee_ids.length > 0 ? 'assigned' : 'scheduled');
    const numericPrice = parseFloat(agreed_price || '0');

    // 2. Insert Job
    const { data: job, error: jobErr } = await adminClient
      .from('jobs')
      .insert({
        job_number: jobNumber,
        client_id,
        service_id,
        scheduled_date,
        scheduled_start_time: scheduled_start_time || '09:00:00',
        location: location.trim(),
        agreed_price: numericPrice,
        estimated_cost: Math.round(numericPrice * 0.4),
        materials_required: materials_required || 'General cleaning kit, vacuum, mop set',
        status: initialStatus,
      })
      .select('*, client:clients(*), service:services(*)')
      .single();

    if (jobErr) throw jobErr;

    // 3. Assign employees
    if (Array.isArray(assigned_employee_ids) && assigned_employee_ids.length > 0) {
      const workerRows = assigned_employee_ids.map((employee_id: string) => ({
        job_id: job.id,
        employee_id,
        role: 'cleaner',
      }));
      const { error: workerError } = await adminClient.from('job_workers').insert(workerRows);
      if (workerError) throw workerError;
    }

    // 4. Audit Log
    await adminClient.from('audit_logs').insert({
      user_id: admin.id,
      action: 'SCHEDULE_NEW_JOB',
      entity: 'jobs',
      entity_id: job.id,
      new_data: { job_number: jobNumber, client_id, location, scheduled_date },
    });

    // 5. Notify customer that job has been scheduled
    try {
      await notifyJobScheduled({
        jobNumber: job.job_number,
        clientName: job.client?.name || 'Valued Customer',
        clientEmail: job.client?.email || null,
        clientPhone: job.client?.phone || null,
        serviceName: job.service?.name || 'Cleaning Service',
        scheduledDate: job.scheduled_date,
        scheduledStartTime: job.scheduled_start_time,
        location: job.location,
        crewCount: assigned_employee_ids?.length || 0,
      });
    } catch (notifErr) {
      console.warn('Job scheduled notification warning:', notifErr);
    }

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    console.error('Create job error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
