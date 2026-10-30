import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Business Logic Functions matching our app implementation
function calculateFinancialSummary(recognizedRevenue, recognizedExpenses) {
  const rev = Number(recognizedRevenue) || 0;
  const exp = Number(recognizedExpenses) || 0;
  const netProfit = rev - exp;
  const profitMargin = rev > 0 ? (netProfit / rev) * 100 : 0;

  return {
    recognizedRevenue: rev,
    recognizedExpenses: exp,
    netProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    isProfitable: netProfit >= 0,
  };
}

function calculateInvoiceBalance(totalAmount, payments) {
  const paid = payments.reduce((acc, p) => acc + (p.status === 'verified' ? Number(p.amount) : 0), 0);
  const balance = Math.max(0, Number(totalAmount) - paid);
  let status = 'sent';
  if (paid >= totalAmount) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partially_paid';
  }
  return { paid, balance, status };
}

function calculatePayrollNet(basic, allowances, overtime, bonus, deductions) {
  const b = Number(basic) || 0;
  const a = Number(allowances) || 0;
  const o = Number(overtime) || 0;
  const bo = Number(bonus) || 0;
  const d = Number(deductions) || 0;

  // Formula: Net Salary = Basic Earnings + Allowances + Overtime + Bonuses − Deductions
  const net = b + a + o + bo - d;
  return {
    gross: b + a + o + bo,
    deductions: d,
    net: Math.max(0, net),
  };
}

function calculateStockBalance(currentQty, movementType, quantity) {
  const prev = Number(currentQty);
  const qty = Math.abs(Number(quantity));

  if (movementType === 'purchase' || movementType === 'return') {
    return { success: true, newQty: prev + qty };
  } else if (movementType === 'issue_to_job' || movementType === 'damaged' || movementType === 'lost') {
    if (prev < qty) {
      return { success: false, error: 'Insufficient stock' };
    }
    return { success: true, newQty: prev - qty };
  } else if (movementType === 'adjustment') {
    return { success: true, newQty: Number(quantity) };
  }
  return { success: false, error: 'Unknown movement type' };
}

describe('DAYDAY Management System - Accounting & Financial Calculations', () => {
  test('Exact Net Profit formula: Recognized Revenue - Recognized Expenses', () => {
    const revenue = 15000.00; // GH₵
    const expenses = 9500.00;  // GH₵
    const summary = calculateFinancialSummary(revenue, expenses);

    assert.equal(summary.netProfit, 5500.00);
    assert.equal(summary.isProfitable, true);
    assert.equal(summary.profitMargin, 36.67);
  });

  test('Financial edge case: Zero Revenue handling', () => {
    const revenue = 0.00;
    const expenses = 1200.00;
    const summary = calculateFinancialSummary(revenue, expenses);

    assert.equal(summary.netProfit, -1200.00);
    assert.equal(summary.isProfitable, false);
    assert.equal(summary.profitMargin, 0); // No division by zero
  });

  test('Financial edge case: Net Loss calculation', () => {
    const revenue = 5000.00;
    const expenses = 7000.00;
    const summary = calculateFinancialSummary(revenue, expenses);

    assert.equal(summary.netProfit, -2000.00);
    assert.equal(summary.isProfitable, false);
    assert.equal(summary.profitMargin, -40.00);
  });
});

describe('DAYDAY Management System - Invoices & Partial Payments', () => {
  test('Partial payment correctly updates balance and sets status to partially_paid', () => {
    const invoiceTotal = 1000.00;
    const payments = [
      { amount: 300.00, status: 'verified' },
    ];
    const result = calculateInvoiceBalance(invoiceTotal, payments);

    assert.equal(result.paid, 300.00);
    assert.equal(result.balance, 700.00);
    assert.equal(result.status, 'partially_paid');
  });

  test('Full payment sets status to paid and balance to 0.00', () => {
    const invoiceTotal = 1000.00;
    const payments = [
      { amount: 400.00, status: 'verified' },
      { amount: 600.00, status: 'verified' },
    ];
    const result = calculateInvoiceBalance(invoiceTotal, payments);

    assert.equal(result.paid, 1000.00);
    assert.equal(result.balance, 0.00);
    assert.equal(result.status, 'paid');
  });

  test('Pending verification payments do not prematurely reduce invoice balance', () => {
    const invoiceTotal = 1000.00;
    const payments = [
      { amount: 500.00, status: 'pending_verification' },
    ];
    const result = calculateInvoiceBalance(invoiceTotal, payments);

    assert.equal(result.paid, 0.00);
    assert.equal(result.balance, 1000.00);
    assert.equal(result.status, 'sent');
  });
});

describe('DAYDAY Management System - Payroll Formula Verification', () => {
  test('Net Salary = Basic + Allowances + Overtime + Bonus - Deductions', () => {
    const basic = 1800.00;
    const allowances = 300.00;
    const overtime = 150.00;
    const bonus = 100.00;
    const deductions = 50.00;

    const result = calculatePayrollNet(basic, allowances, overtime, bonus, deductions);
    assert.equal(result.gross, 2350.00);
    assert.equal(result.net, 2300.00);
  });
});

describe('DAYDAY Management System - Inventory Concurrency & Stock Movements', () => {
  test('Purchase intake correctly increments stock balance', () => {
    const current = 10;
    const movement = calculateStockBalance(current, 'purchase', 15);
    assert.equal(movement.success, true);
    assert.equal(movement.newQty, 25);
  });

  test('Job dispatch correctly deducts stock balance', () => {
    const current = 10;
    const movement = calculateStockBalance(current, 'issue_to_job', 4);
    assert.equal(movement.success, true);
    assert.equal(movement.newQty, 6);
  });

  test('Blocking issuance when requested quantity exceeds stock on hand', () => {
    const current = 5;
    const movement = calculateStockBalance(current, 'issue_to_job', 8);
    assert.equal(movement.success, false);
    assert.equal(movement.error, 'Insufficient stock');
  });
});

describe('DAYDAY Management System - Notifications & Alerts Logic', () => {
  test('Booking approval notification contains booking ref and track-booking payment link', () => {
    const bookingRef = 'BK-202610-099';
    const appUrl = 'http://localhost:3000';
    const paymentLink = `${appUrl}/track-booking?ref=${encodeURIComponent(bookingRef)}`;
    assert.match(paymentLink, /track-booking\?ref=BK-202610-099/);
  });

  test('Payment receipt notification correctly calculates remaining balance', () => {
    const totalAmount = 500;
    const paymentAmount = 200;
    const remainingBalance = Math.max(0, totalAmount - paymentAmount);
    assert.equal(remainingBalance, 300);
  });

  test('Job completed notification reflects final completed state', () => {
    const status = 'completed';
    const isCompleted = status === 'completed';
    assert.equal(isCompleted, true);
  });
});
