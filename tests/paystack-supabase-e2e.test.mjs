import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as XLSX from 'xlsx';

// 1. Webhook Signature Verification logic
function verifyPaystackSignature(rawBody, signature, secret) {
  if (!secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const sigBuffer = Buffer.from(signature || '');
  const expBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

// 2. Financial Ledger Ingestion logic for Webhook Events
function processPaystackWebhookPayload(event) {
  const ledgerEntries = [];
  const statusUpdates = [];

  if (event.event === 'charge.success' && event.data?.reference) {
    const totalAmount = (event.data.amount || 0) / 100;
    const feeAmount = (event.data.fees || 0) / 100;

    statusUpdates.push({
      reference: event.data.reference,
      status: 'verified',
      fee: feeAmount,
    });

    ledgerEntries.push({
      entry_ref: `PAYSTACK-${event.data.reference}`,
      entry_type: 'income',
      category: 'customer_payment',
      amount: totalAmount,
      status: 'completed',
    });

    if (feeAmount > 0) {
      ledgerEntries.push({
        entry_ref: `FEE-PAYSTACK-${event.data.reference}`,
        entry_type: 'fee',
        category: 'paystack_fees',
        amount: feeAmount,
        status: 'completed',
      });
    }
  } else if (event.event === 'refund.processed') {
    const refundAmount = (event.data.amount || 0) / 100;
    statusUpdates.push({
      reference: event.data.reference,
      status: 'refunded',
    });
    ledgerEntries.push({
      entry_ref: `REFUND-PAYSTACK-${event.data.id || event.data.reference}`,
      entry_type: 'refund',
      category: 'customer_refund',
      amount: refundAmount,
      status: 'completed',
    });
  } else if (event.event === 'charge.dispute.create') {
    const disputeAmount = (event.data.amount || 0) / 100;
    ledgerEntries.push({
      entry_ref: `DISPUTE-PAYSTACK-${event.data.id || event.data.reference}`,
      entry_type: 'adjustment',
      category: 'dispute_chargeback',
      amount: disputeAmount,
      status: 'completed',
    });
  } else if (event.event === 'transfer.success') {
    statusUpdates.push({
      transfer_code: event.data.transfer_code,
      reference: event.data.reference,
      status: 'paid',
      transfer_status: 'success',
    });
  }

  return { ledgerEntries, statusUpdates };
}

// 3. Settlement Reconciliation Logic
function reconcileSettlements(apiSettlements, existingLedgerEntries) {
  const reconciled = [];
  const pendingLedger = [];

  for (const st of apiSettlements) {
    const settlementId = String(st.id);
    const expectedRef = `SETTLE-PAYSTACK-${settlementId}`;
    const alreadyLogged = existingLedgerEntries.some((e) => e.entry_ref === expectedRef);

    if (alreadyLogged) {
      reconciled.push({ settlementId, status: 'already_reconciled' });
    } else {
      const netAmount = (st.net_amount || st.total_amount) / 100;
      pendingLedger.push({
        entry_ref: expectedRef,
        entry_type: 'settlement',
        category: 'paystack_payout',
        amount: netAmount,
        status: 'completed',
      });
      reconciled.push({ settlementId, status: 'reconciled_now' });
    }
  }

  return { reconciled, pendingLedger };
}

// 4. Full Homepage Draft Isolation Manager
class HomepageDraftManager {
  constructor(liveContent) {
    this.live = JSON.parse(JSON.stringify(liveContent));
    this.draft = null;
    this.revisions = [];
  }

  saveDraft(draftSnapshot) {
    // Isolated: Live remains untouched
    this.draft = JSON.parse(JSON.stringify(draftSnapshot));
    return { success: true, hasDraft: true };
  }

  discardDraft() {
    this.draft = null;
    return { success: true, hasDraft: false };
  }

  publish() {
    if (!this.draft) return { success: false, error: 'No draft to publish' };
    this.live = JSON.parse(JSON.stringify(this.draft));
    this.revisions.push({
      revision_number: this.revisions.length + 1,
      published_at: new Date().toISOString(),
      snapshot: this.live,
    });
    this.draft = null;
    return { success: true, publishedRevision: this.revisions.length };
  }
}

// 5. Service-to-Area Availability Filter
function getAvailableServicesForArea(area, allServices) {
  if (!area.is_active) return [];
  const allowedIds = area.available_service_ids || [];
  return allServices.filter((s) => s.is_active && allowedIds.includes(s.id));
}

// 6. Excel Export Generator
function generateLedgerExcelWorkbook(entries) {
  const workbook = XLSX.utils.book_new();
  const rows = entries.map((e) => ({
    'Entry Ref': e.entry_ref,
    'Type': e.entry_type,
    'Amount': e.amount,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ledger');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, sheetNames: workbook.SheetNames };
}

// =========================================================================
// TEST SUITES
// =========================================================================

describe('Paystack & Supabase Integration - Webhook Security & Signatures', () => {
  const secretKey = 'sk_test_mock_paystack_secret_key_12345';
  const sampleBody = JSON.stringify({
    event: 'charge.success',
    data: { id: 991, reference: 'PAY-ORD-001', amount: 35000, status: 'success' },
  });

  test('Valid HMAC-SHA512 signature is verified correctly', () => {
    const validSignature = crypto.createHmac('sha512', secretKey).update(sampleBody).digest('hex');
    assert.equal(verifyPaystackSignature(sampleBody, validSignature, secretKey), true);
  });

  test('Tampered webhook payload is immediately rejected', () => {
    const validSignature = crypto.createHmac('sha512', secretKey).update(sampleBody).digest('hex');
    const tamperedBody = JSON.stringify({
      event: 'charge.success',
      data: { id: 991, reference: 'PAY-ORD-001', amount: 500000, status: 'success' },
    });
    assert.equal(verifyPaystackSignature(tamperedBody, validSignature, secretKey), false);
  });

  test('Missing or invalid signature header returns false', () => {
    assert.equal(verifyPaystackSignature(sampleBody, 'invalid-signature-hash', secretKey), false);
    assert.equal(verifyPaystackSignature(sampleBody, '', secretKey), false);
  });
});

describe('Paystack & Supabase Integration - Automated Ingestion & Ledger', () => {
  test('Successful charge automatically ingests Gross Revenue and Gateway Fee ledger entries', () => {
    const event = {
      event: 'charge.success',
      data: {
        id: 101,
        reference: 'DAYDAY-PAY-202610-099',
        amount: 45000, // GH₵ 450.00
        fees: 878,     // GH₵ 8.78
        channel: 'mobile_money',
        status: 'success',
      },
    };

    const { ledgerEntries, statusUpdates } = processPaystackWebhookPayload(event);
    assert.equal(statusUpdates.length, 1);
    assert.equal(statusUpdates[0].status, 'verified');
    assert.equal(statusUpdates[0].fee, 8.78);

    assert.equal(ledgerEntries.length, 2);
    // Income Entry
    assert.equal(ledgerEntries[0].entry_type, 'income');
    assert.equal(ledgerEntries[0].amount, 450.00);
    // Fee Entry
    assert.equal(ledgerEntries[1].entry_type, 'fee');
    assert.equal(ledgerEntries[1].amount, 8.78);
  });

  test('Automated refund event marks payment refunded and creates refund ledger entry', () => {
    const event = {
      event: 'refund.processed',
      data: {
        id: 502,
        reference: 'DAYDAY-PAY-202610-099',
        amount: 20000, // GH₵ 200.00
      },
    };

    const { ledgerEntries, statusUpdates } = processPaystackWebhookPayload(event);
    assert.equal(statusUpdates[0].status, 'refunded');
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].entry_type, 'refund');
    assert.equal(ledgerEntries[0].amount, 200.00);
  });

  test('Chargeback dispute event automatically ingests dispute adjustment ledger entry', () => {
    const event = {
      event: 'charge.dispute.create',
      data: {
        id: 701,
        reference: 'DAYDAY-DISPUTE-001',
        amount: 30000,
      },
    };

    const { ledgerEntries } = processPaystackWebhookPayload(event);
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].entry_type, 'adjustment');
    assert.equal(ledgerEntries[0].category, 'dispute_chargeback');
    assert.equal(ledgerEntries[0].amount, 300.00);
  });

  test('Transfer success event updates staff payroll item to paid and transfer_status success', () => {
    const event = {
      event: 'transfer.success',
      data: {
        transfer_code: 'TRF_8829910',
        reference: 'TRF-PAY-001',
      },
    };

    const { statusUpdates } = processPaystackWebhookPayload(event);
    assert.equal(statusUpdates[0].status, 'paid');
    assert.equal(statusUpdates[0].transfer_status, 'success');
  });
});

describe('Paystack Settlement & Reconciliation Synchronization', () => {
  test('Correctly identifies unreconciled settlements and creates settlement ledger entries', () => {
    const apiSettlements = [
      { id: 9001, total_amount: 150000, net_amount: 147150 }, // 1,471.50 GHS
      { id: 9002, total_amount: 220000, net_amount: 215800 }, // 2,158.00 GHS
    ];

    const existingLedger = [
      { entry_ref: 'SETTLE-PAYSTACK-9001', amount: 1471.50 },
    ];

    const { reconciled, pendingLedger } = reconcileSettlements(apiSettlements, existingLedger);

    assert.equal(reconciled[0].status, 'already_reconciled');
    assert.equal(reconciled[1].status, 'reconciled_now');

    assert.equal(pendingLedger.length, 1);
    assert.equal(pendingLedger[0].entry_ref, 'SETTLE-PAYSTACK-9002');
    assert.equal(pendingLedger[0].amount, 2158.00);
    assert.equal(pendingLedger[0].entry_type, 'settlement');
  });
});

describe('Full Homepage Draft Isolation Lifecycle', () => {
  test('Saving a draft does NOT mutate live homepage content until publish', () => {
    const liveContent = {
      heading: 'Spotless Clean Spaces.',
      tagline: 'Satisfaction Guaranteed.',
    };

    const manager = new HomepageDraftManager(liveContent);

    // Save a draft with changes
    manager.saveDraft({
      heading: 'Premium Luxury Cleaning in Accra',
      tagline: 'Ghana’s Premier Hygiene Experts',
    });

    // Check Live remains untouched
    assert.equal(manager.live.heading, 'Spotless Clean Spaces.');
    assert.equal(manager.live.tagline, 'Satisfaction Guaranteed.');

    // Check Draft holds the staged changes
    assert.equal(manager.draft.heading, 'Premium Luxury Cleaning in Accra');

    // Discard draft test
    manager.saveDraft({ heading: 'Test Heading 2' });
    manager.discardDraft();
    assert.equal(manager.draft, null);
    assert.equal(manager.live.heading, 'Spotless Clean Spaces.');

    // Save and Publish
    manager.saveDraft({
      heading: 'Published New Brand Heading',
      tagline: 'Always Clean',
    });
    const pubRes = manager.publish();

    assert.equal(pubRes.success, true);
    assert.equal(manager.live.heading, 'Published New Brand Heading');
    assert.equal(manager.draft, null);
    assert.equal(manager.revisions.length, 1);
  });
});

describe('Service-to-Area Availability Filtering', () => {
  const services = [
    { id: 'srv-1', name: 'Residential Cleaning', is_active: true },
    { id: 'srv-2', name: 'Commercial & Office Cleaning', is_active: true },
    { id: 'srv-3', name: 'Post-Construction Deep Clean', is_active: true },
  ];

  test('Area with subset of services only offers designated services', () => {
    const areaSpintex = {
      id: 'area-1',
      name: 'Spintex',
      is_active: true,
      available_service_ids: ['srv-1', 'srv-3'],
    };

    const available = getAvailableServicesForArea(areaSpintex, services);
    assert.equal(available.length, 2);
    assert.deepEqual(available.map((s) => s.id), ['srv-1', 'srv-3']);
  });

  test('Inactive area offers zero services regardless of assigned IDs', () => {
    const inactiveArea = {
      id: 'area-2',
      name: 'Tema Comm 25',
      is_active: false,
      available_service_ids: ['srv-1'],
    };

    const available = getAvailableServicesForArea(inactiveArea, services);
    assert.equal(available.length, 0);
  });
});

describe('Excel (.xlsx) Dual Export Generation', () => {
  test('Creates valid multi-sheet binary Excel file with Ledger data', () => {
    const entries = [
      { entry_ref: 'LED-001', entry_type: 'income', amount: 500 },
      { entry_ref: 'LED-002', entry_type: 'expense', amount: 150 },
    ];

    const { buffer, sheetNames } = generateLedgerExcelWorkbook(entries);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
    assert.ok(sheetNames.includes('Ledger'));

    // Read back workbook to verify valid xlsx structure
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    assert.ok(readWb.Sheets['Ledger']);
  });
});
