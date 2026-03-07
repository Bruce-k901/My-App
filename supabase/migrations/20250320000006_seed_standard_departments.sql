-- ============================================
-- Seed Standard Departments (Hospitality Focused)
-- ============================================
-- This migration creates standard department templates optimized for hospitality venues
-- These are stored in a reference table and can be copied to actual departments
-- Includes parent-child relationships for hierarchical organization

-- Create a reference table for standard departments
DROP TABLE IF EXISTS standard_departments CASCADE;

CREATE TABLE standard_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- e.g., 'Operations', 'Support', 'Management'
  parent_department_id UUID REFERENCES standard_departments(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert top-level departments first (hospitality-focused)
INSERT INTO standard_departments (name, description, category, display_order) VALUES
  -- Operations & Service
  ('Operations', 'Day-to-day operational activities and service delivery', 'Operations', 1),
  ('Front of House', 'Customer-facing service areas and guest experience', 'Operations', 2),
  ('Back of House', 'Kitchen, prep, and production areas', 'Operations', 3),
  ('Bar & Beverage', 'Bar service, beverage management, and drinks operations', 'Operations', 4),
  
  -- Management & Leadership
  ('Management', 'General management and leadership', 'Management', 10),
  ('Executive', 'Senior leadership and executive management', 'Management', 11),
  
  -- Support Functions
  ('Finance', 'Financial management, accounting, and budgeting', 'Support', 20),
  ('Human Resources', 'HR, recruitment, employee relations, and people management', 'Support', 21),
  ('IT', 'Information technology and technical support', 'Support', 22),
  ('Compliance', 'Regulatory compliance, health & safety, and risk management', 'Support', 23),
  
  -- Sales & Marketing
  ('Sales & Marketing', 'Sales, marketing, and business development', 'Sales & Marketing', 30),
  ('Customer Service', 'Customer support and service delivery', 'Sales & Marketing', 31),
  
  -- Facilities & Maintenance
  ('Facilities', 'Maintenance, housekeeping, and facilities management', 'Facilities', 40),
  
  -- Other
  ('Administration', 'Administrative support and office management', 'Other', 50),
  ('Training', 'Employee training and development', 'Other', 51),
  ('Procurement', 'Purchasing and vendor management', 'Other', 52);

-- Insert child departments with parent relationships
-- Operations children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Service',
  'Table service, customer interaction, and guest relations',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Front of House' LIMIT 1),
  2;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Hosting',
  'Reception, reservations, and guest welcome',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Front of House' LIMIT 1),
  3;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Kitchen',
  'Food preparation, cooking, and culinary operations',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Back of House' LIMIT 1),
  3;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Prep',
  'Food preparation, mise en place, and prep kitchen',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Back of House' LIMIT 1),
  4;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Pastry',
  'Desserts, baking, and pastry operations',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Back of House' LIMIT 1),
  5;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Bar Service',
  'Bar operations, cocktail service, and beverage preparation',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Bar & Beverage' LIMIT 1),
  4;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Cellar',
  'Wine management, storage, and beverage inventory',
  'Operations',
  (SELECT id FROM standard_departments WHERE name = 'Bar & Beverage' LIMIT 1),
  5;

-- Finance children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Accounting',
  'Accounts payable, receivable, and bookkeeping',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Finance' LIMIT 1),
  20;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Payroll',
  'Payroll processing, wage management, and employee payments',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Finance' LIMIT 1),
  21;

-- Human Resources children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Recruitment',
  'Hiring, talent acquisition, and onboarding',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Human Resources' LIMIT 1),
  21;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'People Operations',
  'Employee relations, engagement, and people management',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Human Resources' LIMIT 1),
  22;

-- Compliance children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Health & Safety',
  'Health, safety, and environmental management',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Compliance' LIMIT 1),
  23;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Food Safety',
  'Food safety, HACCP, and hygiene compliance',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Compliance' LIMIT 1),
  24;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Legal',
  'Legal affairs and regulatory compliance',
  'Support',
  (SELECT id FROM standard_departments WHERE name = 'Compliance' LIMIT 1),
  25;

-- Sales & Marketing children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Sales',
  'Sales team and revenue generation',
  'Sales & Marketing',
  (SELECT id FROM standard_departments WHERE name = 'Sales & Marketing' LIMIT 1),
  30;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Marketing',
  'Marketing, branding, and communications',
  'Sales & Marketing',
  (SELECT id FROM standard_departments WHERE name = 'Sales & Marketing' LIMIT 1),
  31;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Events',
  'Event planning, coordination, and management',
  'Sales & Marketing',
  (SELECT id FROM standard_departments WHERE name = 'Sales & Marketing' LIMIT 1),
  32;

-- Facilities children
INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Housekeeping',
  'Cleaning, laundry, and housekeeping services',
  'Facilities',
  (SELECT id FROM standard_departments WHERE name = 'Facilities' LIMIT 1),
  40;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Maintenance',
  'Facilities and equipment maintenance',
  'Facilities',
  (SELECT id FROM standard_departments WHERE name = 'Facilities' LIMIT 1),
  41;

INSERT INTO standard_departments (name, description, category, parent_department_id, display_order)
SELECT 
  'Security',
  'Security and safety services',
  'Facilities',
  (SELECT id FROM standard_departments WHERE name = 'Facilities' LIMIT 1),
  42;

-- Index for faster lookups
CREATE INDEX idx_standard_departments_category ON standard_departments(category);
CREATE INDEX idx_standard_departments_display_order ON standard_departments(display_order);
CREATE INDEX idx_standard_departments_parent ON standard_departments(parent_department_id);

-- RLS Policies (public read access, no write access needed)
ALTER TABLE standard_departments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read standard departments (they're reference data)
DROP POLICY IF EXISTS "standard_departments_select_public" ON standard_departments;
CREATE POLICY "standard_departments_select_public"
  ON standard_departments FOR SELECT
  USING (true);

-- Comments
COMMENT ON TABLE standard_departments IS 'Reference table of standard department names optimized for hospitality venues';
COMMENT ON COLUMN standard_departments.category IS 'Category grouping for better organization (Operations, Management, Support, etc.)';
COMMENT ON COLUMN standard_departments.parent_department_id IS 'Self-referencing foreign key for department hierarchy';
