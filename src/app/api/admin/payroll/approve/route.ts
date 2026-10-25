import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const paymentMethods = ['momo', 'bank_transfer', 'cash', 'paystack'] as const;

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const { payroll_id, action, payment_method = 'momo' } = await request.json();
    if (!payroll_id || !['approve', 'mark_paid'].includes(action)) {
      return NextResponse.json({ error: 'Valid payroll_id and action are required' }, { status: 400 });
    }
    if (!paymentMethods.includes(payment_method)) {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }

    const client = createAdminClient();
    const { data: payroll, error: payrollError } = await client.from('payroll').select('*').eq('id', payroll_id).single();
    if (payrollError || !payroll) return NextResponse.json({ error: 'Payroll batch not found' }, { status: 404 });

    if (action === 'approve') {
      if (!['draft', 'review'].includes(payroll.status)) {
        return NextResponse.json({ error: 'Only draft or review payroll can be approved' }, { status: 409 });
      }
      const { error } = await client.from('payroll').update({
        status: 'approved',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      }).eq('id', payroll_id);
      if (error) throw error;
      await client.from('audit_logs').insert({ user_id: admin.id, action: 'APPROVE_PAYROLL', entity: 'payroll', entity_id: payroll_id });
      return NextResponse.json({ success: true, status: 'approved' });
    }

    if (payroll.status !== 'approved') {
      return NextResponse.json({ error: 'Payroll must be approved before it can be paid' }, { status: 409 });
    }
    const { data: items, error: itemsError } = await client
      .from('payroll_items')
      .select('id, net_salary, payment_status')
      .eq('payroll_id', payroll_id);
    if (itemsError) throw itemsError;
    if (!items?.length) return NextResponse.json({ error: 'Payroll has no line items' }, { status: 409 });

    const { error: payrollUpdateError } = await client.from('payroll').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', payroll_id).eq('status', 'approved');
    if (payrollUpdateError) throw payrollUpdateError;

    const { error: itemUpdateError } = await client.from('payroll_items')
      .update({ payment_status: 'paid', payment_method })
      .eq('payroll_id', payroll_id)
      .neq('payment_status', 'paid');
    if (itemUpdateError) throw itemUpdateError;

    for (const item of items) {
      const { data: existing, error: lookupError } = await client
        .from('financial_ledger_entries')
        .select('id')
        .eq('payroll_item_id', item.id)
        .eq('entry_type', 'expense')
        .eq('status', 'completed')
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        const { error } = await client.from('financial_ledger_entries').insert({
          entry_ref: `PAYROLL-${payroll.payroll_ref}-${item.id.slice(0, 8)}`,
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'expense',
          category: 'employee_salaries',
          amount: item.net_salary,
          payment_method,
          account_name: payment_method === 'cash' ? 'Cash' : payment_method === 'bank_transfer' ? 'Bank' : 'Mobile Money',
          status: 'completed',
          reference: payroll.payroll_ref,
          payroll_item_id: item.id,
          recorded_by: admin.id,
          approved_by: admin.id,
        });
        if (error) throw error;
      }
    }

    const note = `Payroll batch disbursement reference ${payroll.payroll_ref}`;
    const { data: existingExpense, error: expenseLookupError } = await client.from('expenses').select('id').eq('notes', note).maybeSingle();
    if (expenseLookupError) throw expenseLookupError;
    if (!existingExpense) {
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const { count } = await client.from('expenses').select('*', { count: 'exact', head: true });
      const { error } = await client.from('expenses').insert({
        expense_number: `EXP-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`,
        description: `Staff Salaries Batch ${payroll.payroll_ref} (${payroll.period_month}/${payroll.period_year})`,
        category: 'employee_salaries',
        amount: payroll.total_net,
        date_incurred: new Date().toISOString().split('T')[0],
        payment_method,
        submitted_by: admin.id,
        approved_by: admin.id,
        status: 'paid',
        notes: note,
      });
      if (error) throw error;
    }

    await client.from('audit_logs').insert({ user_id: admin.id, action: 'PAY_PAYROLL', entity: 'payroll', entity_id: payroll_id, new_data: { payment_method } });
    return NextResponse.json({ success: true, status: 'paid' });
  } catch (error) {
    console.error('Payroll action error:', error);
    return NextResponse.json({ error: 'Unable to update payroll' }, { status: 500 });
  }
}
