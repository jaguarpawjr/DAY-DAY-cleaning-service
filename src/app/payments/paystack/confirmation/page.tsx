import PaymentConfirmationClient from './PaymentConfirmationClient';

export default async function PaystackConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return <PaymentConfirmationClient reference={reference || ''} />;
}
