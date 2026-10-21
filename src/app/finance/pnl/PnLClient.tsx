'use client';

import React, { useState, useMemo } from 'react';
import {
  Banknote,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Info,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, calculateFinancialSummary } from '@/lib/utils';
import { Invoice, Expense, Payment, Service } from '@/types/database';

interface Props {
  invoices: Invoice[];
  expenses: Expense[];
  payments: Payment[];
  services: Service[];
}

export default function PnLClient({ invoices, expenses, payments, services }: Props) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  // Filter calculations based on period
  const filtered = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filteredInvoices = invoices.filter((i) => new Date(i.issue_date) >= startDate);
    const filteredExpenses = expenses.filter(
      (e) => new Date(e.date_incurred) >= startDate && e.status !== 'rejected'
    );
    const filteredPayments = payments.filter((p) => new Date(p.payment_date) >= startDate);

    // 1. Accrual Basis: Recognized Revenue (Earned from services billed)
    const recognizedRevenue = filteredInvoices.reduce(
      (acc, inv) => acc + Number(inv.total_amount || 0),
      0
    );

    // 2. Recognized Expenses (Incurred for business operations)
    const recognizedExpenses = filteredExpenses.reduce(
      (acc, exp) => acc + Number(exp.amount || 0),
      0
    );

    // Direct Cost of Sales (cleaning materials & equipment maintenance)
    const costOfSales = filteredExpenses
      .filter((e) => e.category === 'cleaning_materials' || e.category === 'equipment_maintenance')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

    const grossProfit = recognizedRevenue - costOfSales;
    const grossMargin = recognizedRevenue > 0 ? (grossProfit / recognizedRevenue) * 100 : 0;

    // Net Profit Calculation
    const summary = calculateFinancialSummary(recognizedRevenue, recognizedExpenses);

    // 3. Cash Flow Basis (Actual money in vs money out)
    const cashInflow = filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const cashOutflow = filteredExpenses
      .filter((e) => e.status === 'paid' || e.status === 'approved')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const netCashFlow = cashInflow - cashOutflow;

    // Accounts Receivable (Outstanding balances)
    const accountsReceivable = filteredInvoices.reduce(
      (acc, inv) => acc + Number(inv.balance_due || 0),
      0
    );

    return {
      recognizedRevenue,
      recognizedExpenses,
      costOfSales,
      grossProfit,
      grossMargin: Math.round(grossMargin * 10) / 10,
      netProfit: summary.netProfit,
      profitMargin: summary.profitMargin,
      isProfitable: summary.isProfitable,
      cashInflow,
      cashOutflow,
      netCashFlow,
      accountsReceivable,
      filteredInvoices,
      filteredExpenses,
    };
  }, [invoices, expenses, payments, period]);

  // Aggregate monthly chart data
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const data = months.map((month) => ({
      name: month,
      revenue: 0,
      expenses: 0,
      profit: 0,
    }));

    invoices.forEach((inv) => {
      const d = new Date(inv.issue_date);
      if (d.getFullYear() === currentYear) {
        data[d.getMonth()].revenue += Number(inv.total_amount || 0);
      }
    });

    expenses.forEach((exp) => {
      if (exp.status !== 'rejected') {
        const d = new Date(exp.date_incurred);
        if (d.getFullYear() === currentYear) {
          data[d.getMonth()].expenses += Number(exp.amount || 0);
        }
      }
    });

    data.forEach((item) => {
      item.profit = item.revenue - item.expenses;
    });

    return data;
  }, [invoices, expenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filteredExpenses.forEach((exp) => {
      const cat = exp.category.replace('_', ' ');
      map[cat] = (map[cat] || 0) + Number(exp.amount || 0);
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered.filteredExpenses]);

  return (
    <div className="space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Profit and Loss (P&L) Statement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Financial accounting performance, margin analysis, and cash flow reconciliation in Ghana Cedis (GH₵).
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-semibold">
          {(['month', 'quarter', 'year', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'month'
                ? 'This Month'
                : p === 'quarter'
                ? 'This Quarter'
                : p === 'year'
                ? 'This Year'
                : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Accounting Methodology Callout */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Accounting Basis & Formula Specification:</p>
          <p className="text-blue-800 leading-relaxed">
            P&L performance is calculated on an <strong>Accrual Basis</strong>: Revenue is recognized when service invoices are generated (independent of whether cash is collected). Expenses are recognized when incurred.
            <br />
            <strong>Net Profit = Recognized Revenue − Recognized Expenses</strong>.
            Cash collections and Mobile Money inflows are reported separately in the Cash Flow summary.
          </p>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recognized Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recognized Revenue
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(filtered.recognizedRevenue)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Total service billings for selected period
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Recognized Expenses
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            {formatCurrency(filtered.recognizedExpenses)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            All approved material, wage, & utility costs
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net Profit / Loss
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                filtered.isProfitable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {filtered.profitMargin}% margin
            </span>
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              filtered.isProfitable ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(filtered.netProfit)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Revenue − Expenses (Operating bottom line)
          </p>
        </div>

        {/* Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Net Cash Flow
          </span>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              filtered.netCashFlow >= 0 ? 'text-blue-600' : 'text-slate-700'
            }`}
          >
            {formatCurrency(filtered.netCashFlow)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Cash Inflow: {formatCurrency(filtered.cashInflow)}
          </p>
        </div>
      </div>

      {/* Monthly Financial Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Annual Fiscal Profitability Trend (GH₵)
            </h3>
            <p className="text-xs text-slate-500">
              Monthly revenue, expenses, and calculated net profit curve
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(val: any) => formatCurrency(Number(val))}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formal P&L Statement Table & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formal Income Statement Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Formal Income Statement</h3>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              <tr className="font-bold text-slate-900">
                <td className="py-2.5">Gross Recognized Service Revenue</td>
                <td className="py-2.5 text-right font-mono">{formatCurrency(filtered.recognizedRevenue)}</td>
              </tr>
              <tr className="text-slate-600">
                <td className="py-2.5 pl-4">Less: Direct Cleaning Materials & Consumables</td>
                <td className="py-2.5 text-right font-mono text-red-600">-{formatCurrency(filtered.costOfSales)}</td>
              </tr>
              <tr className="font-bold bg-slate-50 text-slate-900">
                <td className="py-2.5 pl-2">Gross Profit</td>
                <td className="py-2.5 text-right font-mono text-blue-600">{formatCurrency(filtered.grossProfit)}</td>
              </tr>
              <tr className="text-slate-500 italic">
                <td className="py-1.5 pl-4">Gross Margin %</td>
                <td className="py-1.5 text-right">{filtered.grossMargin}%</td>
              </tr>
              <tr className="font-bold text-slate-700">
                <td className="py-2.5 pt-4">Operating Overhead Expenses:</td>
                <td className="py-2.5 pt-4"></td>
              </tr>
              {categoryBreakdown.map(([cat, val]) => (
                <tr key={cat} className="text-slate-600">
                  <td className="py-1.5 pl-6 capitalize">{cat}</td>
                  <td className="py-1.5 text-right font-mono">-{formatCurrency(val)}</td>
                </tr>
              ))}
              <tr className="font-extrabold text-sm border-t-2 border-slate-900 bg-blue-50/50">
                <td className="py-3 pl-2 text-slate-900">NET PROFIT BEFORE TAX</td>
                <td
                  className={`py-3 text-right font-mono ${
                    filtered.isProfitable ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(filtered.netProfit)}
                </td>
              </tr>
              <tr className="text-slate-500 italic">
                <td className="py-1.5 pl-4">Net Profit Margin %</td>
                <td className="py-1.5 text-right">{filtered.profitMargin}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Accounts Receivable and Liquidity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Balance Sheet Position</h3>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-semibold">Accounts Receivable (Pending Invoices):</span>
              <p className="text-xl font-extrabold text-red-600">
                {formatCurrency(filtered.accountsReceivable)}
              </p>
              <p className="text-[11px] text-slate-400">
                Earned revenue not yet collected into cash
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-semibold">Actual Cash Inflows (MoMo / Bank):</span>
              <p className="text-xl font-extrabold text-emerald-600">
                {formatCurrency(filtered.cashInflow)}
              </p>
              <p className="text-[11px] text-slate-400">
                Total verified customer payments received
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-semibold">Net Cash Flow:</span>
              <p
                className={`text-xl font-extrabold ${
                  filtered.netCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(filtered.netCashFlow)}
              </p>
              <p className="text-[11px] text-slate-400">
                Cash collected minus expenses paid
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
