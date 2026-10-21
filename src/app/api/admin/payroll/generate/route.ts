import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const { period_month, period_year, notes } = body;

    const month = parseInt(period_month, 10);
    const year = parseInt(period_year, 10);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Valid period month (1-12) and year required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if payroll already exists for this month/year
    const { data: existing } = await adminClient
      .from('payroll')
      .select('id')
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Payroll batch for ${month}/${year} already exists.` },
        { status: 400 }
      );
    }

    // Fetch all active employees
    const { data: employees, error: empErr } = await adminClient
      .from('employees')
      .select('*')
      .eq('employment_status', 'active');

    if (empErr) throw empErr;

    const payrollRef = `PAYROLL-${year}-${String(month).padStart(2, '0')}`;

    // Create payroll batch header
    const { data: payroll, error: payErr } = await adminClient
      .from('payroll')
      .insert({
        payroll_ref: payrollRef,
        period_month: month,
        period_year: year,
        status: 'draft',
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        prepared_by: admin.id,
        notes: notes || `Monthly salary batch for ${month}/${year}`,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    // Calculate line items for each employee
    let sumGross = 0;
    let sumDeductions = 0;
    let sumNet = 0;

    for (const emp of employees || []) {
      const basic = Number(emp.base_salary) || 0;
      const allowance = Number(emp.allowances) || 0;
      const overtime = 0.00;
      const bonus = 0.00;
      const deductions = 0.00;
      // Formula: Net Salary = Basic Earnings + Allowances + Overtime + Bonuses − Deductions
      const net = basic + allowance + overtime + bonus - deductions;

      sumGross += basic + allowance;
      sumDeductions += deductions;
      sumNet += net;

      await adminClient.from('payroll_items').insert({
        payroll_id: payroll.id,
        employee_id: emp.id,
        basic_salary: basic,
        allowances: allowance,
        overtime_pay: overtime,
        bonus,
        deductions,
        net_salary: net,
        payment_method: 'momo',
        payment_status: 'pending',
      });
    }

    // Update totals
    await adminClient
      .from('payroll')
      .update({
        total_gross: sumGross,
        total_deductions: sumDeductions,
        total_net: sumNet,
      })
      .eq('id', payroll.id);

    return NextResponse.json({ success: true, payroll_id: payroll.id });
  } catch (err: any) {
    console.error('Payroll generate error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
