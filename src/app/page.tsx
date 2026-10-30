import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  Award,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { CompanySettings, Service, ServiceArea } from '@/types/database';
import HomepageBookingForm from './HomepageBookingForm';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: servicesData }, { data: settingsData }, { data: areasData }] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('sort_order').order('base_price'),
    supabase.from('company_settings').select('*').maybeSingle(),
    supabase.from('service_areas').select('*').eq('is_active', true).order('sort_order').order('name'),
  ]);

  const services = (servicesData as Service[]) || [];
  const settings = settingsData as CompanySettings | null;
  const areas = (areasData as ServiceArea[]) || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" /> {settings?.phone || '+233 24 555 8899'}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> {settings?.email || 'info@daydaysparkle.com'}
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />  Ghana
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/track-booking" className="hover:text-white transition-colors">
              Track Booking Status
            </Link>
            <Link
              href="/login"
              className="text-blue-400 font-semibold hover:text-blue-300 transition-colors"
            >
              Staff Sign In &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings?.company_name || 'Company logo'}
                className="h-11 w-11 max-h-11 max-w-11 shrink-0 rounded-2xl border border-slate-200 bg-white p-0.5 object-contain shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none block">
                {settings?.company_name || ''}
              </span>
              <span className="text-[11px] font-bold text-blue-600 tracking-wider block">
                {settings?.tagline || ''}
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#services" className="hover:text-blue-600 transition-colors">
              Services
            </a>
            <a href="#why-us" className="hover:text-blue-600 transition-colors">
              Why Choose Us
            </a>
            <a href="#coverage" className="hover:text-blue-600 transition-colors">
              Service Areas
            </a>
            <Link href="/track-booking" className="hover:text-blue-600 transition-colors">
              Check Status
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>Book a Cleaner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-xs font-semibold text-slate-600">
            Already booked with us? Check your booking status anytime.
          </p>
          <Link
            href="/track-booking"
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Track Booking
          </Link>
        </div>
      </div>

      {/* Homepage hero: editorial laundry imagery paired with the live booking flow. */}
      <section className="overflow-hidden bg-blue-50 px-4 py-10 sm:px-8 sm:py-14 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="max-w-xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-400" /> Fresh spaces, made simple</div>
            <h1 className="max-w-lg font-serif text-5xl font-bold leading-[0.98] tracking-[-0.03em] text-slate-900 sm:text-6xl lg:text-[4.9rem]">A cleaner home, without the chore.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg">{settings?.homepage_welcome || 'Professional cleaning, picked up and delivered with care across Greater Accra.'}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600"><span className="rounded-full bg-white px-3 py-2 shadow-sm">Satisfaction guaranteed</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">Local team, trusted service</span></div>
          </div>

          <div className="relative min-h-[510px] lg:min-h-[590px]">
            <img src="https://www.rbcclean.com/wp-content/uploads/2025/03/shutterstock_2453839265-1.jpg" alt="Professional cleaner preparing a bright home" className="absolute inset-0 h-full w-full rounded-[2.5rem] object-cover" />
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
            <div className="relative mt-[27rem] px-4 pb-5 sm:mt-[29rem] sm:px-6 lg:absolute lg:-bottom-5 lg:left-auto lg:right-6 lg:mt-0 lg:w-[min(100%-3rem,390px)] lg:px-0 lg:pb-0"><HomepageBookingForm initialServices={services} /></div>
            <div className="absolute left-5 top-5 hidden rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-slate-900 shadow-lg backdrop-blur sm:block">Carefully cleaned. Ready when you are.</div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="py-20 px-4 sm:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Our Expertise
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
              Complete Cleaning Solutions
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Select the service you need or request a custom quotation for your facility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {svc.image_url ? (
                    <img
                      src={svc.image_url}
                      alt={svc.name}
                      className="w-full h-32 rounded-xl object-cover mb-4 border border-slate-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  )}
                  <h3 className="text-base font-bold text-slate-900 mb-2">{svc.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs text-slate-400 font-medium">Starting at</span>
                    <span className="text-lg font-bold text-blue-600">
                      {svc.pricing_type === 'quotation'
                        ? 'Request quote'
                        : formatCurrency(
                            svc.promotional_price &&
                              (!svc.promotion_expires_at ||
                                svc.promotion_expires_at >= new Date().toISOString().slice(0, 10))
                              ? svc.promotional_price
                              : svc.base_price,
                          )}
                    </span>
                  </div>
                  <Link
                    href={`/book?service=${svc.slug}`}
                    className="w-full block py-2.5 px-4 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 text-xs font-bold rounded-xl text-center transition-colors"
                  >
                    Select & Book &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas Section */}
      <section id="coverage" className="py-16 px-4 sm:px-8 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Service Areas Across Greater Accra</h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto mb-8">
            Our fully equipped teams operate daily across key residential and commercial districts.
          </p>

          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {(areas.length ? areas.map((area) => `${area.name}, ${area.region}`) : [

            ]).map((area) => (
              <span
                key={area}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                📍 {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 px-4 sm:px-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings?.company_name || 'Company logo'}
                className="h-8 w-8 max-h-8 max-w-8 shrink-0 rounded-lg bg-white p-0.5 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="font-bold text-white text-sm">
                {settings?.company_name || ''}
              </p>
              <p className="text-blue-400 font-medium italic">
                {settings?.homepage_footer || settings?.tagline || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/book" className="hover:text-white transition-colors">
              Book Cleaning
            </Link>
            <Link href="/track-booking" className="hover:text-white transition-colors">
              Track Status
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Staff Portal
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} {settings?.company_name || ''}. Ghana.
          </div>
        </div>
      </footer>
    </div>
  );
}
