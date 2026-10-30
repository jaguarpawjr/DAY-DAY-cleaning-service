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
  const existingJobIdFromQuery = searchParams.get('id');

  const [existingJobs, setExistingJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(existingJobIdFromQuery || '');
  const isEditing = Boolean(selectedJobId);

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
  const [jobStatus, setJobStatus] = useState<string>('scheduled');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [cRes, sRes, eRes, jRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('services').select('*').eq('is_active', true).order('name'),
        supabase.from('employees').select('*').eq('employment_status', 'active'),
        supabase.from('jobs').select('*, client:clients(*), service:services(*), assigned_workers:job_workers(employee_id)').order('scheduled_date', { ascending: false }),
      ]);

      if (cRes.data) {
        setClients(cRes.data as Client[]);
        if (preselectedClientId && !existingJobIdFromQuery) {
          const matched = cRes.data.find((c) => c.id === preselectedClientId);
          if (matched) {
            setSelectedClientId(matched.id);
            setLocation(matched.service_address);
          }
        }
      }
      if (sRes.data && sRes.data.length > 0) {
        setServices(sRes.data as Service[]);
        if (!existingJobIdFromQuery) {
          setSelectedServiceId(sRes.data[0].id);
          setAgreedPrice(String(sRes.data[0].base_price));
        }
      }
      if (eRes.data) {
        setEmployees(eRes.data as Employee[]);
      }
      if (jRes.data) {
        setExistingJobs(jRes.data);
      }

      const activeId = existingJobIdFromQuery;
      if (activeId) {
        const { data: existingJob, error: existingJobError } = await supabase
          .from('jobs')
          .select('*, assigned_workers:job_workers(employee_id)')
          .eq('id', activeId)
          .single();

        if (existingJobError || !existingJob) {
          setErrorMessage('The selected job could not be found.');
          return;
        }

        setSelectedJobId(existingJob.id);
        setSelectedClientId(existingJob.client_id);
        setSelectedServiceId(existingJob.service_id);
        setScheduledDate(existingJob.scheduled_date);
        setScheduledStartTime(String(existingJob.scheduled_start_time).slice(0, 5));
        setLocation(existingJob.location || '');
        setAgreedPrice(String(existingJob.agreed_price));
        setMaterialsRequired(existingJob.materials_required || '');
        setJobStatus(existingJob.status || 'scheduled');
        setAssignedEmployeeIds(
          (existingJob.assigned_workers || []).map((worker: { employee_id: string }) => worker.employee_id)
        );
      }
    }
    loadData();
  }, [existingJobIdFromQuery, preselectedClientId, supabase]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setErrorMessage(null);
    if (!jobId) {
      // Switched back to create new job
      setJobStatus('scheduled');
      if (services.length > 0) {
        setSelectedServiceId(services[0].id);
        setAgreedPrice(String(services[0].base_price));
      }
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setScheduledStartTime('09:00');
      setLocation('');
      setMaterialsRequired('General cleaning kit, vacuum, mop set');
      setAssignedEmployeeIds([]);
      return;
    }

    const job = existingJobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedClientId(job.client_id || '');
      setSelectedServiceId(job.service_id || '');
      setScheduledDate(job.scheduled_date || new Date().toISOString().split('T')[0]);
      setScheduledStartTime(String(job.scheduled_start_time || '09:00').slice(0, 5));
      setLocation(job.location || '');
      setAgreedPrice(String(job.agreed_price || '0'));
      setMaterialsRequired(job.materials_required || '');
      setJobStatus(job.status || 'scheduled');
      setAssignedEmployeeIds(
        (job.assigned_workers || []).map((w: any) => w.employee_id).filter(Boolean)
      );
    }
  };

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
      if (isEditing) {
        // Update existing job - do NOT create a new job!
        const payload = {
          job_id: selectedJobId,
          client_id: selectedClientId,
          service_id: selectedServiceId,
          scheduled_date: scheduledDate,
          scheduled_start_time: scheduledStartTime + ':00',
          location: location.trim(),
          agreed_price: parseFloat(agreedPrice || '0'),
          materials_required: materialsRequired,
          status: jobStatus,
          assigned_employee_ids: assignedEmployeeIds,
        };

        const response = await fetch('/api/jobs/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update existing job');
        router.push(`/jobs/${selectedJobId}`);
      } else {
        // Schedule brand new job
        const payload = {
          client_id: selectedClientId,
          service_id: selectedServiceId,
          scheduled_date: scheduledDate,
          scheduled_start_time: scheduledStartTime + ':00',
          location: location.trim(),
          agreed_price: parseFloat(agreedPrice || '0'),
          materials_required: materialsRequired,
          status: jobStatus || (assignedEmployeeIds.length > 0 ? 'assigned' : 'scheduled'),
          assigned_employee_ids: assignedEmployeeIds,
        };

        const response = await fetch('/api/jobs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create cleaning job');
        router.push(`/jobs/${data.job.id}`);
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save job');
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
          <h1 className="text-2xl font-extrabold text-slate-900">
            {isEditing ? 'Update Existing Cleaning Job' : 'Schedule Cleaning Job'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEditing
              ? 'Editing status, cleaner crew, or schedule of an existing job (will not duplicate).'
              : 'Dispatch a new cleaning assignment or select an existing job below to modify.'}
          </p>
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
          {/* Select Existing Job to Update OR Create New */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
              Select Cleaning Job to Schedule / Edit
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => handleSelectJob(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">➕ Create & Schedule New Job</option>
              {existingJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_number} — {j.client?.name || 'Client'} ({j.service?.name || 'Service'}) • Status: {j.status} • {j.scheduled_date}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-[11px] font-semibold text-blue-600 mt-1.5 flex items-center gap-1">
                <span>ℹ️ Currently modifying existing job. Saving will update this record directly without creating a duplicate.</span>
              </p>
            )}
          </div>

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

            {/* Status Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job Status *
              </label>
              <select
                required
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="awaiting_inspection">Awaiting Inspection</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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

            {/* Assign Crew / Cleaners */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assign Cleaners & Crew ({assignedEmployeeIds.length} Selected)
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
                          ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p>{emp.full_name}</p>
                        {isSelected && <span className="text-[10px] text-blue-600 font-bold">✓ Assigned</span>}
                      </div>
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
              <span>
                {isSubmitting
                  ? (isEditing ? 'Updating Job...' : 'Creating Job...')
                  : isEditing
                  ? 'Update Old Job'
                  : 'Schedule Cleaning Job'}
              </span>
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
