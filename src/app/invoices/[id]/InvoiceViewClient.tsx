'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice, InvoiceItem, Payment, CompanySettings } from '@/types/database';

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  payments: Payment[];
  settings: CompanySettings | null;
}

export default function InvoiceViewClient({
  invoice: initialInvoice,
  items,
  payments: initialPayments,
  settings,
}: Props) {
  const router = useRouter();
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>(initialInvoice);
  const [currentPayments, setCurrentPayments] = useState<Payment[]>(initialPayments);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(
    String(initialInvoice.balance_due || initialInvoice.total_amount)
  );
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank_transfer' | 'cash' | 'paystack'>('momo');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preview & Download
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  // Individual payment verification state
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  const handlePreviewDownload = async () => {
    setIsPreparingDownload(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/admin/invoices/${currentInvoice.id}/document`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to prepare invoice document');
      }
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to prepare invoice download');
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `invoice-${currentInvoice.invoice_number}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // If payment method is paystack, verify directly with Paystack API
      if (paymentMethod === 'paystack') {
        if (!referenceNumber.trim()) {
          throw new Error('Please enter the Paystack transaction reference to verify.');
        }

        const verifyRes = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: referenceNumber.trim(),
            invoice_id: currentInvoice.id,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok && verifyRes.status !== 202) {
          throw new Error(verifyData.error || 'Failed to verify Paystack payment');
        }

        if (verifyData.status !== 'verified') {
          throw new Error(verifyData.message || 'Payment is still pending on Paystack.');
        }

        if (verifyData.updatedInvoice) {
          setCurrentInvoice(verifyData.updatedInvoice);
          setPaymentAmount(String(verifyData.updatedInvoice.balance_due || '0'));
        }
        if (verifyData.payments) {
          setCurrentPayments(verifyData.payments);
        }

        setSuccessMessage('Paystack payment verified and invoice balance updated successfully!');
        setShowPaymentModal(false);
        setReferenceNumber('');
        setPaymentNotes('');
        router.refresh();
        return;
      }

      // Record MoMo, Bank Transfer, or Cash
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: currentInvoice.id,
          client_id: currentInvoice.client_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      if (data.updatedInvoice) {
        setCurrentInvoice(data.updatedInvoice);
        setPaymentAmount(String(data.updatedInvoice.balance_due || '0'));
      }
      if (data.payments) {
        setCurrentPayments(data.payments);
      }

      setSuccessMessage('Payment recorded and verified successfully. Balance updated.');
      setShowPaymentModal(false);
      setReferenceNumber('');
      setPaymentNotes('');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyPaystackPayment = async (reference: string, paymentId: string) => {
    setVerifyingPaymentId(paymentId);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/payments/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.trim(),
          invoice_id: currentInvoice.id,
        }),
      });

      const data = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(data.error || 'Unable to verify payment with Paystack');
      }

      if (data.status === 'verified') {
        if (data.updatedInvoice) {
          setCurrentInvoice(data.updatedInvoice);
          setPaymentAmount(String(data.updatedInvoice.balance_due || '0'));
        }
        if (data.payments) {
          setCurrentPayments(data.payments);
        }
        setSuccessMessage(`Payment reference ${reference} successfully verified!`);
        router.refresh();
      } else {
        setErrorMessage(data.message || 'Transaction is still pending on Paystack');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation & Action Controls */}
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </Link>

        <div className="flex items-center gap-2">
          {Number(currentInvoice.balance_due) > 0 && (
            <button
              onClick={() => {
                setPaymentAmount(String(currentInvoice.balance_due));
                setErrorMessage(null);
                setShowPaymentModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handlePreviewDownload}
            disabled={isPreparingDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isPreparingDownload ? 'Preparing Preview...' : 'Download Invoice'}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">✕</button>
        </div>
      )}

      {/* Branded Official Invoice Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-lg space-y-8">
        {/* Company Header & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.company_name || 'Company logo'}
                  className="w-12 h-12 rounded-2xl border border-slate-200 object-contain shadow-md"
                />
              ) : null}
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {settings?.company_name || ''}
                </h1>
                <p className="text-xs font-bold text-blue-600 tracking-wider">
                  {settings?.tagline || ''}
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
              {currentInvoice.invoice_number}
            </p>
            <div className="pt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  currentInvoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentInvoice.status === 'partially_paid'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {currentInvoice.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Invoice Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="text-base font-bold text-slate-900">{currentInvoice.client?.name}</p>
            {currentInvoice.client?.company_name && (
              <p className="font-semibold text-slate-700">{currentInvoice.client.company_name}</p>
            )}
            <p className="text-slate-600 mt-1">{currentInvoice.client?.service_address}</p>
            <p className="text-slate-500 mt-0.5">Phone: {currentInvoice.client?.phone}</p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <h3 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Dates</h3>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-bold text-slate-800">{formatDate(currentInvoice.issue_date)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500">Payment Due:</span>
              <span className="font-bold text-red-600">{formatDate(currentInvoice.due_date)}</span>
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
              {currentInvoice.payment_instructions || 'Mobile Money to 0245558899 or Ecobank Ghana transfer.'}
            </p>
            <p className="text-[11px] text-slate-400 italic">
              {settings?.tagline || ''}
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800">{formatCurrency(currentInvoice.subtotal)}</span>
            </div>
            {Number(currentInvoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatCurrency(currentInvoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (0%):</span>
              <span>GH₵0.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>Total Invoiced:</span>
              <span>{formatCurrency(currentInvoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(currentInvoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-red-600">
              <span>Balance Due:</span>
              <span>{formatCurrency(currentInvoice.balance_due)}</span>
            </div>
          </div>
        </div>

        {/* Payments Recorded on this Invoice */}
        {currentPayments.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Payment Transactions Received
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {currentPayments.map((p) => {
                const paystackRef = (p as any).paystack_reference || p.reference_number;
                const isPaystack = p.payment_method === 'paystack';
                const isVerified = p.status === 'verified';
                const isCurrentlyVerifying = verifyingPaymentId === p.id;

                return (
                  <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600">{p.payment_ref}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isVerified ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        via {p.payment_method.toUpperCase()}{' '}
                        {p.reference_number ? `(Ref: ${p.reference_number})` : ''} on {formatDate(p.payment_date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600 text-sm">+{formatCurrency(p.amount)}</span>
                      {isPaystack && !isVerified && paystackRef && (
                        <button
                          type="button"
                          onClick={() => verifyPaystackPayment(paystackRef, p.id)}
                          disabled={isCurrentlyVerifying}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isCurrentlyVerifying ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verify Paystack</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Download Preview Modal (Rendered at Top Level) */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Invoice Preview: {currentInvoice.invoice_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the official invoice document below before downloading.
                </p>
              </div>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close invoice preview"
              >
                ✕
              </button>
            </div>
            <iframe
              src={previewUrl}
              title={`Preview of invoice ${currentInvoice.invoice_number}`}
              className="w-full flex-1 rounded-xl border border-slate-200 bg-white shadow-inner"
            />
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Confirm Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Customer Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invoice balance due: <strong className="text-red-600">{formatCurrency(currentInvoice.balance_due)}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
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
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="momo">📱 MTN Mobile Money / Vodafone Cash</option>
                  <option value="paystack">💳 Paystack (Verify Online Card / MoMo Reference)</option>
                  <option value="bank_transfer">🏦 Bank Transfer (GCB / Ecobank)</option>
                  <option value="cash">💵 Cash on Site</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Amount (GH₵) *
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
                  {paymentMethod === 'paystack'
                    ? 'Paystack Transaction Reference *'
                    : 'Transaction Reference / Approval Code'}
                </label>
                <input
                  type="text"
                  required={paymentMethod === 'paystack'}
                  placeholder={
                    paymentMethod === 'paystack'
                      ? 'e.g. T6284910294 or ref_...'
                      : 'e.g. 20261021008472 or Cheque number'
                  }
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {paymentMethod === 'paystack' && (
                  <p className="text-[11px] text-blue-600 mt-1">
                    Entering the Paystack reference will verify directly with Paystack’s API and automatically credit this invoice.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cleaning job deposit or full settlement"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{paymentMethod === 'paystack' ? 'Verifying with Paystack...' : 'Saving Payment...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{paymentMethod === 'paystack' ? 'Verify & Apply Payment' : 'Save & Verify Payment'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
