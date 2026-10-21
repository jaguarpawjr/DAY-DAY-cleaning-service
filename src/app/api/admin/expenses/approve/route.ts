import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const { expense_id, status } = await request.json();

    if (!expense_id || !status) {
      return NextResponse.json({ error: 'Missing expense_id or status' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: updated, error } = await adminClient
      .from('expenses')
      .update({
        status,
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expense_id)
      .select()
      .single();

    if (error) throw error;

    await adminClient.from('audit_logs').insert({
      user_id: admin.id,
      action: status === 'approved' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
      entity: 'expenses',
      entity_id: expense_id,
      new_data: { status, approved_by: admin.id },
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (err: any) {
    console.error('Approve expense error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
