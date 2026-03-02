-- Fix infinite recursion in user_roles RLS policy
-- The policy was querying user_roles to check admin status, causing recursion

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'roles'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    RAISE NOTICE 'roles or user_roles tables do not exist - skipping user_roles_rls_recursion fix';
    RETURN;
  END IF;

  -- Update seed_default_roles function to use SECURITY DEFINER
  EXECUTE $sql_func1$
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
  VALUES (p_company_id, 'Owner', 'owner', 'Full system access and ownership', 0, true, '#EF4444', 'crown')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_owner_id;
  
  -- Admin
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Admin', 'admin', 'Administrative access to all features', 10, true, '#F59E0B', 'shield')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_admin_id;
  
  -- HR Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'HR Manager', 'hr_manager', 'Manage employees, recruitment, and HR processes', 20, true, '#8B5CF6', 'users')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_hr_manager_id;
  
  -- Payroll Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Payroll Manager', 'payroll_manager', 'Manage payroll and financial data', 25, true, '#10B981', 'banknote')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_payroll_manager_id;
  
  -- Regional Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Regional Manager', 'regional_manager', 'Manage multiple regions and areas', 30, true, '#3B82F6', 'map')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_regional_manager_id;
  
  -- Area Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Area Manager', 'area_manager', 'Manage area and multiple sites', 40, true, '#06B6D4', 'map-pin')
  ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon
  RETURNING id INTO v_area_manager_id;
  
  -- Site Manager
  INSERT INTO roles (company_id, name, slug, description, hierarchy_level, is_system_role, color, icon)
  VALUES (p_company_id, 'Site Manager', 'site_manager', 'Manage single site operations', 50, true, '#6366F1', 'building')
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
  
  -- Seed permissions for each role (using the existing seed_role_permissions function)
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
  $sql_func1$;

  -- Fix the RLS policy on user_roles to avoid circular dependency
  -- Instead of querying user_roles in the policy, we'll use a helper function
  DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;

  -- Create a helper function to check admin status without circular dependency
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION is_user_admin(p_profile_id UUID)
    RETURNS BOOLEAN
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.profile_id = p_profile_id
        AND r.slug IN ('owner', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      );
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- Now create the policy using the helper function
  CREATE POLICY "Admins can manage user roles"
    ON user_roles FOR ALL
    USING (
      is_user_admin(auth.uid())
    )
    WITH CHECK (
      is_user_admin(auth.uid())
    );

END $$;

