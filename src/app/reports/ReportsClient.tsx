'use client';

import React, { useState } from 'react';
import {
  Download,
  FileBarChart,
  Calendar,
  Banknote,
  TrendingUp,
  Briefcase,
  Package,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice, Expense, Job, Payment, Client, InventoryItem } from '@/types/database';

interface Props {
  invoices: Invoice[];
  expenses: Expense[];
  jobs: Job[];
  payments: Payment[];
  clients: Client[];
  inventoryItems: InventoryItem[];
}

export default function ReportsClient({
  invoices,
  expenses,
  jobs,
  payments,
  clients,
  inventoryItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expenses' | 'jobs' | 'inventory'>('revenue');

  // CSV Export utility
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRevenueCSV = () => {
    const headers = ['Invoice Number', 'Client Name', 'Issue Date', 'Total (GHS)', 'Paid (GHS)', 'Balance Due (GHS)', 'Status'];
    const rows = invoices.map((i) => [
      i.invoice_number,
      i.client?.name || 'Client',
      i.issue_date,
      i.total_amount,
      i.paid_amount,
      i.balance_due,
      i.status,
    ]);
    downloadCSV('dayday-revenue-report', headers, rows);
  };

  const exportExpensesCSV = () => {
    const headers = ['Expense Number', 'Description', 'Category', 'Date', 'Amount (GHS)', 'Payment Method', 'Status'];
    const rows = expenses.map((e) => [
      e.expense_number,
      e.description,
      e.category,
      e.date_incurred,
      e.amount,
      e.payment_method,
      e.status,
    ]);
    downloadCSV('dayday-expenses-report', headers, rows);
  };

  const exportJobsCSV = () => {
    const headers = ['Job Number', 'Client', 'Service', 'Date', 'Price (GHS)', 'Location', 'Status'];
    const rows = jobs.map((j) => [
      j.job_number,
      j.client?.name || 'Client',
      j.service?.name || 'Service',
      j.scheduled_date,
      j.agreed_price,
      j.location,
      j.status,
    ]);
    downloadCSV('dayday-jobs-report', headers, rows);
  };

  const exportInventoryCSV = () => {
    const headers = ['SKU', 'Item Name', 'Category', 'Qty on Hand', 'Unit', 'Unit Cost (GHS)', 'Condition'];
    const rows = inventoryItems.map((it) => [
      it.sku,
      it.name,
      it.category,
      it.quantity_on_hand,
      it.unit_of_measure,
      it.unit_cost,
      it.equipment_condition,
    ]);
    downloadCSV('dayday-inventory-report', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Analytics & Exportable Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Export operational, financial, and inventory data to CSV / Excel spreadsheets.
          </p>
        </div>

        {/* Export trigger */}
        <div>
          {activeTab === 'revenue' && (
            <button
              onClick={exportRevenueCSV}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Revenue Report (CSV)</span>
            </button>
          )}
          {activeTab === 'expenses' && (
            <button
              onClick={exportExpensesCSV}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Expenses Report (CSV)</span>
            </button>
          )}
          {activeTab === 'jobs' && (
            <button
              onClick={exportJobsCSV}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Jobs Report (CSV)</span>
            </button>
          )}
          {activeTab === 'inventory' && (
            <button
              onClick={exportInventoryCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Inventory Report (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'revenue'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Revenue & Billing ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Operating Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Field Cleaning Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Inventory Stock ({inventoryItems.length})
        </button>
      </div>

      {/* Active Tab Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'revenue' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.client?.name}</td>
                    <td className="py-3 px-4">{formatDate(inv.issue_date)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(inv.total_amount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">{formatCurrency(inv.balance_due)}</td>
                    <td className="py-3 px-4 capitalize">{inv.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'expenses' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Expense #</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{exp.expense_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{exp.description}</td>
                    <td className="py-3 px-4 capitalize">{exp.category.replace('_', ' ')}</td>
                    <td className="py-3 px-4">{formatDate(exp.date_incurred)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="py-3 px-4 capitalize">{exp.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'jobs' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Job #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4 text-right">Agreed Price</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{j.job_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{j.client?.name}</td>
                    <td className="py-3 px-4">{j.service?.name}</td>
                    <td className="py-3 px-4">{formatDate(j.scheduled_date)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(j.agreed_price)}</td>
                    <td className="py-3 px-4 capitalize">{j.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inventory' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Quantity on Hand</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventoryItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{it.sku}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{it.name}</td>
                    <td className="py-3 px-4 capitalize">{it.category.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-right font-bold">{it.quantity_on_hand} {it.unit_of_measure}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(it.unit_cost)}</td>
                    <td className="py-3 px-4 capitalize">{it.equipment_condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
