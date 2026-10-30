-- Additive Paystack and financial-accounting foundation.
-- Existing payment, invoice, payroll, and customer records are preserved.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paystack';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paystack_status TEXT,
  ADD COLUMN IF NOT EXISTS paystack_fee NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS paystack_channel TEXT,
  ADD COLUMN IF NOT EXISTS paystack_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS paystack_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  paystack_reference TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_ref TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense', 'fee', 'refund', 'settlement', 'adjustment')),
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method payment_method,
  account_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed')),
  reference TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  expense_id UUID REFERENCES expenses(id) ON DELETE RESTRICT,
  payroll_item_id UUID REFERENCES payroll_items(id) ON DELETE RESTRICT,
  related_record JSONB,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_ledger_payment_once
  ON financial_ledger_entries(payment_id, entry_type)
  WHERE payment_id IS NOT NULL AND status = 'completed';

CREATE INDEX IF NOT EXISTS payments_paystack_reference_idx
  ON payments(paystack_reference);

ALTER TABLE paystack_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access Paystack webhook events"
  ON paystack_webhook_events FOR ALL USING (is_admin());

CREATE POLICY "Admin full access financial ledger"
  ON financial_ledger_entries FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users read own Paystack payments"
  ON payments FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT c.id
      FROM clients c
      JOIN profiles p ON lower(p.email) = lower(c.email)
      WHERE p.id = auth.uid()
    )
  );
