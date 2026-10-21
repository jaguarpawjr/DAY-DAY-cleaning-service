import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Package, Plus, AlertTriangle, ArrowUpDown, History, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InventoryItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const isAdmin = profile.role === 'admin';

  const { data: itemsData } = await supabase
    .from('inventory_items')
    .select('*, supplier:suppliers(*)')
    .order('name');

  const items = (itemsData as InventoryItem[]) || [];

  const lowStockItems = items.filter(
    (item) => Number(item.quantity_on_hand) <= Number(item.minimum_stock_level)
  );
  const totalValuation = items.reduce(
    (acc, it) => acc + Number(it.quantity_on_hand || 0) * Number(it.unit_cost || 0),
    0
  );

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Inventory & Equipment Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Cleaning chemicals, consumables, machinery, and audited stock movement controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inventory/movements"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Audit History</span>
            </Link>
            {isAdmin && (
              <Link
                href="/inventory/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Register Item / Equipment</span>
              </Link>
            )}
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Items Cataloged</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{items.length} SKUs</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalValuation)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Alerts
            </span>
            <p className="text-xl font-bold text-red-600 mt-1">{lowStockItems.length} Items</p>
          </div>
        </div>

        {/* Inventory Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stock Balances & Equipment
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No inventory registered yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Register chemicals (disinfectants, bleach, floor cleaner) and equipment (vacuum cleaners, steam extractors).
              </p>
              {isAdmin && (
                <Link
                  href="/inventory/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Register First Item
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Item & Storage Location</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-right">Qty on Hand</th>
                    <th className="py-3 px-4 text-right">Min Level</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-center">Condition</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Adjust Stock</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((item) => {
                    const isLow = Number(item.quantity_on_hand) <= Number(item.minimum_stock_level);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {item.sku}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-400">
                            📍 {item.storage_location || 'Accra Warehouse'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.is_reusable
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-50 text-slate-600'
                            }`}
                          >
                            {item.is_reusable ? 'Asset / Tool' : 'Consumable'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-sm">
                          <span className={isLow ? 'text-red-600 flex items-center justify-end gap-1' : 'text-slate-900'}>
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                            {item.quantity_on_hand} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          {item.minimum_stock_level}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          {formatCurrency(item.unit_cost)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              item.equipment_condition === 'new' || item.equipment_condition === 'good'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.equipment_condition === 'fair'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.equipment_condition}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href={`/inventory/adjust?item_id=${item.id}`}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Adjust &rarr;
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
