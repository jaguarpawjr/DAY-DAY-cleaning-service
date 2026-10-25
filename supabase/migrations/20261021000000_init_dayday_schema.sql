-- ==============================================================================
-- DAYDAY SPARKLE AND SHINE CLEANING SERVICE - DATABASE INITIALIZATION
-- Tagline: "Satisfaction Guaranteed."
-- Currency: Ghana Cedis (GH₵)
-- Timezone: Africa/Accra
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'employee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('residential', 'commercial', 'corporate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'rescheduled', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('scheduled', 'assigned', 'in_progress', 'awaiting_inspection', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('momo', 'bank_transfer', 'cash');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending_verification', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'cleaning_materials',
    'transport_fuel',
    'employee_salaries',
    'equipment_purchase',
    'equipment_maintenance',
    'rent',
    'utilities',
    'marketing',
    'insurance',
    'communication',
    'staff_allowances',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_category AS ENUM ('cleaning_chemical', 'consumable', 'tool', 'equipment', 'protective_gear');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_condition AS ENUM ('new', 'good', 'fair', 'needs_repair', 'damaged');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('purchase', 'issue_to_job', 'return', 'damaged', 'lost', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'late', 'half_day', 'absent', 'on_leave');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'emergency', 'unpaid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('draft', 'review', 'approved', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('active', 'paused', 'expired', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('open', 'investigating', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. HELPER FUNCTIONS FOR RLS & AUDIT
-- ==============================================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1 Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
  tagline TEXT NOT NULL DEFAULT 'Satisfaction Guaranteed.',
  phone TEXT NOT NULL DEFAULT '+233 24 000 0000',
  email TEXT NOT NULL DEFAULT 'contact@daydaysparkle.com',
  address TEXT NOT NULL DEFAULT 'Accra, Greater Accra, Ghana',
  default_currency TEXT NOT NULL DEFAULT 'GH₵',
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  logo_url TEXT,
  momo_account_name TEXT DEFAULT 'DAYDAY CLEANING SERVICE',
  momo_account_number TEXT DEFAULT '0240000000',
  momo_network TEXT DEFAULT 'MTN',
  bank_name TEXT DEFAULT 'GCB Bank',
  bank_account_name TEXT DEFAULT 'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
  bank_account_number TEXT DEFAULT '1010000000000',
  bank_branch TEXT DEFAULT 'Accra Central',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Clients (Customer CRM)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_type client_type NOT NULL DEFAULT 'residential',
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  service_address TEXT NOT NULL,
  gps_location TEXT, -- Ghana Post GPS or GPS coordinates
  preferred_contact_method TEXT DEFAULT 'phone',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  employee_id TEXT UNIQUE NOT NULL, -- e.g. EMP-001
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE,
  job_title TEXT NOT NULL, -- Cleaner, Supervisor, Driver, Operations
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employment_status TEXT NOT NULL DEFAULT 'active', -- active, on_leave, terminated
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  salary_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, daily, hourly
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  documents JSONB DEFAULT '[]'::jsonb, -- array of document URLs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 2.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  icon_name TEXT DEFAULT 'Sparkles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 Bookings (Customer Booking Requests & Inquiries)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref TEXT UNIQUE NOT NULL, -- e.g. BK-202610-001
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  property_type TEXT NOT NULL DEFAULT 'residential',
  service_address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT NOT NULL,
  duration_hours NUMERIC(4, 1) DEFAULT 3.0,
  special_instructions TEXT,
  quoted_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deposit_required NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status booking_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 Jobs (Operational Cleaning Jobs)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL, -- e.g. JOB-202610-001
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME,
  location TEXT NOT NULL,
  agreed_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  materials_required TEXT,
  actual_materials_used TEXT,
  status job_status NOT NULL DEFAULT 'scheduled',
  completion_notes TEXT,
  customer_feedback TEXT,
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 Job Workers (Assignments)
CREATE TABLE IF NOT EXISTS job_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'cleaner', -- 'lead', 'cleaner', 'driver'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, employee_id)
);

