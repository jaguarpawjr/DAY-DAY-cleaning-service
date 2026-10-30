'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Mail, MessageCircle, Phone } from 'lucide-react';
import { Service } from '@/types/database';

export default function HomepageBookingForm({ initialServices }: { initialServices: Service[] }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          service: initialServices.find((item) => item.id === serviceId)?.name || '',
          message: message.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your message. Please try again.');
      setSent(true);
    } catch (submitError: any) {
      setError(submitError.message || 'We could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-blue-300 text-slate-900"><CheckCircle2 className="h-6 w-6" /></div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Message sent</p>
        <h2 className="mt-2 text-2xl font-bold">The DAYDAY team has your note.</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">An administrator will contact you shortly using the details you shared.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white">Send another message <ArrowRight className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-2xl shadow-slate-900/20 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Talk to DAYDAY</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">How can we help?</h2>
        </div>
        <div className="rounded-full bg-white/10 p-2.5 text-blue-300"><MessageCircle className="h-5 w-5" /></div>
      </div>

      {error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-300/30 bg-red-500/15 p-3 text-xs text-red-100"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      <div className="space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/70">Your name <span className="text-blue-300">*</span></span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Kwame Mensah" className="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue-300" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/70">Phone number <span className="text-blue-300">*</span></span><span className="relative block"><Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/40" /><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="024 000 0000" className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue-300" /></span></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/70">Email address <span className="font-normal text-white/40">(optional)</span></span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/40" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-9 pr-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue-300" /></span></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/70">What can we help with?</span><select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-300 [&>option]:text-slate-900"><option value="">General question</option>{initialServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/70">Your message <span className="text-blue-300">*</span></span><textarea required rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you need help with..." className="w-full resize-none rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue-300" /></label>
      </div>

      <button type="submit" disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-300 px-4 py-3.5 text-sm font-extrabold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending message...' : 'Contact admin'} <ArrowRight className="h-4 w-4" /></button>
      <p className="mt-3 text-center text-[11px] text-white/45">No booking is created. An administrator will reply directly.</p>
    </form>
  );
}
