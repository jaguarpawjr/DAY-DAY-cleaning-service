import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyJobScheduled, notifyJobCompleted } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireAuth();
    const body = await request.json();
    const {
      job_id,
      client_id,
      service_id,
      scheduled_date,
      scheduled_start_time,
      location,
      agreed_price,
      materials_required,
      assigned_employee_ids,
      status,
      actual_materials_used,
      completion_notes,
      customer_feedback,
      customer_rating,
      photo_url,
      photo_type, // 'before' | 'after'
      photo_caption,
    } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check permissions: either admin or assigned worker
    if (profile.role !== 'admin') {
      const { data: worker } = await adminClient
        .from('job_workers')
        .select('id, employee:employees(profile_id)')
        .eq('job_id', job_id)
        .eq('employee.profile_id', user.id)
        .maybeSingle();

      if (!worker) {
        return NextResponse.json({ error: 'Unauthorized to update this job' }, { status: 403 });
      }
    }

    // Prepare updates
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (actual_materials_used !== undefined) updates.actual_materials_used = actual_materials_used;
    if (completion_notes !== undefined) updates.completion_notes = completion_notes;
    if (customer_feedback !== undefined) updates.customer_feedback = customer_feedback;
    if (customer_rating !== undefined) updates.customer_rating = customer_rating;
    if (profile.role === 'admin') {
      if (client_id !== undefined) updates.client_id = client_id;
      if (service_id !== undefined) updates.service_id = service_id;
      if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date;
      if (scheduled_start_time !== undefined) updates.scheduled_start_time = scheduled_start_time;
      if (location !== undefined) updates.location = location;
      if (agreed_price !== undefined) {
        updates.agreed_price = Number(agreed_price);
        updates.estimated_cost = Math.round(Number(agreed_price) * 0.4);
      }
      if (materials_required !== undefined) updates.materials_required = materials_required;
    }

    // Update job
    const { data: updatedJob, error: updateErr } = await adminClient
      .from('jobs')
      .update(updates)
      .eq('id', job_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    if (profile.role === 'admin' && Array.isArray(assigned_employee_ids)) {
      const { error: deleteWorkersError } = await adminClient
        .from('job_workers')
        .delete()
        .eq('job_id', job_id);
      if (deleteWorkersError) throw deleteWorkersError;

      if (assigned_employee_ids.length > 0) {
        const { error: insertWorkersError } = await adminClient.from('job_workers').insert(
          assigned_employee_ids.map((employee_id: string) => ({
            job_id,
            employee_id,
            role: 'cleaner',
          }))
        );
        if (insertWorkersError) throw insertWorkersError;
      }

    }

    // If a photo was attached
    if (photo_url && photo_type) {
      await adminClient.from('job_photos').insert({
        job_id,
        photo_type,
        photo_url,
        caption: photo_caption || null,
        uploaded_by: user.id,
      });
    }

    // Fetch client and service details for customer notifications
    try {
      const { data: jobWithDetails } = await adminClient
        .from('jobs')
        .select('*, client:clients(*), service:services(*)')
        .eq('id', job_id)
        .single();

      if (status === 'completed') {
        await notifyJobCompleted({
          jobId: job_id,
          jobNumber: updatedJob.job_number,
          clientName: jobWithDetails?.client?.name || 'Valued Customer',
          clientEmail: jobWithDetails?.client?.email || null,
          clientPhone: jobWithDetails?.client?.phone || null,
          serviceName: jobWithDetails?.service?.name || 'Cleaning Service',
          location: updatedJob.location,
          completionNotes: completion_notes || null,
        });
      } else if (status === 'scheduled' || status === 'assigned' || scheduled_date !== undefined) {
        await notifyJobScheduled({
          jobNumber: updatedJob.job_number,
          clientName: jobWithDetails?.client?.name || 'Valued Customer',
          clientEmail: jobWithDetails?.client?.email || null,
          clientPhone: jobWithDetails?.client?.phone || null,
          serviceName: jobWithDetails?.service?.name || 'Cleaning Service',
          scheduledDate: updatedJob.scheduled_date,
          scheduledStartTime: updatedJob.scheduled_start_time,
          location: updatedJob.location,
          crewCount: Array.isArray(assigned_employee_ids) ? assigned_employee_ids.length : undefined,
        });
      }
    } catch (notifyError) {
      console.warn('Job notification dispatch warning:', notifyError);
    }

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (err: any) {
    console.error('Job update error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
