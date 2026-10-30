import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 160);
    const service = clean(body.service, 120);
    const message = clean(body.message, 2000);

    if (!name || !phone || !message) {
      return NextResponse.json({ error: 'Name, phone number, and message are required.' }, { status: 400 });
    }

    const details = [
      `From: ${name}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : null,
      service ? `Service interest: ${service}` : null,
      `Message: ${message}`,
    ].filter(Boolean).join('\n');

    const { error } = await createAdminClient().from('notifications').insert({
      user_id: null,
      title: `New website enquiry from ${name}`,
      message: details,
      type: 'info',
      link: '/dashboard',
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Public contact form error:', error);
    return NextResponse.json({ error: 'Unable to send your message right now. Please try again.' }, { status: 500 });
  }
}