-- 3.9 Job Photographs (Before & After)
CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL, -- e.g. INV-202610-001
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status invoice_status NOT NULL DEFAULT 'draft',
  payment_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.12 Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_ref TEXT UNIQUE NOT NULL, -- e.g. PAY-202610-001
  invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method NOT NULL DEFAULT 'momo',
  reference_number TEXT, -- Mobile money ref / bank transaction ID
  receipt_url TEXT,
  notes TEXT,
  status payment_status NOT NULL DEFAULT 'pending_verification',
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.13 Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  supplies_provided TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.14 Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL, -- e.g. EXP-202610-001
  description TEXT NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  receipt_url TEXT,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status expense_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.15 Inventory Items & Equipment
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL, -- e.g. MAT-001, EQP-001
  name TEXT NOT NULL,
  category item_category NOT NULL DEFAULT 'consumable',
  unit_of_measure TEXT NOT NULL DEFAULT 'pieces', -- litres, bottles, boxes, pieces, sets
  quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
  minimum_stock_level NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  storage_location TEXT DEFAULT 'Main Warehouse - Accra',
  is_reusable BOOLEAN NOT NULL DEFAULT false, -- true for machines/vacuum/mop, false for chemicals
  equipment_condition item_condition DEFAULT 'good',
  purchase_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.16 Stock Movements (Audit Trail for Inventory)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL, -- positive for added, negative for deducted
  previous_quantity NUMERIC(12, 2) NOT NULL,
  new_quantity NUMERIC(12, 2) NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reference_id TEXT, -- e.g. Job number or PO number
  reason TEXT NOT NULL,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.17 Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL, -- e.g. PO-202610-001
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ordered, received, cancelled
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.18 Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_ordered NUMERIC(12, 2) NOT NULL,
  quantity_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.19 Employee Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'present',
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- 3.20 Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.21 Payroll Periods & Batches
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_ref TEXT UNIQUE NOT NULL, -- e.g. PAYROLL-2026-10
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  status payroll_status NOT NULL DEFAULT 'draft',
  total_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_net NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_year, period_month)
);

-- 3.22 Payroll Line Items (Per Employee)
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  overtime_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method payment_method NOT NULL DEFAULT 'momo',
  payment_ref TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payroll_id, employee_id)
);

-- 3.23 Contracts (Recurring Commercial / Residential Cleaning)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_ref TEXT UNIQUE NOT NULL, -- e.g. CTR-2026-001
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  frequency contract_frequency NOT NULL DEFAULT 'weekly',
  price_per_period NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  status contract_status NOT NULL DEFAULT 'active',
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.24 Complaints & Quality Feedback
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- e.g. CMP-202610-001
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.25 Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  passed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  checklist_results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.26 Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means broadcast to all admins
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, urgent
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.27 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. BUSINESS LOGIC STORED PROCEDURES & TRIGGERS
-- ==============================================================================

-- 4.1 Update invoice balance and client balance on verified payments
CREATE OR REPLACE FUNCTION handle_payment_verified()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_new_paid NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_new_status invoice_status;
BEGIN
  -- If payment transitioned to verified
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status <> 'verified') THEN
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
      IF FOUND THEN
        v_new_paid := v_invoice.paid_amount + NEW.amount;
        v_new_balance := GREATEST(0.00, v_invoice.total_amount - v_new_paid);
        
        IF v_new_balance = 0.00 THEN
          v_new_status := 'paid';
        ELSE
          v_new_status := 'partially_paid';
        END IF;

        UPDATE invoices
        SET paid_amount = v_new_paid,
            balance_due = v_new_balance,
            status = v_new_status,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
      END IF;
    END IF;

    -- Update client outstanding balance
    UPDATE clients
    SET outstanding_balance = GREATEST(0.00, outstanding_balance - NEW.amount),
        updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_verified ON payments;
CREATE TRIGGER trg_payment_verified
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_verified();

-- 4.2 Auto sync client balance when invoice is created or updated
CREATE OR REPLACE FUNCTION handle_invoice_balance_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clients
    SET outstanding_balance = outstanding_balance + NEW.balance_due,
        updated_at = NOW()
    WHERE id = NEW.client_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE clients
    SET outstanding_balance = GREATEST(0.00, outstanding_balance + (NEW.balance_due - OLD.balance_due)),
        updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_balance_sync ON invoices;
