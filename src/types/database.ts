export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'employee';
export type ClientType = 'residential' | 'commercial' | 'corporate';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled';
export type JobStatus = 'scheduled' | 'assigned' | 'in_progress' | 'awaiting_inspection' | 'completed' | 'cancelled';
export type PaymentMethod = 'momo' | 'bank_transfer' | 'cash' | 'paystack';
export type PaymentStatus = 'pending_verification' | 'verified' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type ExpenseCategory =
  | 'cleaning_materials'
  | 'transport_fuel'
  | 'employee_salaries'
  | 'equipment_purchase'
  | 'equipment_maintenance'
  | 'rent'
  | 'utilities'
  | 'marketing'
  | 'insurance'
  | 'communication'
  | 'staff_allowances'
  | 'other';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type ItemCategory = 'cleaning_chemical' | 'consumable' | 'tool' | 'equipment' | 'protective_gear';
export type ItemCondition = 'new' | 'good' | 'fair' | 'needs_repair' | 'damaged';
export type StockMovementType = 'purchase' | 'issue_to_job' | 'return' | 'damaged' | 'lost' | 'adjustment';
export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type PayrollStatus = 'draft' | 'review' | 'approved' | 'paid';
export type ContractFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type ContractStatus = 'active' | 'paused' | 'expired' | 'terminated';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface CompanySettings {
  id: string;
  company_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  default_currency: string;
  tax_rate_percent: number;
  logo_url?: string | null;
  momo_account_name?: string | null;
  momo_account_number?: string | null;
  momo_network?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  homepage_heading?: string | null;
  homepage_welcome?: string | null;
  homepage_footer?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  client_type: ClientType;
  name: string;
  company_name?: string | null;
  phone: string;
  email?: string | null;
  service_address: string;
  gps_location?: string | null;
  preferred_contact_method: string;
  notes?: string | null;
  is_active: boolean;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  profile_id?: string | null;
  employee_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  job_title: string;
  hire_date: string;
  employment_status: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  salary_type: 'monthly' | 'daily' | 'hourly';
  base_salary: number;
  allowances: number;
  documents?: Json;
  momo_number?: string | null;
  momo_provider?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_code?: string | null;
  paystack_recipient_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  base_price: number;
  duration_hours: number;
  is_active: boolean;
  icon_name?: string | null;
  created_at: string;
  updated_at: string;
  pricing_type?: 'fixed' | 'starting' | 'hourly' | 'quotation';
  promotional_price?: number | null;
  promotion_expires_at?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export interface ServiceArea {
  id: string;
  name: string;
  region: string;
  description?: string | null;
  travel_fee: number;
  available_service_ids: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_ref: string;
  client_id?: string | null;
  service_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  property_type: string;
  service_address: string;
  preferred_date: string;
  preferred_time_slot: string;
  duration_hours?: number;
  special_instructions?: string | null;
  quoted_price: number;
  deposit_required: number;
  status: BookingStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation types
  service?: Service | null;
  client?: Client | null;
}

export interface Job {
  id: string;
  job_number: string;
  booking_id?: string | null;
  client_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time?: string | null;
  location: string;
  agreed_price: number;
  estimated_cost: number;
  materials_required?: string | null;
  actual_materials_used?: string | null;
  status: JobStatus;
  completion_notes?: string | null;
  customer_feedback?: string | null;
  customer_rating?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client | null;
  service?: Service | null;
  assigned_workers?: { employee: Employee; role: string }[];
}

export interface JobWorker {
  id: string;
  job_id: string;
  employee_id: string;
  role: string;
  assigned_at: string;
  employee?: Employee;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  photo_type: 'before' | 'after';
  photo_url: string;
  caption?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  job_id?: string | null;
  booking_id?: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: InvoiceStatus;
  payment_instructions?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_ref: string;
  invoice_id?: string | null;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  status: PaymentStatus;
  recorded_by?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
  booking_id?: string | null;
  paystack_reference?: string | null;
  paystack_status?: string | null;
  paystack_fee?: number | null;
  paystack_channel?: string | null;
  paystack_paid_at?: string | null;
  client?: Client;
  invoice?: Invoice;
}

export interface Expense {
  id: string;
  expense_number: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date_incurred: string;
  payment_method: PaymentMethod;
  receipt_url?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
  status: ExpenseStatus;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  submitter?: Profile;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  unit_of_measure: string;
  quantity_on_hand: number;
  minimum_stock_level: number;
  unit_cost: number;
  storage_location?: string | null;
  is_reusable: boolean;
  equipment_condition: ItemCondition;
  purchase_date?: string | null;
  expiry_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_id?: string | null;
  reason: string;
  recorded_by?: string | null;
  created_at: string;
  item?: InventoryItem;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Payroll {
  id: string;
  payroll_ref: string;
  period_month: number;
  period_year: number;
  status: PayrollStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  prepared_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  payroll_id: string;
  employee_id: string;
  basic_salary: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  payment_method: PaymentMethod;
  payment_ref?: string | null;
  payment_status: string;
  paystack_transfer_code?: string | null;
  paystack_transfer_reference?: string | null;
  transfer_status?: string | null;
  notes?: string | null;
  created_at: string;
  employee?: Employee;
}

export interface HomepageRevision {
  id: string;
  revision_number: number;
  status: 'draft' | 'published' | 'archived';
  company_settings: Record<string, any>;
  service_ids: string[];
  service_area_ids: string[];
  draft_snapshot?: {
    settings?: Record<string, any>;
    services?: Partial<Service>[];
    areas?: Partial<ServiceArea>[];
  } | null;
  edited_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
}

export interface PaystackSettlement {
  id: string;
  settlement_id: string;
  settlement_date: string;
  total_amount: number;
  net_amount: number;
  status: string;
  reconciled: boolean;
  reconciled_at?: string | null;
  ledger_entry_id?: string | null;
  raw_payload?: Json;
  created_at: string;
}

export interface Contract {
  id: string;
  contract_ref: string;
  client_id: string;
  service_id: string;
  title: string;
  frequency: ContractFrequency;
  price_per_period: number;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  status: ContractStatus;
  terms?: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  service?: Service;
}

export interface Complaint {
  id: string;
  ticket_number: string;
  client_id: string;
  job_id?: string | null;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  job?: Job;
}

export interface QualityInspection {
  id: string;
  job_id: string;
  inspector_id?: string | null;
  inspection_date: string;
  overall_score: number;
  passed: boolean;
  notes?: string | null;
  checklist_results?: Json;
  created_at: string;
  job?: Job;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_data?: Json;
  new_data?: Json;
  ip_address?: string | null;
  created_at: string;
}
