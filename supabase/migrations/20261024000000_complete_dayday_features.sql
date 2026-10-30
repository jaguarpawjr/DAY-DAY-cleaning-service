-- DAYDAY feature completion migration.
-- Additive and safe for existing bookings, invoices, payments, employees, and payroll.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS homepage_heading TEXT NOT NULL DEFAULT 'Spotless Clean Spaces.',
  ADD COLUMN IF NOT EXISTS homepage_welcome TEXT NOT NULL DEFAULT 'Professional cleaning services delivered with care across Greater Accra.',
  ADD COLUMN IF NOT EXISTS homepage_footer TEXT NOT NULL DEFAULT 'Satisfaction Guaranteed.';

-- Preserve the policies created by the initial schema. Update them in place
-- instead of creating duplicate company_settings policies.
ALTER POLICY "Public read company settings" ON company_settings
  USING (true);
ALTER POLICY "Admin update company settings" ON company_settings
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (pricing_type IN ('fixed', 'starting', 'hourly', 'quotation')),
  ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS promotion_expires_at DATE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Greater Accra',
  description TEXT,
  travel_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (travel_fee >= 0),
  available_service_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, region)
);

CREATE TABLE IF NOT EXISTS homepage_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  company_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  service_ids UUID[] NOT NULL DEFAULT '{}',
  service_area_ids UUID[] NOT NULL DEFAULT '{}',
  edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(revision_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_one_published
  ON homepage_revisions(status) WHERE status = 'published';

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active service areas" ON service_areas;
CREATE POLICY "Public read active service areas" ON service_areas
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage service areas" ON service_areas;
CREATE POLICY "Admin manage service areas" ON service_areas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin manage homepage revisions" ON homepage_revisions;
CREATE POLICY "Admin manage homepage revisions" ON homepage_revisions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Public read published homepage revision" ON homepage_revisions;
CREATE POLICY "Public read published homepage revision" ON homepage_revisions
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE INDEX IF NOT EXISTS services_sort_order_idx ON services(is_active, sort_order);
CREATE INDEX IF NOT EXISTS service_areas_sort_order_idx ON service_areas(is_active, sort_order);
CREATE INDEX IF NOT EXISTS payments_client_date_idx ON payments(client_id, payment_date DESC);

DROP POLICY IF EXISTS "Customers read own bookings" ON bookings;
CREATE POLICY "Customers read own bookings" ON bookings
  FOR SELECT TO authenticated USING (
    lower(customer_email) = lower((SELECT email FROM profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Customers read own invoices" ON invoices;
CREATE POLICY "Customers read own invoices" ON invoices
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM clients WHERE lower(email) = lower((SELECT email FROM profiles WHERE id = auth.uid())))
  );

DROP POLICY IF EXISTS "Customers read own payments" ON payments;
CREATE POLICY "Customers read own payments" ON payments
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM clients WHERE lower(email) = lower((SELECT email FROM profiles WHERE id = auth.uid())))
  );

-- A completed payroll item can create at most one completed payroll ledger entry.
CREATE UNIQUE INDEX IF NOT EXISTS payroll_ledger_once
  ON financial_ledger_entries(payroll_item_id, entry_type)
  WHERE payroll_item_id IS NOT NULL AND status = 'completed';

-- Keep the employee's supported pay types explicit without changing existing data.
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_salary_type_check;
DO $$ BEGIN
  ALTER TABLE employees ADD CONSTRAINT employees_salary_type_check
    CHECK (salary_type IN ('monthly', 'daily', 'hourly', 'per_job'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
