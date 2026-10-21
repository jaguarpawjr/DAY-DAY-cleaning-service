'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Briefcase, AlertCircle, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Client, Service, Employee } from '@/types/database';

function NewJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client_id');

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledStartTime, setScheduledStartTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('350');
  const [materialsRequired, setMaterialsRequired] = useState('General cleaning kit, vacuum, mop set');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [cRes, sRes, eRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('services').select('*').eq('is_active', true).order('name'),
        supabase.from('employees').select('*').eq('employment_status', 'active'),
      ]);

      if (cRes.data) {
        setClients(cRes.data as Client[]);
        if (preselectedClientId) {
          const matched = cRes.data.find((c) => c.id === preselectedClientId);
          if (matched) {
            setSelectedClientId(matched.id);
            setLocation(matched.service_address);
          }
        }
      }
      if (sRes.data && sRes.data.length > 0) {
        setServices(sRes.data as Service[]);
        setSelectedServiceId(sRes.data[0].id);
        setAgreedPrice(String(sRes.data[0].base_price));
      }
      if (eRes.data) {
        setEmployees(eRes.data as Employee[]);
      }
    }
    loadData();
  }, [preselectedClientId, supabase]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setLocation(client.service_address);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      setAgreedPrice(String(svc.base_price));
    }
  };

  const toggleEmployee = (empId: string) => {
    setAssignedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedServiceId) {
      setErrorMessage('Please select both a client and a cleaning service.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Generate Job Number
      const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const jobNumber = `JOB-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

      // 2. Insert Job
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          job_number: jobNumber,
          client_id: selectedClientId,
          service_id: selectedServiceId,
          scheduled_date: scheduledDate,
          scheduled_start_time: scheduledStartTime + ':00',
          location: location.trim(),
          agreed_price: parseFloat(agreedPrice || '0'),
          estimated_cost: Math.round(parseFloat(agreedPrice || '0') * 0.4),
          materials_required: materialsRequired,
          status: assignedEmployeeIds.length > 0 ? 'assigned' : 'scheduled',
        })
        .select()
        .single();

      if (jobErr) throw jobErr;

      // 3. Assign workers
      for (const empId of assignedEmployeeIds) {
        await supabase.from('job_workers').insert({
          job_id: job.id,
          employee_id: empId,
          role: 'cleaner',
        });
      }

      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cleaning Jobs
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Schedule Cleaning Job</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Client *
              </label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cleaning Service *
              </label>
              <select
                required
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (GH₵{s.base_price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Scheduled Date (Africa/Accra) *
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Scheduled Start Time *
              </label>
              <input
                type="time"
                required
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agreed Price (GH₵) *
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location / Job Address *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Job site address in Accra"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Materials & Equipment to Dispatch
              </label>
              <input
                type="text"
                value={materialsRequired}
                onChange={(e) => setMaterialsRequired(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Assign Crew */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assign Crew Members ({assignedEmployeeIds.length} Selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {employees.map((emp) => {
                  const isSelected = assignedEmployeeIds.includes(emp.id);
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
                      <p>{emp.full_name}</p>
                      <span className="text-[10px] text-slate-400">{emp.job_title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/jobs"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Schedule Cleaning Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <React.Suspense fallback={<div className="max-w-3xl mx-auto py-12 text-center text-xs font-semibold text-slate-500">Loading job scheduler...</div>}>
      <NewJobContent />
    </React.Suspense>
  );
}
