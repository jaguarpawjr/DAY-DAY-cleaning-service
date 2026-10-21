'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Users,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Booking, Employee } from '@/types/database';

interface Props {
  booking: Booking;
  employees: Employee[];
}

export default function BookingProcessClient({ booking, employees }: Props) {
  const router = useRouter();
  const [agreedPrice, setAgreedPrice] = useState(String(booking.quoted_price));
  const [startTime, setStartTime] = useState('09:00');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [materials, setMaterials] = useState('Standard cleaning detergents, vacuum cleaner, mops, microfiber cloths');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          action,
          assigned_employee_ids: selectedEmployees,
          agreed_price: agreedPrice,
          scheduled_start_time: startTime + ':00',
          materials_required: materials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process booking');
      }

      if (action === 'approve' && data.job_id) {
        router.push(`/jobs/${data.job_id}`);
      } else {
        router.push('/bookings');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {booking.booking_ref}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Review & Schedule Booking Request
            </h1>
          </div>
          <span className="capitalize px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {booking.status}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Customer & Location Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Customer Inquiry Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-400 font-semibold">Customer Name</p>
            <p className="text-slate-900 font-bold mt-0.5">{booking.customer_name}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold">Phone Number</p>
            <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" /> {booking.customer_phone}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold">Requested Service</p>
            <p className="text-slate-900 font-bold mt-0.5">{booking.service?.name}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold">Property Scale</p>
            <p className="text-slate-900 font-bold mt-0.5">{booking.property_type}</p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold">Preferred Schedule</p>
            <p className="text-slate-900 font-bold mt-0.5">
              {formatDate(booking.preferred_date)} • {booking.preferred_time_slot}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold">Quoted Online</p>
            <p className="text-blue-600 font-extrabold text-sm mt-0.5">
              {formatCurrency(booking.quoted_price)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-400 font-semibold">Service Address</p>
            <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> {booking.service_address}
            </p>
          </div>
          {booking.special_instructions && (
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-slate-500 font-bold text-[11px]">Customer Special Instructions:</p>
              <p className="text-slate-700 mt-0.5">{booking.special_instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Operational Job Conversion Form */}
      {booking.status === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">
            Convert to Operational Cleaning Job
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agreed Job Price (GH₵)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Scheduled Start Time (Africa/Accra)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Materials & Equipment to Dispatch
              </label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Employee Crew Assignment */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assign Cleaning Staff ({selectedEmployees.length} Selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {employees.map((emp) => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{emp.full_name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {emp.job_title} ({emp.employee_id})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleAction('reject')}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject Booking
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleAction('approve')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLoading ? 'Processing...' : 'Approve Booking & Create Job'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
