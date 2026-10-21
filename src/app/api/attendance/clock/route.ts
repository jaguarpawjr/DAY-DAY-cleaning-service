import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireAuth();
    const body = await request.json();
    const { action, notes, lat, lng } = body; // action: 'clock_in' | 'clock_out'

    const adminClient = createAdminClient();

    // Find employee record for current user
    const { data: employee, error: empErr } = await adminClient
      .from('employees')
      .select('id, full_name, employment_status')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (empErr || !employee) {
      return NextResponse.json({ error: 'Employee record not found for this profile' }, { status: 404 });
    }

    if (employee.employment_status !== 'active') {
      return NextResponse.json({ error: 'Account is not currently active' }, { status: 403 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check existing attendance for today
    const { data: existingAttendance } = await adminClient
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('work_date', todayStr)
      .maybeSingle();

    if (action === 'clock_in') {
      if (existingAttendance) {
        return NextResponse.json(
          { error: 'You have already clocked in for today.' },
          { status: 400 }
        );
      }

      const now = new Date();
      // Check if late (e.g. after 8:30 AM in Accra)
      const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);

      const { data: newAtt, error: inErr } = await adminClient
        .from('attendance')
        .insert({
          employee_id: employee.id,
          work_date: todayStr,
          clock_in: now.toISOString(),
          status: isLate ? 'late' : 'present',
          location_lat: lat ? parseFloat(lat) : null,
          location_lng: lng ? parseFloat(lng) : null,
          notes: notes || null,
        })
        .select()
        .single();

      if (inErr) throw inErr;

      return NextResponse.json({ success: true, action: 'clock_in', attendance: newAtt });
    } else if (action === 'clock_out') {
      if (!existingAttendance) {
        return NextResponse.json(
          { error: 'No clock-in record found for today. Please clock in first.' },
          { status: 400 }
        );
      }

      if (existingAttendance.clock_out) {
        return NextResponse.json(
          { error: 'You have already clocked out for today.' },
          { status: 400 }
        );
      }

      const { data: updatedAtt, error: outErr } = await adminClient
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          notes: notes ? `${existingAttendance.notes || ''} | Out: ${notes}` : existingAttendance.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAttendance.id)
        .select()
        .single();

      if (outErr) throw outErr;

      return NextResponse.json({ success: true, action: 'clock_out', attendance: updatedAtt });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Attendance clock error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
