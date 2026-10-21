import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireAuth();
    const body = await request.json();
    const {
      job_id,
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

    // Update job
    const { data: updatedJob, error: updateErr } = await adminClient
      .from('jobs')
      .update(updates)
      .eq('id', job_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

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

    // If job was completed and status transitioned to completed, notify admin
    if (status === 'completed') {
      await adminClient.from('notifications').insert({
        title: `Job Completed: ${updatedJob.job_number}`,
        message: `Cleaning crew completed job ${updatedJob.job_number} at ${updatedJob.location}. Ready for review or billing.`,
        type: 'success',
        link: `/jobs/${job_id}`,
      });
    }

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (err: any) {
    console.error('Job update error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
