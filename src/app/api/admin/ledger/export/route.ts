import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const format = (params.get('format') || 'csv').toLowerCase();

    let query = createAdminClient()
      .from('financial_ledger_entries')
      .select('entry_ref,entry_date,entry_type,category,amount,payment_method,status,reference')
      .order('entry_date', { ascending: false });

    if (params.get('from')) query = query.gte('entry_date', params.get('from')!);
    if (params.get('to')) query = query.lte('entry_date', params.get('to')!);
    if (params.get('method')) query = query.eq('payment_method', params.get('method')!);
    if (params.get('category')) query = query.eq('category', params.get('category')!);

    const { data, error } = await query;
    if (error) {
      console.error('Ledger export error:', error);
      return NextResponse.json({ error: 'Unable to export ledger' }, { status: 500 });
    }

    const rows = data || [];

    // Excel Export (.xlsx)
    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();

      // Formatted Ledger Records
      const formattedLedgerData = rows.map((r) => ({
        'Entry Reference': r.entry_ref,
        'Date': r.entry_date,
        'Type': r.entry_type.toUpperCase(),
        'Category': (r.category || '').replace(/_/g, ' ').toUpperCase(),
        'Amount (GH₵)': Number(r.amount) || 0,
        'Payment Method': (r.payment_method || '').toUpperCase(),
        'Status': (r.status || '').toUpperCase(),
        'Reference ID': r.reference || '',
      }));

      const ledgerSheet = XLSX.utils.json_to_sheet(formattedLedgerData);

      // Auto-fit column widths
      ledgerSheet['!cols'] = [
        { wch: 22 }, // Entry Reference
        { wch: 12 }, // Date
        { wch: 12 }, // Type
        { wch: 24 }, // Category
        { wch: 16 }, // Amount
        { wch: 16 }, // Payment Method
        { wch: 14 }, // Status
        { wch: 28 }, // Reference ID
      ];

      XLSX.utils.book_append_sheet(workbook, ledgerSheet, 'Ledger Entries');

      // Summary Analytics Sheet
      const incomeTotal = rows
        .filter((r) => r.entry_type === 'income')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const expenseTotal = rows
        .filter((r) => r.entry_type === 'expense')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const refundTotal = rows
        .filter((r) => r.entry_type === 'refund')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const feeTotal = rows
        .filter((r) => r.entry_type === 'fee')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const netCash = incomeTotal - expenseTotal - refundTotal - feeTotal;

      const summaryData = [
        { Metric: 'Total Recognized Income (GH₵)', Value: incomeTotal },
        { Metric: 'Total Operating Expenses (GH₵)', Value: expenseTotal },
        { Metric: 'Total Refunds Issued (GH₵)', Value: refundTotal },
        { Metric: 'Paystack & Gateway Fees (GH₵)', Value: feeTotal },
        { Metric: 'Net Operational Cash Flow (GH₵)', Value: netCash },
        { Metric: 'Total Transaction Count', Value: rows.length },
        { Metric: 'Export Timestamp', Value: new Date().toISOString() },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 36 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="dayday-financial-ledger.xlsx"',
        },
      });
    }

    // Default: CSV Export
    const headers = ['entry_ref', 'entry_date', 'entry_type', 'category', 'amount', 'payment_method', 'status', 'reference'];
    const csv = [
      headers,
      ...rows.map((row) =>
        headers.map((header) => `"${String(row[header as keyof typeof row] ?? '').replaceAll('"', '""')}"`)
      ),
    ]
      .map((row) => row.join(','))
      .join('\r\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dayday-ledger.csv"',
      },
    });
  } catch (error: any) {
    console.error('Export handler error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
