'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Client } from '@/types/database';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client_id');

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Payment via Mobile Money to 0245558899 (MTN - DAYDAY SPARKLE AND SHINE) or bank transfer to Ecobank Ghana (A/C: 1441002233445).'
  );
  const [notes, setNotes] = useState('Satisfaction Guaranteed.');

  const [items, setItems] = useState<LineItem[]>([
    { description: 'Residential Deep Cleaning Service', quantity: 1, unit_price: 350 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.from('clients').select('*').order('name');
      if (data) {
        setClients(data as Client[]);
        if (preselectedClientId) setSelectedClientId(preselectedClientId);
        else if (data.length > 0) setSelectedClientId(data[0].id);
      }
    }
    loadClients();
  }, [preselectedClientId, supabase]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const updateItem = (idx: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    setItems(updated);
  };

  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const discount = parseFloat(discountAmount || '0') || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setErrorMessage('Please select a customer for this invoice.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Generate Invoice Number
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const invoiceNumber = `INV-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

      // 2. Insert Invoice
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_id: selectedClientId,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal,
          tax_rate: 0,
          tax_amount: 0,
          discount_amount: discount,
          total_amount: totalAmount,
          paid_amount: 0,
          balance_due: totalAmount,
          status: 'sent',
          payment_instructions: paymentInstructions,
          notes,
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // 3. Insert Invoice Items
      for (const item of items) {
        await supabase.from('invoice_items').insert({
          invoice_id: invoice.id,
          description: item.description || 'Cleaning Service',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        });
      }

      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Create Official Invoice</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Customer *
              </label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Customer --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Services & Billing Line Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Description of service / equipment"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Rate (GH₵)"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right font-bold"
                  />
                  <div className="w-24 text-right font-bold text-xs text-slate-800">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-end gap-2 text-xs">
            <div className="flex justify-between w-64">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center w-64">
              <span className="text-slate-500">Discount (GH₵):</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right text-xs"
              />
            </div>
            <div className="flex justify-between w-64 pt-2 border-t border-slate-200 text-sm font-extrabold text-blue-600">
              <span>Total Balance Due:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Instructions
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Terms
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/invoices"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Issuing...' : 'Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <React.Suspense fallback={<div className="max-w-4xl mx-auto py-12 text-center text-xs font-semibold text-slate-500">Loading invoice form...</div>}>
      <NewInvoiceContent />
    </React.Suspense>
  );
}
