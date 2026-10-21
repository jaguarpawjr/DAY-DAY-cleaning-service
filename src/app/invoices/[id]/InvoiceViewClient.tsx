'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice, InvoiceItem, Payment, CompanySettings } from '@/types/database';

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  payments: Payment[];
  settings: CompanySettings | null;
}

export default function InvoiceViewClient({ invoice, items, payments, settings }: Props) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(String(invoice.balance_due || invoice.total_amount));
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank_transfer' | 'cash'>('momo');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setShowPaymentModal(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Controls (Hidden on Print) */}
      <div className="no-print flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </Link>

        <div className="flex items-center gap-2">
          {Number(invoice.balance_due) > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Branded Official Invoice Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-lg space-y-8">
        {/* Company Header & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {settings?.company_name || 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE'}
                </h1>
                <p className="text-xs font-bold text-blue-600 tracking-wider">
                  {settings?.tagline || '“Satisfaction Guaranteed.”'}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 pt-1">
              <p>{settings?.address || 'Spintex Road, Flowerpot, Accra, Ghana'}</p>
              <p>Phone: {settings?.phone || '+233 24 555 8899'} • Email: {settings?.email || 'billing@daydaysparkle.com'}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              OFFICIAL INVOICE
            </span>
            <p className="text-2xl font-mono font-extrabold text-blue-600">
              {invoice.invoice_number}
            </p>
            <div className="pt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : invoice.status === 'partially_paid'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Invoice Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="text-base font-bold text-slate-900">{invoice.client?.name}</p>
            {invoice.client?.company_name && (
              <p className="font-semibold text-slate-700">{invoice.client.company_name}</p>
            )}
            <p className="text-slate-600 mt-1">{invoice.client?.service_address}</p>
            <p className="text-slate-500 mt-0.5">Phone: {invoice.client?.phone}</p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <h3 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Dates</h3>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-bold text-slate-800">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Payment Due:</span>
              <span className="font-bold text-red-600">{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Currency:</span>
              <span className="font-bold text-slate-800">Ghana Cedis (GH₵)</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{item.description}</td>
                  <td className="py-3.5 px-4 text-center">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Calculation */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
          <div className="max-w-xs space-y-2 text-xs">
            <p className="font-bold text-slate-700 uppercase tracking-wider">Payment Instructions:</p>
            <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {invoice.payment_instructions || 'Mobile Money to 0245558899 or Ecobank Ghana transfer.'}
            </p>
            <p className="text-[11px] text-slate-400 italic">
              Tagline: “Satisfaction Guaranteed.”
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (0%):</span>
              <span>GH₵0.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>Total Invoiced:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-red-600">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balance_due)}</span>
            </div>
          </div>
        </div>

        {/* Payments Recorded on this Invoice */}
        {payments.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Payment Transactions Received
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {payments.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-blue-600">{p.payment_ref}</span>
                    <span className="text-slate-500 ml-2">
                      via {p.payment_method.toUpperCase()}{' '}
                      {p.reference_number ? `(Ref: ${p.reference_number})` : ''} on {formatDate(p.payment_date)}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Record Customer Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Amount (GH₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="momo">MTN Mobile Money / Vodafone Cash</option>
                  <option value="bank_transfer">Bank Transfer (GCB / Ecobank)</option>
                  <option value="cash">Cash on Site</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transaction Reference / Approval Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20261021008472 or Cheque number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit for deep clean"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying...' : 'Save & Verify Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
