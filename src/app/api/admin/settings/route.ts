import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();

    const adminClient = createAdminClient();

    // Check if settings exist
    const { data: existing } = await adminClient.from('company_settings').select('id').maybeSingle();

    if (existing) {
      await adminClient
        .from('company_settings')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await adminClient.from('company_settings').insert({
        ...body,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Settings error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
