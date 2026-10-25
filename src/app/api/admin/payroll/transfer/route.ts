import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { paystack } from '@/lib/paystack';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const { payroll_item_id, item_ids, payroll_id } = body;

    const client = createAdminClient();

    let targetIds: string[] = [];
    if (payroll_item_id) {
      targetIds = [payroll_item_id];
    } else if (Array.isArray(item_ids) && item_ids.length > 0) {
      targetIds = item_ids;
    } else if (payroll_id) {
      const { data: batchItems, error: batchErr } = await client
        .from('payroll_items')
        .select('id')
        .eq('payroll_id', payroll_id)
        .neq('payment_status', 'paid');
      if (batchErr) throw batchErr;
      targetIds = (batchItems || []).map((i) => i.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No payroll items specified' }, { status: 400 });
    }

    const { data: items, error: fetchErr } = await client
      .from('payroll_items')
      .select('*, employee:employees(*), payroll:payroll(payroll_ref)')
      .in('id', targetIds);

    if (fetchErr) throw fetchErr;
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Payroll items not found' }, { status: 404 });
    }

    const results: any[] = [];

    for (const item of items) {
      const employee = item.employee;
      if (!employee) {
        results.push({ item_id: item.id, error: 'Employee record missing' });
        continue;
      }

      try {
        let recipientCode = employee.paystack_recipient_code;

        // 1. Create recipient if not exists
        if (!recipientCode) {
          const accountNumber = employee.momo_number || employee.phone || employee.bank_account_number;
          const bankCode = employee.momo_provider || employee.bank_code || 'MTN'; // Default to MTN MoMo in Ghana

          if (!accountNumber) {
            results.push({ item_id: item.id, error: 'No mobile money or bank account found for staff' });
            continue;
          }

          const recipientRes = await paystack.createTransferRecipient({
            name: employee.full_name,
            account_number: accountNumber.replace(/[^0-9]/g, ''),
            bank_code: bankCode,
            type: employee.bank_account_number ? 'nuban' : 'mobile_money',
            description: `Cleaner Payout: ${employee.full_name}`,
          });

          recipientCode = recipientRes.data?.recipient_code;

          if (recipientCode) {
            await client
              .from('employees')
              .update({ paystack_recipient_code: recipientCode })
              .eq('id', employee.id);
          }
        }

        if (!recipientCode) {
          results.push({ item_id: item.id, error: 'Unable to register Paystack transfer recipient' });
          continue;
        }

        // 2. Initiate Transfer
        const ref = `TRF-${(item.payroll?.payroll_ref || 'PAY').slice(0, 10)}-${item.id.slice(0, 6)}-${Date.now()}`;
        const amountInPesewas = Math.round(Number(item.net_salary) * 100);

        const transferRes = await paystack.initiateTransfer({
          source: 'balance',
          amount: amountInPesewas,
          recipient: recipientCode,
          reason: `Salary: ${employee.full_name} (${item.payroll?.payroll_ref || 'Payout'})`,
          reference: ref,
        });

        const transferData = transferRes.data || {};
        const isCompleted = transferData.status === 'success';

        // 3. Update Payroll Item
        await client
          .from('payroll_items')
          .update({
            payment_method: 'paystack',
            payment_ref: transferData.transfer_code || ref,
            payment_status: isCompleted ? 'paid' : 'pending',
            paystack_transfer_code: transferData.transfer_code || null,
            paystack_transfer_reference: ref,
            transfer_status: transferData.status || 'processing',
          })
          .eq('id', item.id);

        // 4. Ingest into Financial Ledger
        const ledgerRef = `PAYROLL-TRF-${item.id.slice(0, 8)}`;
        const { data: existingLedger } = await client
          .from('financial_ledger_entries')
          .select('id')
          .eq('payroll_item_id', item.id)
          .eq('entry_type', 'expense')
          .maybeSingle();

        if (!existingLedger) {
          await client.from('financial_ledger_entries').insert({
            entry_ref: ledgerRef,
            entry_date: new Date().toISOString().split('T')[0],
            entry_type: 'expense',
            category: 'employee_salaries',
            amount: item.net_salary,
            payment_method: 'paystack',
            account_name: 'Paystack Staff Transfers',
            status: isCompleted ? 'completed' : 'pending',
            reference: ref,
            payroll_item_id: item.id,
            recorded_by: admin.id,
            approved_by: admin.id,
          });
        }

        results.push({
          item_id: item.id,
          employee: employee.full_name,
          transfer_code: transferData.transfer_code,
          reference: ref,
          status: transferData.status || 'processing',
        });
      } catch (err: any) {
        console.error(`Transfer failed for item ${item.id}:`, err);
        results.push({
          item_id: item.id,
          employee: employee.full_name,
          error: err.message || 'Transfer initiation failed',
        });
      }
    }

    await client.from('audit_logs').insert({
      user_id: admin.id,
      action: 'PAYSTACK_STAFF_TRANSFERS',
      entity: 'payroll',
      new_data: { processed: results.length },
    });

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error('Staff transfer route error:', error);
    return NextResponse.json({ error: error.message || 'Staff transfer failed' }, { status: 500 });
  }
}
