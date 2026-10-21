'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MessageSquareWarning, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Client, Job, ComplaintPriority } from '@/types/database';

export default function NewComplaintPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [cRes, jRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('jobs').select('*').order('scheduled_date', { ascending: false }).limit(20),
      ]);
      if (cRes.data) {
        setClients(cRes.data as Client[]);
        if (cRes.data.length > 0) setSelectedClientId(cRes.data[0].id);
      }
      if (jRes.data) setJobs(jRes.data as Job[]);
    }
    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !subject.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { count } = await supabase.from('complaints').select('*', { count: 'exact', head: true });
      const currentYear = new Date().getFullYear();
      const ticketNumber = `CMP-${currentYear}-${String((count || 0) + 1).padStart(3, '0')}`;

      const { error } = await supabase.from('complaints').insert({
        ticket_number: ticketNumber,
        client_id: selectedClientId,
        job_id: selectedJobId || null,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
      });

      if (error) throw error;

      router.push('/complaints');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to log ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/complaints"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Complaints
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Log Customer Quality Ticket</h1>
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
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Related Cleaning Job (Optional)
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">-- No Specific Job --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_number} ({j.scheduled_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="low">Low (General suggestion / enquiry)</option>
                <option value="medium">Medium (Requires attention next clean)</option>
                <option value="high">High (Missed area / immediate rework)</option>
                <option value="urgent">Urgent (Supervisor dispatch required)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Issue Subject *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Living room rug edges missed during vacuuming"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Client Remarks *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the customer's feedback and required corrective action..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/complaints"
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
              <span>{isSubmitting ? 'Logging...' : 'Log Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
