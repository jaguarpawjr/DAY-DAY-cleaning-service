'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, ArrowUpDown, AlertCircle, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { InventoryItem, StockMovementType } from '@/types/database';

function StockAdjustContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get('item_id');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || '');
  const [movementType, setMovementType] = useState<StockMovementType>('purchase');
  const [quantity, setQuantity] = useState('1');
  const [referenceId, setReferenceId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase.from('inventory_items').select('*').order('name');
      if (data) {
        setItems(data as InventoryItem[]);
        if (preselectedItemId) setSelectedItemId(preselectedItemId);
        else if (data.length > 0) setSelectedItemId(data[0].id);
      }
    }
    loadItems();
  }, [preselectedItemId, supabase]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setErrorMessage('Please select an inventory item.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItemId,
          movement_type: movementType,
          quantity: quantity,
          unit_cost: selectedItem?.unit_cost || 0,
          reference_id: referenceId,
          reason: reason.trim() || `Controlled stock adjustment (${movementType})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      router.push('/inventory');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Record Stock Movement</h1>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Item / Asset *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
            >
              <option value="">-- Choose Item --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku}) - Current: {it.quantity_on_hand} {it.unit_of_measure}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex justify-between items-center">
              <span>Current Stock on Hand:</span>
              <span className="font-extrabold text-sm">
                {selectedItem.quantity_on_hand} {selectedItem.unit_of_measure}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Movement Type *
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="purchase">Purchase Intake (+ Stock)</option>
                <option value="issue_to_job">Dispatched to Cleaning Job (- Stock)</option>
                <option value="return">Returned from Job (+ Stock)</option>
                <option value="damaged">Damaged / Broken / Expired (- Stock)</option>
                <option value="lost">Lost / Missing Asset (- Stock)</option>
                <option value="adjustment">Stock Count Reconciliation Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job / PO Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. JOB-202610-001 or PO-001"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason / Audit Justification *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Reason for issuance, damages report, or supplier intake notes..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/inventory"
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
              <span>{isSubmitting ? 'Recording...' : 'Record Movement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockAdjustPage() {
  return (
    <React.Suspense fallback={<div className="max-w-2xl mx-auto py-12 text-center text-xs font-semibold text-slate-500">Loading stock adjustment form...</div>}>
      <StockAdjustContent />
    </React.Suspense>
  );
}
