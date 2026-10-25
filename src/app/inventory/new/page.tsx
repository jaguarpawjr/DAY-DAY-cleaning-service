'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Package, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ItemCategory, ItemCondition } from '@/types/database';

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('cleaning_chemical');
  const [unitOfMeasure, setUnitOfMeasure] = useState('bottles');
  const [initialQuantity, setInitialQuantity] = useState('10');
  const [minimumStockLevel, setMinimumStockLevel] = useState('5');
  const [unitCost, setUnitCost] = useState('25');
  const [storageLocation, setStorageLocation] = useState('Main Warehouse - Spintex');
  const [isReusable, setIsReusable] = useState(false);
  const [condition, setCondition] = useState<ItemCondition>('new');
  const [expiryDate, setExpiryDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Auto generate SKU recommendation
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`INV-${rand}`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data: authData } = await supabase.auth.getUser();

      const { data: item, error: itemErr } = await supabase
        .from('inventory_items')
        .insert({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category,
          unit_of_measure: unitOfMeasure.trim(),
          quantity_on_hand: parseFloat(initialQuantity || '0'),
          minimum_stock_level: parseFloat(minimumStockLevel || '5'),
          unit_cost: parseFloat(unitCost || '0'),
          storage_location: storageLocation.trim(),
          is_reusable: isReusable,
          equipment_condition: condition,
          expiry_date: expiryDate || null,
          is_active: true,
        })
        .select()
        .single();

      if (itemErr) throw itemErr;

      // Also record initial stock movement
      if (parseFloat(initialQuantity) > 0) {
        await supabase.from('stock_movements').insert({
          item_id: item.id,
          movement_type: 'purchase',
          quantity: parseFloat(initialQuantity),
          previous_quantity: 0,
          new_quantity: parseFloat(initialQuantity),
          unit_cost: parseFloat(unitCost || '0'),
          total_cost: parseFloat(initialQuantity) * parseFloat(unitCost || '0'),
          reason: 'Initial stock intake upon item registration',
          recorded_by: authData.user?.id || null,
        });
      }

      router.push('/inventory');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Register Inventory or Equipment</h1>
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
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Item SKU / Internal Reference *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. CHM-001 or VAC-001"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Item / Equipment Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Industrial Floor Degreaser (5L)"
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
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="cleaning_chemical">Cleaning Chemical / Detergent</option>
                <option value="consumable">Consumable (Trash bags, Gloves, Sponges)</option>
                <option value="tool">Manual Tool (Mop, Squeegee, Brush)</option>
                <option value="equipment">Machine / Reusable Equipment (Vacuum, Steamer)</option>
                <option value="protective_gear">Protective Gear / PPE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit of Measurement *
              </label>
              <input
                type="text"
                required
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                placeholder="bottles, litres, pieces, boxes, packs"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Initial Quantity on Hand *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Minimum Stock Level (Reorder Alert) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={minimumStockLevel}
                onChange={(e) => setMinimumStockLevel(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit Purchase Cost (GH₵) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Storage Location *
              </label>
              <input
                type="text"
                required
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="Main Warehouse - Shelf A"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Asset Classification
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isReusable}
                    onChange={(e) => setIsReusable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Reusable Company Asset (Machine / Tool)</span>
                </label>
              </div>
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
              <span>{isSubmitting ? 'Saving...' : 'Register Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
