import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { CalendarCheck, Phone, MapPin, CheckCircle2, Clock, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Booking } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function BookingsAdminPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const supabase = await createClient();
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('*, service:services(*)')
    .order('created_at', { ascending: false });

  const bookings = (bookingsData as Booking[]) || [];

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer Bookings & Inquiries
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review incoming service booking requests from the public portal and convert to operational jobs.
            </p>
          </div>
          <Link
            href="/book"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <span>Open Public Booking Portal &rarr;</span>
          </Link>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {bookings.length} Total Inquiries & Bookings
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No bookings recorded</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Customers submitting requests on the public booking portal will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Service Requested</th>
                    <th className="py-3 px-4">Preferred Date & Slot</th>
                    <th className="py-3 px-4">Quoted Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {booking.booking_ref}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{booking.customer_name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{booking.customer_phone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{booking.service?.name}</span>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {booking.property_type}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {formatDate(booking.preferred_date)}
                        </p>
                        <p className="text-[11px] text-slate-500">{booking.preferred_time_slot}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">
                        {formatCurrency(booking.quoted_price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            booking.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          Process &rarr;
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