CREATE TRIGGER trg_invoice_balance_sync
  AFTER INSERT OR UPDATE OF balance_due ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_balance_sync();

-- 4.3 Atomic stock adjustment function
CREATE OR REPLACE FUNCTION record_inventory_movement(
  p_item_id UUID,
  p_movement_type stock_movement_type,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC,
  p_reference_id TEXT,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
  v_prev_qty NUMERIC;
  v_new_qty NUMERIC;
  v_movement_id UUID;
BEGIN
  -- Lock item row for concurrent update safety
  SELECT * INTO v_item FROM inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found.';
  END IF;

  v_prev_qty := v_item.quantity_on_hand;

  -- Determine new quantity based on movement
  IF p_movement_type IN ('purchase', 'return') THEN
    v_new_qty := v_prev_qty + ABS(p_quantity);
  ELSIF p_movement_type IN ('issue_to_job', 'damaged', 'lost') THEN
    IF v_prev_qty < ABS(p_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock. Current: %, requested: %', v_prev_qty, p_quantity;
    END IF;
    v_new_qty := v_prev_qty - ABS(p_quantity);
  ELSIF p_movement_type = 'adjustment' THEN
    v_new_qty := p_quantity;
  END IF;

  -- Update inventory item
  UPDATE inventory_items
  SET quantity_on_hand = v_new_qty,
      updated_at = NOW()
  WHERE id = p_item_id;

  -- Insert stock movement audit log
  INSERT INTO stock_movements (
    item_id, movement_type, quantity, previous_quantity, new_quantity,
    unit_cost, total_cost, reference_id, reason, recorded_by
  ) VALUES (
    p_item_id, p_movement_type, p_quantity, v_prev_qty, v_new_qty,
    p_unit_cost, (p_unit_cost * ABS(p_quantity)), p_reference_id, p_reason, p_user_id
  ) RETURNING id INTO v_movement_id;

  -- Check if below minimum stock level and trigger notification
  IF v_new_qty <= v_item.minimum_stock_level THEN
    INSERT INTO notifications (title, message, type, link)
    VALUES (
      'Low Stock Alert: ' || v_item.name,
      'Stock level for ' || v_item.name || ' is down to ' || v_new_qty || ' ' || v_item.unit_of_measure || ' (minimum: ' || v_item.minimum_stock_level || ').',
      'warning',
      '/inventory'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_quantity', v_prev_qty,
    'new_quantity', v_new_qty
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Re-running an interrupted initialization must not fail on policies that
-- were created before the previous attempt stopped. These are the policies
-- defined by this migration; they are recreated below with the same names
-- and definitions.
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename, policyname) IN (
        ('company_settings', 'Public read company settings'),
        ('company_settings', 'Admin update company settings'),
        ('profiles', 'Admin full access profiles'),
        ('profiles', 'Users read own profile'),
        ('profiles', 'Users update own profile'),
        ('clients', 'Admin full access clients'),
        ('clients', 'Employee view assigned job clients'),
        ('employees', 'Admin full access employees'),
        ('employees', 'Employee read own employee record'),
        ('services', 'Public view active services'),
        ('services', 'Admin full access services'),
        ('bookings', 'Admin full access bookings'),
        ('bookings', 'Public submit bookings'),
        ('bookings', 'Public read booking by reference'),
        ('jobs', 'Admin full access jobs'),
        ('jobs', 'Employee view assigned jobs'),
        ('jobs', 'Employee update assigned jobs'),
        ('job_workers', 'Admin full access job_workers'),
        ('job_workers', 'Employee view own assignments'),
        ('job_photos', 'Admin full access job_photos'),
        ('job_photos', 'Employee view assigned job photos'),
        ('job_photos', 'Employee upload job photos'),
        ('invoices', 'Admin full access invoices'),
        ('invoice_items', 'Admin full access invoice_items'),
        ('payments', 'Admin full access payments'),
        ('suppliers', 'Admin full access suppliers'),
        ('expenses', 'Admin full access expenses'),
        ('expenses', 'Employee view own expenses'),
        ('expenses', 'Employee submit expense'),
        ('inventory_items', 'Admin full access inventory'),
        ('inventory_items', 'Employee view inventory items'),
        ('stock_movements', 'Admin full access stock movements'),
        ('purchase_orders', 'Admin full access purchase orders'),
        ('purchase_order_items', 'Admin full access purchase order items'),
        ('attendance', 'Admin full access attendance'),
        ('attendance', 'Employee view own attendance'),
        ('attendance', 'Employee clock in'),
        ('attendance', 'Employee clock out'),
        ('leave_requests', 'Admin full access leave_requests'),
        ('leave_requests', 'Employee view own leave requests'),
        ('leave_requests', 'Employee submit leave request'),
        ('payroll', 'Admin full access payroll'),
        ('payroll_items', 'Admin full access payroll items'),
        ('payroll_items', 'Employee view own payslip'),
        ('contracts', 'Admin full access contracts'),
        ('complaints', 'Admin full access complaints'),
        ('complaints', 'Public submit complaint'),
        ('quality_inspections', 'Admin full access inspections'),
        ('notifications', 'Admin full access notifications'),
        ('notifications', 'User view own notifications'),
        ('notifications', 'User mark notification read'),
        ('audit_logs', 'Admin view audit logs')
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  END LOOP;
END
$$;

-- 5.1 company_settings: Anyone authenticated or public can read branding, only admin can update.
-- Keep existing policies when this migration is re-run against a partially
-- initialized database.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_settings'
      AND policyname = 'Public read company settings'
  ) THEN
    CREATE POLICY "Public read company settings"
      ON company_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_settings'
      AND policyname = 'Admin update company settings'
  ) THEN
    CREATE POLICY "Admin update company settings"
      ON company_settings FOR ALL USING (is_admin());
  END IF;
END
$$;

-- 5.2 profiles:
-- Admin has full access
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (is_admin());
-- Users can view their own profile
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (id = auth.uid());
-- Users can update their own phone / avatar
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 5.3 clients:
-- Admin full access
CREATE POLICY "Admin full access clients" ON clients FOR ALL USING (is_admin());
-- Employees can view client name and address for assigned jobs
CREATE POLICY "Employee view assigned job clients" ON clients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN job_workers jw ON jw.job_id = j.id
    JOIN employees e ON e.id = jw.employee_id
    WHERE j.client_id = clients.id AND e.profile_id = auth.uid()
  )
);

