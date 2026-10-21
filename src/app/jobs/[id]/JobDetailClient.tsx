'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Phone,
  FileText,
  Camera,
  Star,
  Users,
  Sparkles,
  AlertCircle,
  Play,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Job, JobPhoto, Invoice, Profile } from '@/types/database';

interface Props {
  job: Job;
  photos: JobPhoto[];
  invoice: Invoice | null;
  profile: Profile;
}

export default function JobDetailClient({ job, photos, invoice, profile }: Props) {
  const router = useRouter();
  const isAdmin = profile.role === 'admin';

  const [status, setStatus] = useState(job.status);
  const [actualMaterials, setActualMaterials] = useState(job.actual_materials_used || '');
  const [completionNotes, setCompletionNotes] = useState(job.completion_notes || '');
  const [customerFeedback, setCustomerFeedback] = useState(job.customer_feedback || '');
  const [customerRating, setCustomerRating] = useState<number>(job.customer_rating || 5);

  // Photo upload simulation / URL input
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoType, setPhotoType] = useState<'before' | 'after'>('before');
  const [photoCaption, setPhotoCaption] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpdate = async (newStatus?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          status: newStatus || status,
          actual_materials_used: actualMaterials,
          completion_notes: completionNotes,
          customer_feedback: customerFeedback,
          customer_rating: customerRating,
          photo_url: photoUrl.trim() || undefined,
          photo_type: photoUrl.trim() ? photoType : undefined,
          photo_caption: photoUrl.trim() ? photoCaption : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');

      if (newStatus) setStatus(newStatus as any);
      setSuccessMessage('Job operational records updated successfully.');
      setPhotoUrl('');
      setPhotoCaption('');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const res = await fetch('/api/admin/invoices/generate-from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invoice');

      router.push(`/invoices/${data.invoice_id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsGeneratingInvoice(false);
    }
  };

  const beforePhotos = photos.filter((p) => p.photo_type === 'before');
  const afterPhotos = photos.filter((p) => p.photo_type === 'after');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back and Header */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cleaning Jobs
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {job.job_number}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {job.service?.name}
              </h1>
              <span
                className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Scheduled Date: <strong className="text-slate-700">{formatDate(job.scheduled_date)}</strong> at{' '}
              <strong className="text-slate-700">{job.scheduled_start_time}</strong>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isAdmin && !invoice && (
              <button
                onClick={handleGenerateInvoice}
                disabled={isGeneratingInvoice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isGeneratingInvoice ? 'Generating...' : 'Generate Invoice'}</span>
              </button>
            )}

            {invoice && (
              <Link
                href={`/invoices/${invoice.id}`}
                className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoice: {invoice.invoice_number} ({formatCurrency(invoice.total_amount)})</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{successMessage}</p>
        </div>
      )}

      {/* Main Grid: Details + Quick Status Transition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job & Client Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Job Information & Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold">Client</p>
                <Link
                  href={`/clients/${job.client_id}`}
                  className="text-slate-900 font-bold hover:text-blue-600 block mt-0.5"
                >
                  {job.client?.name}
                </Link>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Contact Phone</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> {job.client?.phone}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 font-semibold">Location</p>
                <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> {job.location}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Agreed Job Price</p>
                <p className="text-blue-600 font-extrabold text-base mt-0.5">
                  {formatCurrency(job.agreed_price)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold">Materials Required</p>
                <p className="text-slate-700 mt-0.5">{job.materials_required || 'Standard kit'}</p>
              </div>
            </div>
          </div>

          {/* Operational Progress / Actions Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-900">
              Field Execution & Completion Reporting
            </h2>

            {/* Status Quick Flow */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-semibold mr-2">Workflow Status:</span>
              {status !== 'in_progress' && status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => handleUpdate('in_progress')}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Job (In Progress)</span>
                </button>
              )}

              {status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => handleUpdate('completed')}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </button>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Actual Materials & Consumables Used
                </label>
                <input
                  type="text"
                  value={actualMaterials}
                  onChange={(e) => setActualMaterials(e.target.value)}
                  placeholder="e.g. 1 bottle floor cleaner (500ml), 2 trash bags, bleach solution"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Job Completion Notes & Observations
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Washroom lime stains completely removed, kitchen degreased, property locked securely"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer Quality Rating
                  </label>
                  <select
                    value={customerRating}
                    onChange={(e) => setCustomerRating(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold"
                  >
                    <option value={5}>★★★★★ (5 Stars - Exceptional)</option>
                    <option value={4}>★★★★☆ (4 Stars - Very Good)</option>
                    <option value={3}>★★★☆☆ (3 Stars - Satisfactory)</option>
                    <option value={2}>★★☆☆☆ (2 Stars - Needs Improvement)</option>
                    <option value={1}>★☆☆☆☆ (1 Star - Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer Feedback / Testimonial
                  </label>
                  <input
                    type="text"
                    value={customerFeedback}
                    onChange={(e) => setCustomerFeedback(e.target.value)}
                    placeholder="e.g. 'Very thorough and punctual crew!'"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdate()}
                  disabled={isLoading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {isLoading ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </div>
          </div>

          {/* Before & After Photo Gallery */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Before & After Cleaning Photos</h2>
                <p className="text-xs text-slate-500">Quality verification proof for client records</p>
              </div>
              <Camera className="w-5 h-5 text-blue-600" />
            </div>

            {/* Photo Upload / Attachment input */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700">Attach Job Photo</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="before">Before Cleaning</option>
                  <option value="after">After Cleaning</option>
                </select>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... photo image URL"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:col-span-2"
                />
              </div>
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Caption (e.g. Master Bedroom washroom grout before deep scrub)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => handleUpdate()}
                disabled={!photoUrl.trim() || isLoading}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Upload & Attach Photo
              </button>
            </div>

            {/* Gallery Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Before Cleaning ({beforePhotos.length})
                </h3>
                {beforePhotos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No before photos attached</p>
                ) : (
                  beforePhotos.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <img src={p.photo_url} alt="Before" className="w-full h-36 object-cover" />
                      {p.caption && <p className="p-2 text-[11px] text-slate-600">{p.caption}</p>}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  After Cleaning ({afterPhotos.length})
                </h3>
                {afterPhotos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No after photos attached</p>
                ) : (
                  afterPhotos.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <img src={p.photo_url} alt="After" className="w-full h-36 object-cover" />
                      {p.caption && <p className="p-2 text-[11px] text-slate-600">{p.caption}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Assigned Crew & Financials */}
        <div className="space-y-6">
          {/* Assigned Crew Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Cleaning Crew
            </h2>
            <div className="space-y-2">
              {(job.assigned_workers || []).length === 0 ? (
                <p className="text-xs text-slate-400">No cleaners assigned yet.</p>
              ) : (
                (job.assigned_workers || []).map((w: any) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{w.employee?.full_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {w.employee?.job_title} ({w.employee?.phone})
                      </p>
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {w.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Customer Rating Card */}
          {job.customer_rating && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quality Feedback
              </h2>
              <div className="flex justify-center text-yellow-400 text-lg mb-1">
                {'★'.repeat(job.customer_rating)}
                {'☆'.repeat(5 - job.customer_rating)}
              </div>
              <p className="text-xs italic text-slate-600">
                &ldquo;{job.customer_feedback || 'Job completed to high satisfaction.'}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
