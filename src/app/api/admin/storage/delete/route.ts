import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { path, bucket = 'brand-assets' } = body;

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const client = createAdminClient();
    const { error: removeError } = await client.storage.from(bucket).remove([path]);

    if (removeError) {
      console.error('Storage remove error:', removeError);
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedPath: path });
  } catch (error: any) {
    console.error('Delete storage route error:', error);
    return NextResponse.json({ error: error.message || 'Storage deletion failed' }, { status: 500 });
  }
}
