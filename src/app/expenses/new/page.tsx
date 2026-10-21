'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, TrendingUp, AlertCircle, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Supplier, ExpenseCategory } from '@/types/database';

export default function NewExpensePage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('cleaning_materials');
  const [amount, setAmount] = useState('');
  const [dateIncurred, setDateIncurred] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank_transfer' | 'cash'>('momo');
  const [supplierId, setSupplierId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadSuppliers() {
      const { data } = await supabase.from('suppliers').select('*').eq('is_active', true);
      if (data) setSuppliers(data as Supplier[]);
    }
    loadSuppliers();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      // Check current user role
      let isCurrentUserAdmin = false;
      if (currentUserId) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
        if (p?.role === 'admin') isCurrentUserAdmin = true;
      }

      // Generate Expense Number
      const { count } = await supabase.from('expenses').select('*', { count: 'exact', head: true });
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const expenseNumber = `EXP-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          description: description.trim(),
          category,
          amount: numAmount,
          date_incurred: dateIncurred,
          payment_method: paymentMethod,
          supplier_id: supplierId || null,
          receipt_url: receiptUrl.trim() || null,
          submitted_by: currentUserId || null,
          approved_by: isCurrentUserAdmin ? currentUserId : null,
          status: isCurrentUserAdmin ? 'approved' : 'pending',
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      router.push('/expenses');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Expenses
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Record Business Expense</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expense Description *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Purchased 10L disinfectant solution & floor mop heads"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cleaning_materials">Cleaning Materials & Detergents</option>
                <option value="transport_fuel">Transportation & Fuel</option>
                <option value="equipment_purchase">Equipment Purchase</option>
                <option value="equipment_maintenance">Equipment Maintenance & Repairs</option>
                <option value="employee_salaries">Staff Wages / Overtime</option>
                <option value="staff_allowances">Staff Feeding / Allowances</option>
                <option value="rent">Rent / Warehouse</option>
                <option value="utilities">Utilities (Water & Electricity)</option>
                <option value="communication">Airtime & Internet</option>
                <option value="marketing">Marketing & Flyers</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other Operating Expenses</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (GH₵) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date Incurred (Africa/Accra) *
              </label>
              <input
                type="date"
                required
                value={dateIncurred}
                onChange={(e) => setDateIncurred(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method Used *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="momo">Mobile Money (MTN / Telecel)</option>
                <option value="cash">Cash Out of Pocket / Petty Cash</option>
                <option value="bank_transfer">Company Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Vendor (Optional)
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Specific Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Attachment Image URL (Optional)
              </label>
              <input
                type="url"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://... receipt image"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Justification
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for purchase, job reference, or store details..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/expenses"
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
              <span>{isSubmitting ? 'Recording...' : 'Submit Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
