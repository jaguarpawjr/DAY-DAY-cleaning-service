'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Plus,
  Save,
  Upload,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  MapPin,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Service, ServiceArea } from '@/types/database';

type Settings = Record<string, any>;
type EditableService = Pick<Service, 'id' | 'name' | 'description' | 'base_price' | 'pricing_type' | 'is_active' | 'sort_order' | 'image_url'>;
type EditableArea = Pick<ServiceArea, 'id' | 'name' | 'region' | 'travel_fee' | 'is_active' | 'sort_order' | 'available_service_ids'>;

interface HomepageSettingsClientProps {
  initialSettings: Settings | null;
  initialServices: Service[];
  initialAreas: ServiceArea[];
  draftSnapshot: {
    settings?: Settings;
    services?: EditableService[];
    areas?: EditableArea[];
  } | null;
  lastPublishedAt: string | null;
}

export default function HomepageSettingsClient({
  initialSettings,
  initialServices,
  initialAreas,
  draftSnapshot,
  lastPublishedAt,
}: HomepageSettingsClientProps) {
  const router = useRouter();

  // If a draft snapshot exists, initialize with draft; otherwise use live data
  const isInitialDraft = Boolean(draftSnapshot);
  const [hasDraft, setHasDraft] = useState(isInitialDraft);
  const [form, setForm] = useState<Settings>(draftSnapshot?.settings || initialSettings || {});
  const [serviceRows, setServiceRows] = useState<EditableService[]>(draftSnapshot?.services || initialServices);
  const [areaRows, setAreaRows] = useState<EditableArea[]>(draftSnapshot?.areas || initialAreas);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingServiceIndex, setUploadingServiceIndex] = useState<number | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const update = (key: string, value: any) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Upload logo directly to Supabase storage
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    setMessage(null);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo-${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'brand-assets');
      formData.append('path', path);

      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      update('logo_url', data.publicUrl);
      setMessage({ text: 'Logo uploaded and updated in draft.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error uploading logo', type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!form.logo_url) return;
    try {
      const url = new URL(form.logo_url);
      const parts = url.pathname.split('brand-assets/');
      if (parts[1]) {
        await fetch('/api/admin/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'brand-assets', path: parts[1] }),
        });
      }
    } catch {
      // Ignore URL parsing errors for external logos
    }
    update('logo_url', null);
    setMessage({ text: 'Logo removed from settings.', type: 'info' });
  };

  // Upload service image directly to Supabase storage
  const handleServiceImageUpload = async (index: number, file: File) => {
    setUploadingServiceIndex(index);
    setMessage(null);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `services/service-${Date.now()}-${index}.${ext}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'brand-assets');
      formData.append('path', path);

      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload service image');

      setServiceRows((rows) =>
        rows.map((row, i) => (i === index ? { ...row, image_url: data.publicUrl } : row))
      );
      setMessage({ text: 'Service image uploaded successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error uploading service image', type: 'error' });
    } finally {
      setUploadingServiceIndex(null);
    }
  };

  const handleServiceImageDelete = (index: number) => {
    setServiceRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, image_url: null } : row))
    );
  };

  const save = async (action: 'save' | 'publish' | 'discard_draft') => {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, settings: form, services: serviceRows, areas: areaRows }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to save changes');
      }

      if (action === 'discard_draft') {
        setForm(initialSettings || {});
        setServiceRows(initialServices);
        setAreaRows(initialAreas);
        setHasDraft(false);
        setMessage({ text: 'Draft discarded. Reverted to live content.', type: 'info' });
      } else if (action === 'save') {
        setHasDraft(true);
        setMessage({ text: 'Draft snapshot saved! Live homepage remains untouched until published.', type: 'success' });
      } else {
        setHasDraft(false);
        setMessage({ text: 'All changes published live to the public homepage!', type: 'success' });
      }

      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addService = () =>
    setServiceRows((rows) => [
      ...rows,
      {
        id: '',
        name: 'New Service',
        description: '',
        base_price: 200,
        pricing_type: 'fixed',
        image_url: null,
        is_active: true,
        sort_order: rows.length,
      },
    ]);

  const removeService = (index: number) => {
    setServiceRows((rows) => rows.filter((_, i) => i !== index));
  };

  const addArea = () =>
    setAreaRows((rows) => [
      ...rows,
      {
        id: '',
        name: 'New Area',
        region: 'Greater Accra',
        travel_fee: 0,
        available_service_ids: serviceRows.map((s) => s.id).filter(Boolean),
        is_active: true,
        sort_order: rows.length,
      },
    ]);

  const removeArea = (index: number) => {
    setAreaRows((rows) => rows.filter((_, i) => i !== index));
  };

  const toggleServiceForArea = (areaIndex: number, serviceId: string) => {
    if (!serviceId) return;
    setAreaRows((rows) =>
      rows.map((area, i) => {
        if (i !== areaIndex) return area;
        const current = area.available_service_ids || [];
        const exists = current.includes(serviceId);
        const updated = exists ? current.filter((id) => id !== serviceId) : [...current, serviceId];
        return { ...area, available_service_ids: updated };
      })
    );
  };

  const toggleAllServicesForArea = (areaIndex: number) => {
    const allIds = serviceRows.map((s) => s.id).filter(Boolean);
    setAreaRows((rows) =>
      rows.map((area, i) => {
        if (i !== areaIndex) return area;
        const current = area.available_service_ids || [];
        const isAllSelected = allIds.every((id) => current.includes(id));
        return { ...area, available_service_ids: isAllSelected ? [] : allIds };
      })
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900">Homepage & Website Content</h1>
            {hasDraft ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Unpublished Draft Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized with Live
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Edit brand content, service catalog, and operational coverage with full draft isolation.
            {lastPublishedAt && ` Last published: ${new Date(lastPublishedAt).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasDraft && (
            <button
              onClick={() => save('discard_draft')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Discard Draft
            </button>
          )}

          <button
            onClick={() => save('save')}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save Draft
          </button>

          <button
            onClick={() => save('publish')}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <Globe className="h-4 w-4" /> Publish Live
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {message && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center justify-between border ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Brand & Homepage Content */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" /> Brand Identity & Homepage Messaging
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Logo Upload Section */}
          <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <span className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Official Company Logo (Supabase Storage: brand-assets)
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {form.logo_url ? (
                <div className="relative group">
                  <img
                    src={form.logo_url}
                    alt="Company logo preview"
                    className="h-20 w-20 rounded-2xl object-contain bg-white border border-slate-200 p-1 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow"
                    title="Remove Logo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-1 flex-1 text-center sm:text-left">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>{uploadingLogo ? 'Uploading to Supabase...' : form.logo_url ? 'Replace Logo' : 'Upload Brand Logo'}</span>
                </button>
                <p className="text-[11px] text-slate-500">
                  JPEG, PNG, WEBP, or SVG up to 5MB. Hosted in public Supabase Storage.
                </p>
              </div>
            </div>
          </div>

          {(['company_name', 'tagline', 'phone', 'email', 'address', 'homepage_heading', 'homepage_welcome', 'homepage_footer', 'whatsapp', 'facebook_url', 'instagram_url'] as const).map((key) => (
            <label
              key={key}
              className={
                key === 'homepage_welcome' || key === 'homepage_footer' || key === 'address'
                  ? 'sm:col-span-2'
                  : ''
              }
            >
              <span className="mb-1 block text-xs font-bold capitalize text-slate-700">
                {key.replaceAll('_', ' ')}
              </span>
              <input
                value={String(form[key] || '')}
                onChange={(event) => update(key, event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </section>

      {/* 2. Services Catalog & Images */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Services Catalog & Photography</h2>
            <p className="text-xs text-slate-500">Configure prices, descriptions, and uploaded showcase images.</p>
          </div>
          <button onClick={addService} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add Service
          </button>
        </div>

        <div className="space-y-4">
          {serviceRows.map((service, index) => (
            <div key={`${service.id || index}`} className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Service #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                  title="Remove Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-6 items-start">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Service Title</label>
                  <input
                    value={service.name}
                    onChange={(e) =>
                      setServiceRows((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row))
                      )
                    }
                    placeholder="Residential Cleaning"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Base Price (GH₵)</label>
                  <input
                    type="number"
                    min="0"
                    value={service.base_price}
                    onChange={(e) =>
                      setServiceRows((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, base_price: Number(e.target.value) } : row))
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Pricing Model</label>
                  <select
                    value={service.pricing_type || 'fixed'}
                    onChange={(e) =>
                      setServiceRows((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, pricing_type: e.target.value as EditableService['pricing_type'] }
                            : row
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="starting">Starting At</option>
                    <option value="hourly">Hourly</option>
                    <option value="quotation">Quotation Only</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-6">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={service.is_active}
                      onChange={(e) =>
                        setServiceRows((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, is_active: e.target.checked } : row))
                        )
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Active on Website</span>
                  </label>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Description</label>
                  <input
                    value={service.description || ''}
                    onChange={(e) =>
                      setServiceRows((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                      )
                    }
                    placeholder="Details about equipment, cleaners, and hygiene standards..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>

                {/* Service Image Upload in Supabase Storage */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Service Photo</label>
                  <div className="flex items-center gap-2">
                    {service.image_url ? (
                      <div className="relative group">
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleServiceImageDelete(index)}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                          title="Delete image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-white text-slate-300">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}

                    <label className="cursor-pointer px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                      <span>{uploadingServiceIndex === index ? 'Uploading...' : service.image_url ? 'Replace' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleServiceImageUpload(index, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Service Areas & Availability Editor */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Service Areas & Availability Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Specify travel surcharges and select exactly which services are offered in each district.
            </p>
          </div>
          <button onClick={addArea} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add Area
          </button>
        </div>

        <div className="space-y-4">
          {areaRows.map((area, index) => {
            const availableIds = area.available_service_ids || [];
            const isAllOffered = serviceRows.length > 0 && serviceRows.every((s) => s.id && availableIds.includes(s.id));

            return (
              <div key={`${area.id || index}`} className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Area #{index + 1}: {area.name || 'Untitled Area'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeArea(index)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                    title="Remove Area"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-4 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">District / Town</label>
                    <input
                      value={area.name}
                      onChange={(e) =>
                        setAreaRows((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row))
                        )
                      }
                      placeholder="East Legon"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Region</label>
                    <input
                      value={area.region}
                      onChange={(e) =>
                        setAreaRows((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, region: e.target.value } : row))
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Travel Surcharge (GH₵)</label>
                    <input
                      type="number"
                      min="0"
                      value={area.travel_fee}
                      onChange={(e) =>
                        setAreaRows((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, travel_fee: Number(e.target.value) } : row))
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div className="pt-5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={area.is_active}
                        onChange={(e) =>
                          setAreaRows((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, is_active: e.target.checked } : row))
                          )
                        }
                        className="rounded text-blue-600"
                      />
                      <span>Active Coverage</span>
                    </label>
                  </div>
                </div>

                {/* Service Availability Selector Matrix */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Available Services in {area.name || 'this area'} ({availableIds.length} of {serviceRows.length} offered)
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAllServicesForArea(index)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      {isAllOffered ? 'Deselect All' : 'Select All Services'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {serviceRows.map((svc) => {
                      const isSelected = svc.id ? availableIds.includes(svc.id) : false;
                      return (
                        <button
                          key={svc.id || svc.name}
                          type="button"
                          onClick={() => svc.id && toggleServiceForArea(index, svc.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <div className="w-3.5 h-3.5" />}
                          <span>{svc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
