'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VerifyPaystackButton({ reference }: { reference: string }) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verify = async () => {
    setIsVerifying(true);
    setMessage(null);
    try {
      const response = await fetch('/api/payments/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(data.error || 'Unable to verify payment');
      }
      setMessage(data.status === 'verified' ? 'Verified' : 'Pending');
      if (data.status === 'verified') router.refresh();
    } catch (error: any) {
      setMessage(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={verify}
        disabled={isVerifying}
        className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verify'}
      </button>
      {message && (
        <span className="text-[10px] font-semibold text-slate-500">
          {message === 'Verified' && <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />}
          {message}
        </span>
      )}
    </div>
  );
}
