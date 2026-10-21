import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Users, Plus, Phone, Mail, MapPin, Search, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Client } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: clientsData } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  const clients = (clientsData as Client[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer CRM Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage residential, commercial, and corporate client relationships and balances.
            </p>
          </div>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </Link>
        </div>

        {/* Clients Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {clients.length} Registered Clients
            </span>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No clients registered yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Add your first customer or accept bookings from the public portal.
              </p>
              <Link
                href="/clients/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Create Client Profile
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Client Name / Business</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Address / Ghana Post GPS</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 block"
                        >
                          {client.name}
                        </Link>
                        {client.company_name && (
                          <span className="text-[11px] text-slate-400 block">{client.company_name}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="flex items-center gap-1 text-slate-600 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{client.service_address}</span>
                        </div>
                        {client.gps_location && (
                          <span className="text-[10px] text-blue-600 font-mono block ml-4">
                            GPS: {client.gps_location}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {client.client_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span
                          className={
                            Number(client.outstanding_balance) > 0 ? 'text-red-600' : 'text-slate-600'
                          }
                        >
                          {formatCurrency(client.outstanding_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View &rarr;
                        </Link>
                      </td>
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
