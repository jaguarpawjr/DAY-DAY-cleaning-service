'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Service } from '@/types/database';

function BookingPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceSlug = searchParams.get('service');

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [propertyType, setPropertyType] = useState('residential_2bed');
  const [serviceAddress, setServiceAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (8:00 AM - 12:00 PM)');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      if (data && data.length > 0) {
        setServices(data as Service[]);
        if (preselectedServiceSlug) {
          const match = data.find((s) => s.slug === preselectedServiceSlug);
          if (match) setSelectedServiceId(match.id);
          else setSelectedServiceId(data[0].id);
        } else {
          setSelectedServiceId(data[0].id);
        }
      }
    }
    loadServices();
  }, [preselectedServiceSlug, supabase]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Price multiplier based on property scale
  const propertyMultipliers: Record<string, { label: string; factor: number }> = {
    residential_studio: { label: 'Studio / 1-Bedroom Apartment', factor: 0.9 },
    residential_2bed: { label: '2-Bedroom Apartment / House', factor: 1.0 },
    residential_3bed: { label: '3-Bedroom Home', factor: 1.25 },
    residential_4bed: { label: '4+ Bedroom Villa / Compound House', factor: 1.6 },
    commercial_small: { label: 'Small Office / Retail Shop (< 100 sqm)', factor: 1.3 },
    commercial_large: { label: 'Corporate Office / Multi-floor Building', factor: 2.2 },
  };

  const currentMultiplier = propertyMultipliers[propertyType]?.factor || 1.0;
  const estimatedPrice = selectedService ? Number(selectedService.base_price) * currentMultiplier : 0;
  const requiredDeposit = Math.round(estimatedPrice * 0.3); // 30% deposit standard

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Generate booking reference
      const datePart = new Date().toISOString().slice(0, 7).replace('-', '');
      const randomPart = Math.floor(100 + Math.random() * 900);
      const bookingRef = `BK-${datePart}-${randomPart}`;

      // Insert into bookings table
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          booking_ref: bookingRef,
          service_id: selectedServiceId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
          property_type: propertyMultipliers[propertyType]?.label || propertyType,
          service_address: gpsLocation ? `${serviceAddress.trim()} (GPS: ${gpsLocation.trim()})` : serviceAddress.trim(),
          preferred_date: preferredDate,
          preferred_time_slot: preferredTimeSlot,
          duration_hours: selectedService?.duration_hours || 3.0,
          special_instructions: specialInstructions.trim() || null,
          quoted_price: estimatedPrice,
          deposit_required: requiredDeposit,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSubmittedRef(bookingRef);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-lg">
            DAYDAY SPARKLE & SHINE
          </span>
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Book a Professional Cleaning Service
        </h1>
        <p className="text-sm text-blue-600 font-semibold mt-1">
          “Satisfaction Guaranteed.” • Ghana Cedis (GH₵)
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {submittedRef ? (
          /* Confirmation Success Modal */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Booking Request Received!
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Thank you for choosing DAYDAY SPARKLE AND SHINE. Our operations team is reviewing your schedule.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 max-w-md mx-auto">
              <p className="text-xs uppercase font-bold text-blue-600 tracking-wider">
                Your Booking Reference
              </p>
              <p className="text-2xl font-mono font-extrabold text-blue-900 mt-1">
                {submittedRef}
              </p>
              <p className="text-xs text-blue-700 mt-2">
                Estimated Quote: <span className="font-bold">{formatCurrency(estimatedPrice)}</span>
              </p>
            </div>

            <div className="text-xs text-slate-500 max-w-md mx-auto space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="font-semibold text-slate-800">What happens next?</p>
              <p>1. We will call you at <strong className="text-slate-700">{customerPhone}</strong> to confirm property access and exact timing.</p>
              <p>2. A 30% Mobile Money deposit ({formatCurrency(requiredDeposit)}) can be completed once your booking is approved.</p>
              <p>3. You can track this booking status anytime using your reference number.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Link
                href={`/track-booking?ref=${submittedRef}`}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Track Booking Status Online
              </Link>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Main Booking Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Submission Error</p>
                  <p className="text-xs">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Step 1: Service Selection */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Choose Cleaning Service
              </h2>
              <p className="text-xs text-slate-500 mb-4 ml-8">
                Select the cleaning specialty required for your premises.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-8">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedServiceId === svc.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{svc.name}</span>
                      {selectedServiceId === svc.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{svc.description}</p>
                    <p className="text-xs font-bold text-blue-600">
                      Base: {formatCurrency(svc.base_price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Property Scale */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Property Size / Building Type
              </h2>
              <div className="ml-8 mt-3">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(propertyMultipliers).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Date & Preferred Time */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Date & Preferred Time (Africa/Accra)
              </h2>

              <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cleaning Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Time Slot
                  </label>
                  <select
                    value={preferredTimeSlot}
                    onChange={(e) => setPreferredTimeSlot(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                    <option value="Midday (12:00 PM - 3:00 PM)">Midday (12:00 PM - 3:00 PM)</option>
                    <option value="Afternoon (3:00 PM - 6:00 PM)">Afternoon (3:00 PM - 6:00 PM)</option>
                    <option value="Night / After Hours Cleaning">Night / After Hours Cleaning</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Contact & Location */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  4
                </span>
                Contact & Service Location
              </h2>

              <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name / Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghanaian Phone Number (MoMo / Calls)
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="024 000 0000"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (For Invoices & Receipts)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="kwame@example.com"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghana Post GPS Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={gpsLocation}
                    onChange={(e) => setGpsLocation(e.target.value)}
                    placeholder="e.g. GA-183-9022"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Street Address / Landmarks
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    placeholder="e.g. House No. 14, Spintex Road, near Flowerpot Junction, Accra"
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Special Instructions or Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Focus on kitchen grease, 3 sofa sets to shampoo, gate code..."
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Price Estimate Summary */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                  Estimated Pricing Quote
                </p>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {formatCurrency(estimatedPrice)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Includes vetted personnel, cleaning machinery, chemicals, and satisfaction guarantee.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Request Booking'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BookingPortalPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">Loading booking portal...</div>}>
      <BookingPortalContent />
    </React.Suspense>
  );
}
