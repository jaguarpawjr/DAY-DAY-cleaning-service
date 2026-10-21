'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Client, Service, ContractFrequency } from '@/types/database';

export default function NewContractPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<ContractFrequency>('weekly');
  const [pricePerPeriod, setPricePerPeriod] = useState('1200');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [terms, setTerms] = useState('Standard cleaning SLA with daily janitorial check and monthly deep clean.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [cRes, sRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);
      if (cRes.data) {
        setClients(cRes.data as Client[]);
        if (cRes.data.length > 0) setSelectedClientId(cRes.data[0].id);
      }
      if (sRes.data) {
        setServices(sRes.data as Service[]);
        if (sRes.data.length > 0) setSelectedServiceId(sRes.data[0].id);
      }
    }
    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedServiceId) {
      setErrorMessage('Please choose a client and service.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { count } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
      const currentYear = new Date().getFullYear();
      const contractRef = `CTR-${currentYear}-${String((count || 0) + 1).padStart(3, '0')}`;

      const { error } = await supabase.from('contracts').insert({
        contract_ref: contractRef,
        client_id: selectedClientId,
        service_id: selectedServiceId,
        title: title.trim() || 'Annual Commercial Cleaning Contract',
        frequency,
        price_per_period: parseFloat(pricePerPeriod || '0'),
        start_date: startDate,
        end_date: endDate,
        renewal_date: endDate,
        status: 'active',
        terms,
      });

      if (error) throw error;

      router.push('/contracts');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Contracts
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Create Cleaning Contract</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contract Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Standard Bank Head Office Daily Cleaning Agreement"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer / Client *
              </label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cleaning Service *
              </label>
              <select
                required
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Service Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="daily">Daily Janitorial Service</option>
                <option value="weekly">Weekly Routine Cleaning</option>
                <option value="biweekly">Bi-Weekly Routine Cleaning</option>
                <option value="monthly">Monthly Deep Cleaning</option>
                <option value="quarterly">Quarterly Facade & Window Clean</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agreed Price per Period (GH₵) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={pricePerPeriod}
                onChange={(e) => setPricePerPeriod(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Renewal / End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Terms & Scope of Work
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/contracts"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Contract'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
