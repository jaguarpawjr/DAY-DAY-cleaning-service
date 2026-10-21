'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Booking } from '@/types/database';

function TrackBookingContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [bookingRef, setBookingRef] = useState(initialRef);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (initialRef) {
      handleSearch(initialRef);
    }
  }, [initialRef]);

  const handleSearch = async (refToSearch?: string) => {
    const queryRef = (refToSearch || bookingRef).trim().toUpperCase();
    if (!queryRef) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSearched(true);
    setBooking(null);

    try {
      let query = supabase
        .from('bookings')
        .select('*, service:services(*)')
        .eq('booking_ref', queryRef);

      if (phoneNumber.trim()) {
        query = query.ilike('customer_phone', `%${phoneNumber.trim()}%`);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        setErrorMessage(error.message);
      } else if (!data) {
        setErrorMessage('No booking found with this reference. Please check and try again.');
      } else {
        setBooking(data as Booking);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error looking up booking.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-lg">
            DAYDAY SPARKLE & SHINE
          </span>
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Track Your Cleaning Booking
        </h1>
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-1">
          Real-Time Status & Scheduling
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Search Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Booking Reference Number
              </label>
              <div className="relative rounded-xl">
                <input
                  type="text"
                  required
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                  placeholder="e.g. BK-202610-001"
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Booking Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}

        {booking && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {booking.booking_ref}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {booking.service?.name || 'Cleaning Service'}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  booking.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : booking.status === 'pending'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold">Client Name</p>
                <p className="text-slate-800 font-bold mt-0.5">{booking.customer_name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Preferred Schedule</p>
                <p className="text-slate-800 font-bold mt-0.5">
                  {formatDate(booking.preferred_date)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Time Slot</p>
                <p className="text-slate-800 font-bold mt-0.5">{booking.preferred_time_slot}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Quoted Amount</p>
                <p className="text-blue-600 font-extrabold text-sm mt-0.5">
                  {formatCurrency(booking.quoted_price)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-semibold">Service Location</p>
                <p className="text-slate-800 font-medium mt-0.5">📍 {booking.service_address}</p>
              </div>
            </div>

            {booking.status === 'pending' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Your request is currently awaiting admin schedule confirmation. Our representative will contact you via phone shortly.
              </div>
            )}

            {booking.status === 'approved' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                Your booking is <strong>Confirmed</strong>! Our professional cleaning crew has been reserved for your requested date.
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrackBookingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">Loading tracking portal...</div>}>
      <TrackBookingContent />
    </React.Suspense>
  );
}
