-- Migration: 20261024140000_production_enhancements.sql
-- Description: Storage bucket for brand-assets, homepage draft snapshot, Paystack transfers & settlement reconciliation support

-- 1. Create Public Storage Bucket for Brand Assets & Service Images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
CREATE POLICY "Public read brand-assets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Admin upload brand-assets" ON storage.objects;
CREATE POLICY "Admin upload brand-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND is_admin());

DROP POLICY IF EXISTS "Admin update brand-assets" ON storage.objects;
CREATE POLICY "Admin update brand-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND is_admin())
  WITH CHECK (bucket_id = 'brand-assets' AND is_admin());

DROP POLICY IF EXISTS "Admin delete brand-assets" ON storage.objects;
CREATE POLICY "Admin delete brand-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND is_admin());

-- 2. Homepage Draft Snapshot Isolation
ALTER TABLE homepage_revisions
  ADD COLUMN IF NOT EXISTS draft_snapshot JSONB DEFAULT NULL;

-- 3. Paystack Transfers & Staff Payment Details
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS momo_number TEXT,
  ADD COLUMN IF NOT EXISTS momo_provider TEXT DEFAULT 'MTN',
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;

ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending';

-- 4. Paystack Settlement & Reconciliation Tracking
CREATE TABLE IF NOT EXISTS paystack_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id TEXT UNIQUE NOT NULL, -- Paystack settlement ID or reference
  settlement_date DATE NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  net_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- pending, success, completed, flagged
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  ledger_entry_id UUID REFERENCES financial_ledger_entries(id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paystack_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage paystack settlements" ON paystack_settlements;
CREATE POLICY "Admin manage paystack settlements" ON paystack_settlements
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
