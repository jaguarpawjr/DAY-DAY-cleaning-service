-- Migration: 20261024120000_remove_attendance_and_suppliers.sql
-- Description: Complete removal of attendance and suppliers features from database schema

-- 1. Remove Attendance Policies & Table
DROP POLICY IF EXISTS "Employee clock out" ON attendance;
DROP POLICY IF EXISTS "Employee clock in" ON attendance;
DROP POLICY IF EXISTS "Employee view own attendance" ON attendance;
DROP POLICY IF EXISTS "Admin full access attendance" ON attendance;

DROP TABLE IF EXISTS attendance CASCADE;

-- 2. Drop attendance_status enum type
DROP TYPE IF EXISTS attendance_status CASCADE;

-- 3. Remove Purchase Orders and Items (which depended strictly on suppliers)
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- 4. Remove supplier foreign key references from expenses and inventory_items
ALTER TABLE expenses DROP COLUMN IF EXISTS supplier_id CASCADE;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS supplier_id CASCADE;

-- 5. Remove Suppliers Policies & Table
DROP POLICY IF EXISTS "Admin full access suppliers" ON suppliers;
DROP TABLE IF EXISTS suppliers CASCADE;
