import { redirect } from 'next/navigation';

export default async function PaystackCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference || params.trxref;

  redirect(
    reference
      ? `/payments/paystack/confirmation?reference=${encodeURIComponent(reference)}`
      : '/payments/paystack/confirmation',
  );
}
