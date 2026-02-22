-- ============================================
-- ROLES & PERMISSIONS SYSTEM
-- ============================================
-- Flexible, company-customisable RBAC with scope-based permissions

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'companies or profiles tables do not exist - skipping roles_permissions migration';
    RETURN;
  END IF;

  -- ============================================
  -- TABLE: roles
  -- ============================================
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Role identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- e.g., 'owner', 'admin', 'hr_manager'
  description TEXT,
  
  -- Role hierarchy (lower = more access)
  hierarchy_level INTEGER NOT NULL DEFAULT 100,
  -- 0 = Owner, 10 = Admin, 20 = HR Manager, etc.
  
  -- Role type
  is_system_role BOOLEAN NOT NULL DEFAULT false, -- System roles can't be deleted
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- UI customisation
  color TEXT DEFAULT '#6B7280', -- For badges/chips
  icon TEXT DEFAULT 'user', -- Lucide icon name
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
      UNIQUE(company_id, slug)
    );
  $sql_table1$;

  -- Indexes for fast lookups
  CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
  CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(company_id, slug);
  CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(company_id, hierarchy_level);

  -- Updated_at trigger
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_roles_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- Create trigger only if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
    CREATE TRIGGER trg_roles_updated_at
      BEFORE UPDATE ON roles
      FOR EACH ROW
      EXECUTE FUNCTION update_roles_updated_at();
  END IF;

  -- ============================================
  -- TABLE: permissions
  -- ============================================
  -- Reference table of all available permissions
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY, -- e.g., 'employees.view', 'payroll.export'
  
  -- Permission details
  area TEXT NOT NULL, -- e.g., 'employees', 'payroll', 'schedule'
  action TEXT NOT NULL, -- e.g., 'view', 'edit', 'approve'
  name TEXT NOT NULL, -- Human-readable name
  description TEXT,
  
  -- Sensitivity level (for UI grouping)
  sensitivity TEXT NOT NULL DEFAULT 'low', -- 'critical', 'high', 'medium', 'low'
  
  -- Default scope options available for this permission
  -- Some permissions don't have scope (e.g., settings.edit is always company-wide)
  supports_scope BOOLEAN NOT NULL DEFAULT true,
  
  -- Sorting
  sort_order INTEGER NOT NULL DEFAULT 0,
  
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  $sql_table2$;

  -- Seed the permissions
  INSERT INTO permissions (id, area, action, name, description, sensitivity, supports_scope, sort_order) VALUES
  -- EMPLOYEES
  ('employees.view', 'employees', 'view', 'View Employees', 'View employee directory and profiles', 'medium', true, 10),
  ('employees.view_contact', 'employees', 'view', 'View Contact Details', 'View phone, email, address', 'high', true, 11),
  ('employees.view_financial', 'employees', 'view', 'View Financial Data', 'View salary, rates, bank details', 'critical', true, 12),
  ('employees.view_compliance', 'employees', 'view', 'View Compliance Data', 'View NI, tax, RTW, DBS', 'critical', true, 13),
  ('employees.create', 'employees', 'create', 'Add Employees', 'Create new employee records', 'high', false, 20),
  ('employees.edit', 'employees', 'edit', 'Edit Employees', 'Modify employee information', 'high', true, 30),
  ('employees.edit_financial', 'employees', 'edit', 'Edit Financial Data', 'Modify salary, rates, bank details', 'critical', true, 31),
  ('employees.delete', 'employees', 'delete', 'Archive Employees', 'Archive/terminate employees', 'high', true, 40),
  ('employees.export', 'employees', 'export', 'Export Employee Data', 'Download employee data', 'critical', true, 50),
  
  -- SCHEDULE
  ('schedule.view', 'schedule', 'view', 'View Schedules', 'View rota and shift information', 'low', true, 100),
  ('schedule.view_costs', 'schedule', 'view', 'View Schedule Costs', 'View labor costs and rates', 'high', true, 101),
  ('schedule.create', 'schedule', 'create', 'Create Shifts', 'Add shifts to the rota', 'medium', true, 110),
  ('schedule.edit', 'schedule', 'edit', 'Edit Shifts', 'Modify existing shifts', 'medium', true, 120),
  ('schedule.delete', 'schedule', 'delete', 'Delete Shifts', 'Remove shifts from rota', 'medium', true, 130),
  ('schedule.approve', 'schedule', 'approve', 'Approve Rotas', 'Approve rota submissions', 'medium', true, 140),
  ('schedule.publish', 'schedule', 'approve', 'Publish Schedules', 'Publish rotas to staff', 'medium', true, 141),
  
  -- ATTENDANCE
  ('attendance.view', 'attendance', 'view', 'View Attendance', 'View time entries and clock records', 'medium', true, 200),
  ('attendance.edit', 'attendance', 'edit', 'Edit Time Entries', 'Modify clock in/out times', 'medium', true, 210),
  ('attendance.approve', 'attendance', 'approve', 'Approve Timesheets', 'Approve timesheet submissions', 'medium', true, 220),
  ('attendance.submit_payroll', 'attendance', 'approve', 'Submit to Payroll', 'Submit approved timesheets to payroll', 'high', true, 230),
  
  -- LEAVE
  ('leave.view', 'leave', 'view', 'View Leave Requests', 'View leave requests and balances', 'medium', true, 300),
  ('leave.request', 'leave', 'create', 'Request Leave', 'Submit leave requests', 'low', false, 310),
  ('leave.approve', 'leave', 'approve', 'Approve Leave', 'Approve/reject leave requests', 'medium', true, 320),
  ('leave.edit_balances', 'leave', 'edit', 'Edit Leave Balances', 'Adjust leave allowances', 'high', true, 330),
  
  -- PAYROLL
  ('payroll.view', 'payroll', 'view', 'View Payroll', 'View payroll runs and data', 'critical', true, 400),
  ('payroll.view_payslips', 'payroll', 'view', 'View Payslips', 'View employee payslips', 'critical', true, 401),
  ('payroll.calculate', 'payroll', 'create', 'Calculate Payroll', 'Run payroll calculations', 'critical', false, 410),
  ('payroll.submit', 'payroll', 'approve', 'Submit Payroll', 'Submit payroll for payment', 'critical', false, 420),
  ('payroll.export', 'payroll', 'export', 'Export Payroll', 'Export payroll data', 'critical', false, 430),
  
  -- PERFORMANCE
  ('performance.view', 'performance', 'view', 'View Performance Reviews', 'View reviews and goals', 'high', true, 500),
  ('performance.view_private', 'performance', 'view', 'View Private Notes', 'View confidential HR notes', 'critical', true, 501),
  ('performance.create', 'performance', 'create', 'Create Reviews', 'Start performance reviews', 'high', true, 510),
  ('performance.edit', 'performance', 'edit', 'Edit Reviews', 'Modify review content', 'high', true, 520),
  
  -- TRAINING
  ('training.view', 'training', 'view', 'View Training Records', 'View training and certifications', 'low', true, 600),
  ('training.view_costs', 'training', 'view', 'View Training Costs', 'View training expenditure', 'medium', true, 601),
  ('training.create', 'training', 'create', 'Record Training', 'Add training completions', 'medium', true, 610),
  ('training.edit', 'training', 'edit', 'Edit Training', 'Modify training records', 'medium', true, 620),
  
  -- RECRUITMENT
  ('recruitment.view', 'recruitment', 'view', 'View Recruitment', 'View jobs and candidates', 'medium', false, 700),
  ('recruitment.view_salary', 'recruitment', 'view', 'View Salary Ranges', 'View job salary information', 'high', false, 701),
  ('recruitment.create', 'recruitment', 'create', 'Create Jobs', 'Post new job listings', 'medium', false, 710),
  ('recruitment.edit', 'recruitment', 'edit', 'Edit Jobs/Candidates', 'Modify recruitment data', 'medium', false, 720),
  ('recruitment.hire', 'recruitment', 'approve', 'Make Hiring Decisions', 'Approve/reject candidates', 'high', false, 730),
  
  -- ONBOARDING
  ('onboarding.view', 'onboarding', 'view', 'View Onboarding', 'View onboarding progress', 'medium', true, 800),
  ('onboarding.manage', 'onboarding', 'edit', 'Manage Onboarding', 'Create and edit onboarding tasks', 'medium', false, 810),
  
  -- SETTINGS
  ('settings.view', 'settings', 'view', 'View Settings', 'View company settings', 'low', false, 900),
  ('settings.edit', 'settings', 'edit', 'Edit Settings', 'Modify company settings', 'high', false, 910),
  ('settings.roles', 'settings', 'edit', 'Manage Roles', 'Create and edit roles', 'critical', false, 920),
  
  -- REPORTS
  ('reports.view', 'reports', 'view', 'View Reports', 'Access reporting dashboard', 'medium', true, 1000),
  ('reports.export', 'reports', 'export', 'Export Reports', 'Download report data', 'high', true, 1010)
ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- TABLE: role_permissions
  -- ============================================
  -- Maps permissions to roles with optional scope
  EXECUTE $sql_table3$
    CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Scope for this permission (if applicable)
  scope TEXT NOT NULL DEFAULT 'self', -- 'self', 'team', 'site', 'area', 'region', 'all'
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  
      UNIQUE(role_id, permission_id)
    );
  $sql_table3$;

  CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
  CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

  -- ============================================
  -- TABLE: user_roles
  -- ============================================
  -- Assigns roles to users (a user can have multiple roles)
  -- Handle existing table that might have different schema (from stockly migration)
  -- Check if old user_roles table exists (with user_id, company_id, role text)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
    )
  ) THEN
    -- Drop the old table if it exists (it has incompatible schema)
    -- Note: This will lose any existing data, but the old schema is incompatible
    DROP TABLE IF EXISTS user_roles CASCADE;
  END IF;
  
  -- Create the new table with correct schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    EXECUTE $sql_table4$
      CREATE TABLE user_roles (
  -- Check if old user_roles table exists (with user_id, company_id, role text)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_roles' AND column_name = 'user_id'
    )
  ) THEN
    -- Drop the old table if it exists (it has incompatible schema)
    -- Note: This will lose any existing data, but the old schema is incompatible
    DROP TABLE IF EXISTS user_roles CASCADE;
  END IF;
  
  -- Create the new table with correct schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    CREATE TABLE user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      
      -- Optional: limit role to specific scope
      site_id UUID, -- Role applies to this site only (FK added conditionally below)
      area_id UUID, -- Role applies to this area only (FK added conditionally below)
      region_id UUID, -- Role applies to this region only (FK added conditionally below)
      
      -- Metadata
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assigned_by UUID REFERENCES profiles(id),
        expires_at TIMESTAMPTZ -- Optional expiry
      );
    $sql_table4$;
  END IF;

  -- Ensure columns exist (in case table was created without them in a previous failed migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'site_id') THEN
      ALTER TABLE user_roles ADD COLUMN site_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'area_id') THEN
      ALTER TABLE user_roles ADD COLUMN area_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'region_id') THEN
      ALTER TABLE user_roles ADD COLUMN region_id UUID;
    END IF;
  END IF;

  -- Create unique index to prevent duplicate role assignments
  -- This handles NULL values properly by treating them as distinct
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_assignment 
    ON user_roles (profile_id, role_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(area_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid));

    CREATE INDEX IF NOT EXISTS idx_user_roles_profile ON user_roles(profile_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_site ON user_roles(site_id) WHERE site_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_user_roles_area ON user_roles(area_id) WHERE area_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_user_roles_region ON user_roles(region_id) WHERE region_id IS NOT NULL;
  END IF;

  -- Add foreign key constraints conditionally (only if referenced tables exist)
  -- Add site_id foreign key if sites table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_roles_site_id_fkey'
    ) THEN
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add area_id foreign key if areas or company_areas table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'areas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_roles_area_id_fkey'
    ) THEN
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_area_id_fkey 
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_areas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_roles_area_id_fkey'
    ) THEN
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_area_id_fkey 
      FOREIGN KEY (area_id) REFERENCES company_areas(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add region_id foreign key if regions or company_regions table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_roles_region_id_fkey'
    ) THEN
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_region_id_fkey 
      FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_regions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_roles_region_id_fkey'
    ) THEN
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_region_id_fkey 
      FOREIGN KEY (region_id) REFERENCES company_regions(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- ============================================
  -- FUNCTIONS: Seed Default Roles
  -- ============================================

  -- Function to seed default roles for a company
  -- SECURITY DEFINER allows this function to bypass RLS when inserting roles
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION seed_default_roles(p_company_id UUID)
    RETURNS void
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
  v_owner_id UUID;
  v_admin_id UUID;
  v_hr_manager_id UUID;
  v_payroll_manager_id UUID;
  v_regional_manager_id UUID;
  v_area_manager_id UUID;
  v_site_manager_id UUID;
  v_department_manager_id UUID;
  v_team_leader_id UUID;
  v_employee_id UUID;
BEGIN
  -- Owner
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Owner', 'owner', 'Full access to all features and data', 0, true, '#7C3AED', 'crown')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_owner_id;
  
  -- Admin
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Admin', 'admin', 'Full administrative access', 10, true, '#EC4899', 'shield')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_admin_id;
  
  -- HR Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'HR Manager', 'hr_manager', 'Manage all employee data and HR functions', 20, true, '#10B981', 'users')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_hr_manager_id;
  
  -- Payroll Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Payroll Manager', 'payroll_manager', 'Manage payroll and financial data', 20, true, '#F59E0B', 'banknote')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_payroll_manager_id;
  
  -- Regional Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Regional Manager', 'regional_manager', 'Manage all sites in assigned region', 30, true, '#3B82F6', 'map')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_regional_manager_id;
  
  -- Area Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Area Manager', 'area_manager', 'Manage all sites in assigned area', 40, true, '#6366F1', 'map-pin')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_area_manager_id;
  
  -- Site Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Site Manager', 'site_manager', 'Manage assigned site', 50, true, '#8B5CF6', 'building')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_site_manager_id;
  
  -- Department Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Department Manager', 'department_manager', 'Manage department and direct reports', 60, true, '#14B8A6', 'briefcase')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_department_manager_id;
  
  -- Team Leader
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Team Leader', 'team_leader', 'Lead a team and manage timesheets', 70, true, '#06B6D4', 'users-round')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_team_leader_id;
  
  -- Employee
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Employee', 'employee', 'Standard employee access', 100, true, '#6B7280', 'user')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_employee_id;
  
  -- Seed permissions for each role
  PERFORM seed_role_permissions(v_owner_id, 'owner');
  PERFORM seed_role_permissions(v_admin_id, 'admin');
  PERFORM seed_role_permissions(v_hr_manager_id, 'hr_manager');
  PERFORM seed_role_permissions(v_payroll_manager_id, 'payroll_manager');
  PERFORM seed_role_permissions(v_regional_manager_id, 'regional_manager');
  PERFORM seed_role_permissions(v_area_manager_id, 'area_manager');
  PERFORM seed_role_permissions(v_site_manager_id, 'site_manager');
  PERFORM seed_role_permissions(v_department_manager_id, 'department_manager');
  PERFORM seed_role_permissions(v_team_leader_id, 'team_leader');
    PERFORM seed_role_permissions(v_employee_id, 'employee');
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- Function to seed default permissions for a role
  EXECUTE $sql_func3$
    CREATE OR REPLACE FUNCTION seed_role_permissions(p_role_id UUID, p_role_slug TEXT)
    RETURNS void AS $func$
    BEGIN
  CASE p_role_slug
    WHEN 'owner' THEN
      -- Owner gets ALL permissions with ALL scope
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT p_role_id, id, 'all' FROM permissions
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'admin' THEN
      -- Admin gets ALL permissions with ALL scope
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT p_role_id, id, 'all' FROM permissions
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'hr_manager' THEN
      -- HR Manager permissions
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'all'),
        (p_role_id, 'employees.view_contact', 'all'),
        (p_role_id, 'employees.view_financial', 'all'),
        (p_role_id, 'employees.view_compliance', 'all'),
        (p_role_id, 'employees.create', 'all'),
        (p_role_id, 'employees.edit', 'all'),
        (p_role_id, 'employees.delete', 'all'),
        (p_role_id, 'leave.view', 'all'),
        (p_role_id, 'leave.approve', 'all'),
        (p_role_id, 'leave.edit_balances', 'all'),
        (p_role_id, 'performance.view', 'all'),
        (p_role_id, 'performance.view_private', 'all'),
        (p_role_id, 'performance.create', 'all'),
        (p_role_id, 'performance.edit', 'all'),
        (p_role_id, 'training.view', 'all'),
        (p_role_id, 'training.create', 'all'),
        (p_role_id, 'training.edit', 'all'),
        (p_role_id, 'recruitment.view', 'all'),
        (p_role_id, 'recruitment.view_salary', 'all'),
        (p_role_id, 'recruitment.create', 'all'),
        (p_role_id, 'recruitment.edit', 'all'),
        (p_role_id, 'recruitment.hire', 'all'),
        (p_role_id, 'onboarding.view', 'all'),
        (p_role_id, 'onboarding.manage', 'all'),
        (p_role_id, 'settings.view', 'all'),
        (p_role_id, 'reports.view', 'all')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'payroll_manager' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'all'),
        (p_role_id, 'employees.view_financial', 'all'),
        (p_role_id, 'employees.edit_financial', 'all'),
        (p_role_id, 'attendance.view', 'all'),
        (p_role_id, 'attendance.edit', 'all'),
        (p_role_id, 'attendance.approve', 'all'),
        (p_role_id, 'attendance.submit_payroll', 'all'),
        (p_role_id, 'payroll.view', 'all'),
        (p_role_id, 'payroll.view_payslips', 'all'),
        (p_role_id, 'payroll.calculate', 'all'),
        (p_role_id, 'payroll.submit', 'all'),
        (p_role_id, 'payroll.export', 'all'),
        (p_role_id, 'reports.view', 'all'),
        (p_role_id, 'reports.export', 'all')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'regional_manager' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'region'),
        (p_role_id, 'employees.view_contact', 'region'),
        (p_role_id, 'schedule.view', 'region'),
        (p_role_id, 'schedule.view_costs', 'region'),
        (p_role_id, 'schedule.create', 'region'),
        (p_role_id, 'schedule.edit', 'region'),
        (p_role_id, 'schedule.approve', 'region'),
        (p_role_id, 'schedule.publish', 'region'),
        (p_role_id, 'attendance.view', 'region'),
        (p_role_id, 'attendance.approve', 'region'),
        (p_role_id, 'leave.view', 'region'),
        (p_role_id, 'leave.approve', 'region'),
        (p_role_id, 'performance.view', 'region'),
        (p_role_id, 'training.view', 'region'),
        (p_role_id, 'reports.view', 'region')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'area_manager' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'area'),
        (p_role_id, 'employees.view_contact', 'area'),
        (p_role_id, 'schedule.view', 'area'),
        (p_role_id, 'schedule.view_costs', 'area'),
        (p_role_id, 'schedule.create', 'area'),
        (p_role_id, 'schedule.edit', 'area'),
        (p_role_id, 'schedule.approve', 'area'),
        (p_role_id, 'schedule.publish', 'area'),
        (p_role_id, 'attendance.view', 'area'),
        (p_role_id, 'attendance.approve', 'area'),
        (p_role_id, 'leave.view', 'area'),
        (p_role_id, 'leave.approve', 'area'),
        (p_role_id, 'performance.view', 'area'),
        (p_role_id, 'training.view', 'area'),
        (p_role_id, 'reports.view', 'area')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'site_manager' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'site'),
        (p_role_id, 'employees.view_contact', 'site'),
        (p_role_id, 'schedule.view', 'site'),
        (p_role_id, 'schedule.view_costs', 'site'),
        (p_role_id, 'schedule.create', 'site'),
        (p_role_id, 'schedule.edit', 'site'),
        (p_role_id, 'schedule.approve', 'site'),
        (p_role_id, 'schedule.publish', 'site'),
        (p_role_id, 'attendance.view', 'site'),
        (p_role_id, 'attendance.edit', 'site'),
        (p_role_id, 'attendance.approve', 'site'),
        (p_role_id, 'leave.view', 'site'),
        (p_role_id, 'leave.approve', 'site'),
        (p_role_id, 'performance.view', 'site'),
        (p_role_id, 'training.view', 'site'),
        (p_role_id, 'onboarding.view', 'site')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'department_manager' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'team'),
        (p_role_id, 'employees.view_contact', 'team'),
        (p_role_id, 'schedule.view', 'team'),
        (p_role_id, 'schedule.create', 'team'),
        (p_role_id, 'schedule.edit', 'team'),
        (p_role_id, 'attendance.view', 'team'),
        (p_role_id, 'attendance.approve', 'team'),
        (p_role_id, 'leave.view', 'team'),
        (p_role_id, 'leave.approve', 'team'),
        (p_role_id, 'performance.view', 'team'),
        (p_role_id, 'performance.create', 'team'),
        (p_role_id, 'training.view', 'team')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'team_leader' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'team'),
        (p_role_id, 'schedule.view', 'team'),
        (p_role_id, 'attendance.view', 'team'),
        (p_role_id, 'attendance.approve', 'team'),
        (p_role_id, 'leave.view', 'team'),
        (p_role_id, 'training.view', 'team')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
      
    WHEN 'employee' THEN
      INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
        (p_role_id, 'employees.view', 'self'),
        (p_role_id, 'employees.view_contact', 'self'),
        (p_role_id, 'employees.edit', 'self'), -- Limited fields only
        (p_role_id, 'schedule.view', 'self'),
        (p_role_id, 'attendance.view', 'self'),
        (p_role_id, 'leave.view', 'self'),
        (p_role_id, 'leave.request', 'self'),
        (p_role_id, 'payroll.view_payslips', 'self'),
        (p_role_id, 'performance.view', 'self'),
        (p_role_id, 'training.view', 'self'),
        (p_role_id, 'onboarding.view', 'self'),
        (p_role_id, 'settings.view', 'self')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;
    END CASE;
  END;
  $func$ LANGUAGE plpgsql;
  $sql_func3$;

  -- ============================================
  -- ROW LEVEL SECURITY
  -- ============================================

  -- Roles: Company members can view, admins can edit
  ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their company roles" ON roles;
  CREATE POLICY "Users can view their company roles"
    ON roles FOR SELECT
    USING (
      company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

  DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
  CREATE POLICY "Admins can manage roles"
    ON roles FOR ALL
    USING (
      company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.profile_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      )
    );

  -- Permissions: Anyone can read (reference table)
  ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view permissions" ON permissions;
  CREATE POLICY "Anyone can view permissions"
    ON permissions FOR SELECT
    USING (true);

  -- Role Permissions: Follow role access
  ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their company role permissions" ON role_permissions;
  CREATE POLICY "Users can view their company role permissions"
    ON role_permissions FOR SELECT
    USING (
      role_id IN (
        SELECT id FROM roles 
        WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    );

  DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
  CREATE POLICY "Admins can manage role permissions"
    ON role_permissions FOR ALL
    USING (
      role_id IN (
        SELECT id FROM roles 
        WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.profile_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      )
    );

  -- User Roles: Company members can view, admins can assign
  ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their company user roles" ON user_roles;
  CREATE POLICY "Users can view their company user roles"
    ON user_roles FOR SELECT
    USING (
      profile_id IN (
        SELECT id FROM profiles 
        WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    );

  DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
  CREATE POLICY "Users can view own roles"
    ON user_roles FOR SELECT
    USING (profile_id = auth.uid());

  DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
  CREATE POLICY "Admins can manage user roles"
    ON user_roles FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.profile_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      )
    );

END $$;