-- 5.4 employees:
-- Admin full access
CREATE POLICY "Admin full access employees" ON employees FOR ALL USING (is_admin());
-- Employee can view their own record
CREATE POLICY "Employee read own employee record" ON employees FOR SELECT USING (profile_id = auth.uid());

-- 5.5 services:
-- Public and all users can view active services
CREATE POLICY "Public view active services" ON services FOR SELECT USING (is_active = true);
-- Admin can manage all services
CREATE POLICY "Admin full access services" ON services FOR ALL USING (is_admin());

-- 5.6 bookings:
-- Admin full access
CREATE POLICY "Admin full access bookings" ON bookings FOR ALL USING (is_admin());
-- Public can submit new bookings (Customer booking portal)
CREATE POLICY "Public submit bookings" ON bookings FOR INSERT WITH CHECK (true);
-- Public can view booking by reference if provided
CREATE POLICY "Public read booking by reference" ON bookings FOR SELECT USING (true);

-- 5.7 jobs:
-- Admin full access
CREATE POLICY "Admin full access jobs" ON jobs FOR ALL USING (is_admin());
-- Assigned employees can view their assigned jobs
CREATE POLICY "Employee view assigned jobs" ON jobs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM job_workers jw
    JOIN employees e ON e.id = jw.employee_id
    WHERE jw.job_id = jobs.id AND e.profile_id = auth.uid()
  )
);
-- Assigned employees can update status (in_progress, awaiting_inspection), completion notes, actual materials used
CREATE POLICY "Employee update assigned jobs" ON jobs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM job_workers jw
    JOIN employees e ON e.id = jw.employee_id
    WHERE jw.job_id = jobs.id AND e.profile_id = auth.uid()
  )
);

