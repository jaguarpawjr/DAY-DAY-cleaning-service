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
import { Service } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: servicesData } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('base_price', { ascending: true });

  const services = (servicesData as Service[]) || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" /> +233 24 555 8899
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> info@daydaysparkle.com
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Accra, Ghana
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
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none block">
                DAYDAY
              </span>
              <span className="text-[11px] font-bold text-blue-600 tracking-wider block">
                SPARKLE & SHINE
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold tracking-wide">
              <Award className="w-4 h-4 text-blue-600" /> Ghana’s Trusted Cleaning Professionals
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Spotless Clean Spaces.{' '}
              <span className="text-blue-600 block">Satisfaction Guaranteed.</span>
            </h1>
            <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
              From residential homes and executive corporate offices to post-construction deep cleans, DAYDAY delivers uncompromised hygiene, trained personnel, and vetted eco-friendly supplies across Greater Accra.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/book"
                className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Book Instant Cleaning</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/track-booking"
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm transition-all text-center"
              >
                Track Existing Booking
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-slate-200/60 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">100%</p>
                <p className="text-xs text-slate-500 font-medium">Satisfaction Guaranteed</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">GH₵0</p>
                <p className="text-xs text-slate-500 font-medium">Hidden Charges</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">5.0 ★</p>
                <p className="text-xs text-slate-500 font-medium">Customer Rating</p>
              </div>
            </div>
          </div>

          {/* Visual Showcase Card */}
          <div className="relative">
            <div className="w-full bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="inline-flex p-3 rounded-2xl bg-white/15 backdrop-blur mb-6">
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </div>

              <h3 className="text-2xl font-bold mb-3">Professional Cleaning Packages</h3>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                Standardized pricing tailored for Ghanaian apartments, compound houses, corporate offices, and estate villas.
              </p>

              <div className="space-y-3">
                <div className="bg-white/10 rounded-xl p-3.5 flex items-center justify-between backdrop-blur">
                  <span className="text-sm font-semibold">Residential Clean</span>
                  <span className="text-sm font-bold bg-white text-blue-900 px-2.5 py-1 rounded-lg">From GH₵250</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3.5 flex items-center justify-between backdrop-blur">
                  <span className="text-sm font-semibold">Office & Commercial</span>
                  <span className="text-sm font-bold bg-white text-blue-900 px-2.5 py-1 rounded-lg">From GH₵450</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3.5 flex items-center justify-between backdrop-blur">
                  <span className="text-sm font-semibold">Deep Clean & Sanitization</span>
                  <span className="text-sm font-bold bg-white text-blue-900 px-2.5 py-1 rounded-lg">From GH₵600</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3.5 flex items-center justify-between backdrop-blur">
                  <span className="text-sm font-semibold">Post-Construction Scrub</span>
                  <span className="text-sm font-bold bg-white text-blue-900 px-2.5 py-1 rounded-lg">From GH₵850</span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/20 text-xs text-blue-100 flex items-center justify-between">
                <span>Payment: MoMo, Bank, Cash</span>
                <span className="font-bold underline">Same-Day Available</span>
              </div>
            </div>
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
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{svc.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs text-slate-400 font-medium">Starting at</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(svc.base_price)}
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
            {[
              'Airport Residential Area',
              'Cantonments',
              'East Legon',
              'Spintex Road',
              'Osu',
              'Dzorwulu',
              'Ridge',
              'Labone',
              'Tema (Comm. 1 - 25)',
              'Sakumono',
              'Adenta',
              'Achimota',
              'Madina',
              'North Legon',
            ].map((area) => (
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
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">DAYDAY SPARKLE AND SHINE CLEANING SERVICE</p>
              <p className="text-blue-400 font-medium italic">“Satisfaction Guaranteed.”</p>
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
            &copy; {new Date().getFullYear()} DAYDAY Management System. Ghana.
          </div>
        </div>
      </footer>
    </div>
  );
}
