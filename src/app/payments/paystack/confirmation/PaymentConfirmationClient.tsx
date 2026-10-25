'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';

type VerificationState = 'loading' | 'verified' | 'pending' | 'error';

export default function PaymentConfirmationClient({ reference }: { reference: string }) {
  const [state, setState] = useState<VerificationState>(reference ? 'loading' : 'error');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  const verifyPayment = useCallback(async () => {
    if (!reference) {
      setMessage('No payment reference was provided. Please return to checkout and try again.');
      return;
    }

    setState('loading');
    setMessage('');

    try {
      const response = await fetch('/api/payments/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = (await response.json()) as { status?: string; error?: string };

      if (data.status === 'verified') {
        setState('verified');
        return;
      }

      if (response.status === 202 && data.status === 'pending') {
        setState('pending');
        setMessage('Paystack has received your payment, but verification is still in progress.');
        return;
      }

      setState('error');
      setMessage(data.error || 'We could not verify this payment.');
    } catch {
      setState('error');
      setMessage('We could not reach the payment verification service. Please try again.');
    }
  }, [reference]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment, retry]);

  const isLoading = state === 'loading';
  const isVerified = state === 'verified';
  const isPending = state === 'pending';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {isLoading && <Loader2 className="mx-auto h-14 w-14 animate-spin text-blue-600" />}
        {isVerified && <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />}
        {isPending && <Clock3 className="mx-auto h-14 w-14 text-amber-500" />}
        {state === 'error' && <AlertCircle className="mx-auto h-14 w-14 text-red-500" />}

        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
          {isLoading && 'Verifying your payment'}
          {isVerified && 'Payment confirmed'}
          {isPending && 'Payment verification in progress'}
          {state === 'error' && 'Payment could not be confirmed'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isLoading && 'Please wait while we securely confirm your transaction with Paystack.'}
          {isVerified && 'Your payment was successful and your booking or invoice has been updated.'}
          {isPending && message}
          {state === 'error' && message}
        </p>

        {reference && (
          <p className="mt-5 break-all rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700">
            Reference: {reference}
          </p>
        )}

        {(isPending || state === 'error') && (
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700"
          >
            Try verification again
          </button>
        )}
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Return to homepage
        </Link>
      </section>
    </main>
  );
}
