import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const { payroll_id, action } = await request.json(); // action: 'approve' | 'mark_paid'

    if (!payroll_id || !action) {
      return NextResponse.json({ error: 'Missing payroll_id or action' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: payroll, error } = await adminClient
      .from('payroll')
      .select('*')
      .eq('id', payroll_id)
      .single();

    if (error || !payroll) {
      return NextResponse.json({ error: 'Payroll batch not found' }, { status: 404 });
    }

    if (action === 'approve') {
      await adminClient
        .from('payroll')
        .update({
          status: 'approved',
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', payroll_id);
    } else if (action === 'mark_paid') {
      await adminClient
        .from('payroll')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payroll_id);

      // Update all payroll items to paid
      await adminClient
        .from('payroll_items')
        .update({ payment_status: 'paid' })
        .eq('payroll_id', payroll_id);

      // Automatically register the salary expense into the expenses table so it flows into P&L
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const { count } = await adminClient.from('expenses').select('*', { count: 'exact', head: true });
      const expNumber = `EXP-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

      await adminClient.from('expenses').insert({
        expense_number: expNumber,
        description: `Staff Salaries Batch ${payroll.payroll_ref} (${payroll.period_month}/${payroll.period_year})`,
        category: 'employee_salaries',
        amount: payroll.total_net,
        date_incurred: new Date().toISOString().split('T')[0],
        payment_method: 'momo',
        submitted_by: admin.id,
        approved_by: admin.id,
        status: 'paid',
        notes: `Payroll batch disbursement reference ${payroll.payroll_ref}`,
      });
    }

    return NextResponse.json({ success: true, status: action === 'approve' ? 'approved' : 'paid' });
  } catch (err: any) {
    console.error('Payroll action error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