-- 5.8 job_workers:
CREATE POLICY "Admin full access job_workers" ON job_workers FOR ALL USING (is_admin());
CREATE POLICY "Employee view own assignments" ON job_workers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees e WHERE e.id = job_workers.employee_id AND e.profile_id = auth.uid()
  )
);

-- 5.9 job_photos:
CREATE POLICY "Admin full access job_photos" ON job_photos FOR ALL USING (is_admin());
CREATE POLICY "Employee view assigned job photos" ON job_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM job_workers jw
    JOIN employees e ON e.id = jw.employee_id
    WHERE jw.job_id = job_photos.job_id AND e.profile_id = auth.uid()
  )
);
CREATE POLICY "Employee upload job photos" ON job_photos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM job_workers jw
    JOIN employees e ON e.id = jw.employee_id
    WHERE jw.job_id = job_photos.job_id AND e.profile_id = auth.uid()
  )
);

-- 5.10 invoices & invoice_items: Only admin can access invoices
CREATE POLICY "Admin full access invoices" ON invoices FOR ALL USING (is_admin());
CREATE POLICY "Admin full access invoice_items" ON invoice_items FOR ALL USING (is_admin());

-- 5.11 payments: Only admin can access and verify payments
CREATE POLICY "Admin full access payments" ON payments FOR ALL USING (is_admin());

-- 5.12 suppliers: Only admin can manage suppliers
CREATE POLICY "Admin full access suppliers" ON suppliers FOR ALL USING (is_admin());

-- 5.13 expenses:
-- Admin full access
CREATE POLICY "Admin full access expenses" ON expenses FOR ALL USING (is_admin());
-- Employees can view their own submitted expenses
CREATE POLICY "Employee view own expenses" ON expenses FOR SELECT USING (submitted_by = auth.uid());
-- Employees can submit an expense for approval
CREATE POLICY "Employee submit expense" ON expenses FOR INSERT WITH CHECK (submitted_by = auth.uid() AND status = 'pending');

-- 5.14 inventory_items & stock_movements:
CREATE POLICY "Admin full access inventory" ON inventory_items FOR ALL USING (is_admin());
CREATE POLICY "Employee view inventory items" ON inventory_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin full access stock movements" ON stock_movements FOR ALL USING (is_admin());

-- 5.15 purchase_orders: Admin only
CREATE POLICY "Admin full access purchase orders" ON purchase_orders FOR ALL USING (is_admin());
CREATE POLICY "Admin full access purchase order items" ON purchase_order_items FOR ALL USING (is_admin());

-- 5.16 attendance:
CREATE POLICY "Admin full access attendance" ON attendance FOR ALL USING (is_admin());
CREATE POLICY "Employee view own attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance.employee_id AND e.profile_id = auth.uid())
);
CREATE POLICY "Employee clock in" ON attendance FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance.employee_id AND e.profile_id = auth.uid())
);
CREATE POLICY "Employee clock out" ON attendance FOR UPDATE USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance.employee_id AND e.profile_id = auth.uid())
);

-- 5.17 leave_requests:
CREATE POLICY "Admin full access leave_requests" ON leave_requests FOR ALL USING (is_admin());
CREATE POLICY "Employee view own leave requests" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = leave_requests.employee_id AND e.profile_id = auth.uid())
);
CREATE POLICY "Employee submit leave request" ON leave_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = leave_requests.employee_id AND e.profile_id = auth.uid())
);

-- 5.18 payroll & payroll_items:
-- Admin full access
CREATE POLICY "Admin full access payroll" ON payroll FOR ALL USING (is_admin());
CREATE POLICY "Admin full access payroll items" ON payroll_items FOR ALL USING (is_admin());
-- Employee can view ONLY their own approved/paid payroll item (payslip)
CREATE POLICY "Employee view own payslip" ON payroll_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN payroll p ON p.id = payroll_items.payroll_id
    WHERE e.id = payroll_items.employee_id 
      AND e.profile_id = auth.uid()
      AND p.status IN ('approved', 'paid')
  )
);

