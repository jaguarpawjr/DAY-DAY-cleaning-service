import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { paystack } from '@/lib/paystack';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const client = createAdminClient();

    // 1. Fetch live or stored settlements
    const { data: storedSettlements, error: storedErr } = await client
      .from('paystack_settlements')
      .select('*')
      .order('settlement_date', { ascending: false });

    if (storedErr) throw storedErr;

    // 2. Fetch from Paystack API
    const paystackRes = await paystack.fetchSettlements({ from, to });
    const apiSettlements = Array.isArray(paystackRes.data) ? paystackRes.data : [];

    return NextResponse.json({
      success: true,
      storedCount: storedSettlements?.length || 0,
      stored: storedSettlements || [],
      paystackApiCount: apiSettlements.length,
      paystackApi: apiSettlements,
    });
  } catch (error: any) {
    console.error('Fetch settlements error:', error);
    return NextResponse.json({ error: error.message || 'Unable to fetch settlements' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const client = createAdminClient();

    // 1. Fetch all settlements from Paystack API
    const paystackRes = await paystack.fetchSettlements();
    const apiSettlements = Array.isArray(paystackRes.data) ? paystackRes.data : [];

    let synchronizedCount = 0;
    let newLedgerEntriesCount = 0;
    const discrepancies: any[] = [];

    for (const st of apiSettlements) {
      const settlementId = String(st.id || st.settlement_id || st.reference || '');
      if (!settlementId) continue;

      const totalAmount = (Number(st.total_amount) || 0) / 100;
      const netAmount = (Number(st.net_amount) || (Number(st.total_amount) || 0)) / 100;
      const settlementDate = st.settlement_date ? st.settlement_date.split('T')[0] : new Date().toISOString().split('T')[0];

      // Check if stored
      const { data: existing } = await client
        .from('paystack_settlements')
        .select('*')
        .eq('settlement_id', settlementId)
        .maybeSingle();

      let settlementRecord = existing;

      if (!existing) {
        const { data: inserted, error: insertErr } = await client
          .from('paystack_settlements')
          .insert({
            settlement_id: settlementId,
            settlement_date: settlementDate,
            total_amount: totalAmount,
            net_amount: netAmount,
            status: st.status || 'completed',
            raw_payload: st,
          })
          .select()
          .single();

        if (insertErr) {
          console.error(`Error saving settlement ${settlementId}:`, insertErr);
          discrepancies.push({ settlementId, error: insertErr.message });
          continue;
        }
        settlementRecord = inserted;
        synchronizedCount++;
      }

      // Check if ledger entry is generated for this settlement
      if (settlementRecord && !settlementRecord.reconciled) {
        const entryRef = `SETTLE-PAYSTACK-${settlementId}`;
        const { data: existingLedger } = await client
          .from('financial_ledger_entries')
          .select('id')
          .eq('entry_ref', entryRef)
          .maybeSingle();

        let ledgerId = existingLedger?.id;

        if (!existingLedger) {
          const { data: newEntry, error: ledgerErr } = await client
            .from('financial_ledger_entries')
            .insert({
              entry_ref: entryRef,
              entry_date: settlementDate,
              entry_type: 'settlement',
              category: 'paystack_payout',
              amount: netAmount,
              payment_method: 'paystack',
              account_name: 'Paystack Settlement Account',
              status: 'completed',
              reference: `Paystack Batch ${settlementId}`,
              recorded_by: admin.id,
              approved_by: admin.id,
            })
            .select('id')
            .single();

          if (!ledgerErr && newEntry) {
            ledgerId = newEntry.id;
            newLedgerEntriesCount++;
          }
        }

        // Mark settlement as reconciled
        await client
          .from('paystack_settlements')
          .update({
            reconciled: true,
            reconciled_at: new Date().toISOString(),
            ledger_entry_id: ledgerId || null,
          })
          .eq('id', settlementRecord.id);
      }
    }

    await client.from('audit_logs').insert({
      user_id: admin.id,
      action: 'PAYSTACK_SETTLEMENT_RECONCILIATION',
      entity: 'finance',
      new_data: { synchronizedCount, newLedgerEntriesCount },
    });

    return NextResponse.json({
      success: true,
      message: 'Paystack settlements synchronized and reconciled successfully.',
      synchronizedCount,
      newLedgerEntriesCount,
      discrepancies,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: error.message || 'Settlement synchronization failed' }, { status: 500 });
  }
}
