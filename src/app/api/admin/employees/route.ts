import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Enforce admin role strictly on server
    const { profile: currentAdmin } = await requireAdmin();

    const body = await request.json();
    const {
      full_name,
      email,
      phone,
      job_title,
      salary_type,
      base_salary,
      allowances,
      emergency_contact_name,
      emergency_contact_phone,
      initial_password, // If admin provides initial temporary password or invites
    } = body;

    if (!full_name || !email || !job_title) {
      return NextResponse.json(
        { error: 'Full name, email, and job title are required.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Provision Supabase Auth User securely via Admin SDK
    let authUserId: string;
    const temporaryPassword = initial_password || 'DayDaySparkle' + Math.floor(1000 + Math.random() * 9000) + '!';

    const { data: newUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role: 'employee',
      },
    });

    if (createAuthError) {
      // Check if user already exists
      return NextResponse.json({ error: createAuthError.message }, { status: 400 });
    }

    authUserId = newUser.user.id;

    // 3. Upsert profile with 'employee' role
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: authUserId,
      email,
      full_name,
      phone,
      role: 'employee',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // 4. Generate Employee Code (e.g. EMP-001)
    const { count } = await adminClient
      .from('employees')
      .select('*', { count: 'exact', head: true });
    const employeeCode = `EMP-${String((count || 0) + 1).padStart(3, '0')}`;

    // 5. Create employee record linked to profile_id
    const { data: employeeRecord, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        profile_id: authUserId,
        employee_id: employeeCode,
        full_name,
        phone,
        email,
        job_title,
        salary_type: salary_type || 'monthly',
        base_salary: parseFloat(base_salary || '0'),
        allowances: parseFloat(allowances || '0'),
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        employment_status: 'active',
      })
      .select()
      .single();

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    // 6. Record audit log
    await adminClient.from('audit_logs').insert({
      user_id: currentAdmin.id,
      action: 'CREATE_EMPLOYEE',
      entity: 'employees',
      entity_id: employeeRecord.id,
      new_data: { full_name, email, job_title, employee_id: employeeCode },
    });

    return NextResponse.json({
      success: true,
      employee: employeeRecord,
      temporaryPassword,
      message: `Employee account created successfully. Default temporary password: ${temporaryPassword}`,
    });
  } catch (err: any) {
    console.error('Create employee error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile: currentAdmin } = await requireAdmin();
    const body = await request.json();
    const { employee_id, is_active } = body;

    if (!employee_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'employee_id and is_active boolean are required.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch employee
    const { data: emp, error: empFetchErr } = await adminClient
      .from('employees')
      .select('profile_id, employment_status')
      .eq('id', employee_id)
      .single();

    if (empFetchErr || !emp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Update employee status
    const statusStr = is_active ? 'active' : 'terminated';
    await adminClient
      .from('employees')
      .update({ employment_status: statusStr })
      .eq('id', employee_id);

    // Update profile is_active
    if (emp.profile_id) {
      await adminClient
        .from('profiles')
        .update({ is_active })
        .eq('id', emp.profile_id);

      // If deactivating, revoke session / ban user in auth
      if (!is_active) {
        await adminClient.auth.admin.updateUserById(emp.profile_id, {
          ban_duration: '876600h', // 100 years
        });
      } else {
        await adminClient.auth.admin.updateUserById(emp.profile_id, {
          ban_duration: 'none',
        });
      }
    }

    // Record audit log
    await adminClient.from('audit_logs').insert({
      user_id: currentAdmin.id,
      action: is_active ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
      entity: 'employees',
      entity_id: employee_id,
      new_data: { is_active, employment_status: statusStr },
    });

    return NextResponse.json({ success: true, is_active, employment_status: statusStr });
  } catch (err: any) {
    console.error('Update employee status error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