-- 5.19 contracts: Admin only
CREATE POLICY "Admin full access contracts" ON contracts FOR ALL USING (is_admin());

-- 5.20 complaints:
CREATE POLICY "Admin full access complaints" ON complaints FOR ALL USING (is_admin());
CREATE POLICY "Public submit complaint" ON complaints FOR INSERT WITH CHECK (true);

-- 5.21 quality_inspections:
CREATE POLICY "Admin full access inspections" ON quality_inspections FOR ALL USING (is_admin());

-- 5.22 notifications:
CREATE POLICY "Admin full access notifications" ON notifications FOR ALL USING (is_admin());
CREATE POLICY "User view own notifications" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR (user_id IS NULL AND is_admin())
);
CREATE POLICY "User mark notification read" ON notifications FOR UPDATE USING (
  user_id = auth.uid() OR (user_id IS NULL AND is_admin())
);

-- 5.23 audit_logs: Only admin can view audit logs
CREATE POLICY "Admin view audit logs" ON audit_logs FOR SELECT USING (is_admin());

-- ==============================================================================
-- 6. DEFAULT SEED DATA
-- ==============================================================================

-- 6.1 Company Settings Default
INSERT INTO company_settings (
  company_name,
  tagline,
  phone,
  email,
  address,
  default_currency,
  tax_rate_percent,
  momo_account_name,
  momo_account_number,
  momo_network,
  bank_name,
  bank_account_name,
  bank_account_number,
  bank_branch
) VALUES (
  'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
  'Satisfaction Guaranteed.',
  '+233 24 555 8899',
  'info@daydaysparkle.com',
  'Spintex Road, Flowerpot, Accra, Ghana',
  'GH₵',
  0.00,
  'DAYDAY SPARKLE AND SHINE',
  '0245558899',
  'MTN Mobile Money',
  'Ecobank Ghana',
  'DAYDAY SPARKLE AND SHINE CLEANING SERVICE',
  '1441002233445',
  'Spintex Branch'
) ON CONFLICT DO NOTHING;

-- 6.2 Standard Ghanaian Cleaning Services
INSERT INTO services (name, slug, description, base_price, duration_hours, icon_name) VALUES
('Residential Cleaning', 'residential-cleaning', 'Comprehensive home cleaning including dusting, mopping, kitchen and washroom sanitization.', 250.00, 3.0, 'Home'),
('Office & Commercial Cleaning', 'office-cleaning', 'Professional office maintenance, desk disinfection, common area cleaning, and trash disposal.', 450.00, 4.0, 'Briefcase'),
('Deep Cleaning Service', 'deep-cleaning', 'Intensive scrubbing, degreasing, grout cleaning, behind-appliance sanitization, and high-touch sterilization.', 600.00, 6.0, 'Sparkles'),
('Move-in / Move-out Cleaning', 'move-in-out-cleaning', 'Thorough empty-home cleaning to make properties sparkling clean for new occupants or landlords.', 500.00, 5.0, 'Truck'),
('Post-Construction Cleaning', 'post-construction-cleaning', 'Removal of paint splatter, plaster dust, cement residues, stickers, and debris after building works.', 850.00, 8.0, 'Hammer'),
('Carpet & Upholstery Cleaning', 'carpet-upholstery-cleaning', 'Steam extraction and stain removal for sofas, dining chairs, carpets, and mattresses.', 350.00, 3.0, 'Sofa'),
('Window & Glass Facade Cleaning', 'window-cleaning', 'Streak-free interior and exterior window washing for residences, retail storefronts, and high-reach glass.', 280.00, 3.0, 'Maximize'),
('Scheduled Contract Cleaning', 'contract-cleaning', 'Recurring daily, weekly, or biweekly bespoke cleaning service for businesses and estates.', 1200.00, 10.0, 'Calendar')
ON CONFLICT (slug) DO NOTHING;
