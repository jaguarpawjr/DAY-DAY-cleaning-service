import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value: unknown) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { id } = await params;
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === '1';

    const adminClient = createAdminClient();

    const [invoiceResult, itemsResult, paymentsResult, settingsResult] = await Promise.all([
      adminClient.from('invoices').select('*, client:clients(*)').eq('id', id).single(),
      adminClient.from('invoice_items').select('*').eq('invoice_id', id).order('created_at'),
      adminClient.from('payments').select('*').eq('invoice_id', id).eq('status', 'verified').order('payment_date'),
      adminClient.from('company_settings').select('*').maybeSingle(),
    ]);

    if (invoiceResult.error || !invoiceResult.data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.data;
    const client = invoice.client;
    const settings = settingsResult.data;
    const items = itemsResult.data || [];
    const payments = paymentsResult.data || [];

    const itemRows = items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.description)}</td>
            <td class="number">${escapeHtml(item.quantity)}</td>
            <td class="number">${money(item.unit_price)}</td>
            <td class="number">${money(item.total_price)}</td>
          </tr>`
      )
      .join('');

    const paymentRows = payments
      .map(
        (p) => `
          <tr>
            <td>${escapeHtml(p.payment_ref)}</td>
            <td>${escapeHtml(p.payment_date)}</td>
            <td>${escapeHtml(String(p.payment_method).toUpperCase())}</td>
            <td>${escapeHtml(p.reference_number || '—')}</td>
            <td class="number" style="color: #059669; font-weight: bold;">+${money(p.amount)}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; background: #fff; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #2563eb; }
    h1 { margin: 0 0 6px; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
    h2 { margin: 0; font-size: 26px; color: #2563eb; font-weight: 800; }
    p { margin: 3px 0; color: #475569; }
    .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; }
    .status-badge { display: inline-block; margin-top: 6px; padding: 4px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-radius: 9999px; letter-spacing: 0.5px; ${
      invoice.status === 'paid'
        ? 'background: #dcfce7; color: #166534;'
        : invoice.status === 'partially_paid'
        ? 'background: #dbeafe; color: #1e40af;'
        : 'background: #fee2e2; color: #991b1b;'
    } }
    .meta { display: flex; justify-content: space-between; gap: 40px; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8fafc; color: #475569; text-align: left; font-size: 10px; text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; }
    .number { text-align: right; white-space: nowrap; }
    .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px; gap: 24px; }
    .instructions { flex: 1; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    .summary { width: 300px; margin-left: auto; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .summary div { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { border-top: 2px solid #cbd5e1; font-size: 15px; font-weight: 800; padding-top: 10px !important; color: #0f172a; }
    .balance { font-size: 16px; font-weight: 800; color: ${Number(invoice.balance_due) > 0 ? '#dc2626' : '#16a34a'}; border-top: 1px solid #e2e8f0; padding-top: 8px !important; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(settings?.company_name || '')}</h1>
      <p style="color: #2563eb; font-weight: 600;">${escapeHtml(settings?.tagline || '')}</p>
      <p>${escapeHtml(settings?.address || 'Spintex Road, Flowerpot, Accra, Ghana')}</p>
      <p>Phone: ${escapeHtml(settings?.phone || '+233 24 555 8899')} • Email: ${escapeHtml(settings?.email || 'billing@daydaysparkle.com')}</p>
    </div>
    <div style="text-align:right">
      <div class="label">Official Invoice</div>
      <h2>${escapeHtml(invoice.invoice_number)}</h2>
      <span class="status-badge">${escapeHtml(invoice.status).replace('_', ' ')}</span>
    </div>
  </header>

  <div class="meta">
    <div>
      <div class="label">Billed To:</div>
      <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(client?.name)}</strong>
      ${client?.company_name ? `<p style="font-weight: 600;">${escapeHtml(client.company_name)}</p>` : ''}
      <p>${escapeHtml(client?.service_address)}</p>
      <p>Phone: ${escapeHtml(client?.phone)}</p>
    </div>
    <div style="text-align:right">
      <div class="label">Invoice Details:</div>
      <p><strong>Issue Date:</strong> ${escapeHtml(invoice.issue_date)}</p>
      <p><strong>Payment Due:</strong> <span style="color: #dc2626; font-weight: bold;">${escapeHtml(invoice.due_date)}</span></p>
      <p><strong>Currency:</strong> Ghana Cedis (GH₵)</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="number">Qty</th>
        <th class="number">Unit Price</th>
        <th class="number">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${payments.length > 0 ? `
  <div style="margin-top: 24px;">
    <div class="label" style="color: #059669;">Payments Received On This Invoice</div>
    <table>
      <thead>
        <tr>
          <th>Payment Receipt</th>
          <th>Date</th>
          <th>Payment Method</th>
          <th>Reference Code</th>
          <th class="number">Amount Paid</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>` : ''}

  <div class="summary-container">
    <div class="instructions">
      <div class="label">Payment Instructions</div>
      <p style="margin-top: 6px; font-weight: 600; color: #1e293b;">${escapeHtml(invoice.payment_instructions || 'Mobile Money to 0245558899 or Ecobank Ghana transfer.')}</p>
      <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Please quote invoice number <strong>${escapeHtml(invoice.invoice_number)}</strong> on your transfer reference.</p>
    </div>

    <div class="summary">
      <div><span>Subtotal</span><strong>${money(invoice.subtotal)}</strong></div>
      ${Number(invoice.discount_amount) > 0 ? `<div><span>Discount</span><strong style="color: #16a34a;">-${money(invoice.discount_amount)}</strong></div>` : ''}
      <div><span>Tax (${escapeHtml(invoice.tax_rate)}%)</span><strong>${money(invoice.tax_amount)}</strong></div>
      <div class="total"><span>Total Amount</span><strong>${money(invoice.total_amount)}</strong></div>
      <div><span>Total Paid</span><strong style="color: #16a34a;">${money(invoice.paid_amount)}</strong></div>
      <div class="balance"><span>Balance Due</span><strong>${money(invoice.balance_due)}</strong></div>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business! ${escapeHtml(settings?.company_name || '')}.</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': isDownload
          ? `attachment; filename="invoice-${invoice.invoice_number}.html"`
          : 'inline',
      },
    });
  } catch (error: any) {
    console.error('Invoice document error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
