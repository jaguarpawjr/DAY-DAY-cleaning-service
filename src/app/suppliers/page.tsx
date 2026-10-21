import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Users, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { Supplier } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name');
  const suppliers = (suppliersData as Supplier[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Suppliers & Chemical Vendors
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Vendors providing cleaning chemicals, heavy machinery, and PPE.
            </p>
          </div>
          <Link
            href="/suppliers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {suppliers.length} Registered Suppliers
            </span>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No suppliers added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Supplies Provided</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4">{s.contact_person || '—'}</td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{s.address || 'Accra, Ghana'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.supplies_provided || 'General'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
