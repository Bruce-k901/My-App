-- ============================================================================
-- ENHANCED ADMIN PLATFORM STATS VIEW
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, create the is_platform_admin() function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
      AND is_platform_admin = true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Drop old view first
DROP VIEW IF EXISTS admin_platform_stats;

-- Create enhanced view with all metrics
CREATE OR REPLACE VIEW admin_platform_stats AS
SELECT
  -- Companies
  (SELECT COUNT(*) FROM companies) AS total_companies,
  (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '7 days') AS new_companies_this_week,
  (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '30 days') AS new_companies_this_month,
  
  -- Users
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM profiles WHERE last_login >= NOW() - INTERVAL '24 hours') AS active_users_today,
  (SELECT COUNT(*) FROM profiles WHERE last_login >= NOW() - INTERVAL '7 days') AS active_users_this_week,
  (SELECT COUNT(*) FROM profiles WHERE is_platform_admin = true) AS platform_admins,
  
  -- Sites
  (SELECT COUNT(*) FROM sites) AS total_sites,
  
  -- Tasks
  (SELECT COUNT(*) FROM checklist_tasks) AS total_tasks,
  (SELECT COUNT(*) FROM checklist_tasks WHERE status = 'pending') AS pending_tasks,
  (SELECT COUNT(*) FROM checklist_tasks WHERE status = 'completed') AS completed_tasks,
  (SELECT COUNT(*) FROM checklist_tasks WHERE status = 'missed') AS missed_tasks,
  (SELECT COUNT(*) FROM checklist_tasks WHERE created_at >= NOW() - INTERVAL '24 hours') AS tasks_created_today,
  (SELECT COUNT(*) FROM checklist_tasks WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '24 hours') AS tasks_completed_today,
  
  -- Task Completion Records
  (SELECT COUNT(*) FROM task_completion_records) AS total_completion_records,
  (SELECT COUNT(*) FROM task_completion_records WHERE completed_at >= NOW() - INTERVAL '24 hours') AS completions_today,
  (SELECT COUNT(*) FROM task_completion_records WHERE completed_at >= NOW() - INTERVAL '7 days') AS completions_this_week,
  
  -- Templates
  (SELECT COUNT(*) FROM task_templates WHERE is_active = true) AS active_templates,
  (SELECT COUNT(*) FROM task_templates WHERE is_template_library = true) AS library_templates,
  (SELECT COUNT(*) FROM task_templates WHERE company_id IS NOT NULL AND is_active = true) AS custom_templates,
  
  -- SOPs
  (SELECT COUNT(*) FROM sop_entries) AS total_sops,
  (SELECT COUNT(*) FROM sop_entries WHERE created_at >= NOW() - INTERVAL '30 days') AS sops_created_this_month,
  
  -- Risk Assessments
  (SELECT COUNT(*) FROM risk_assessments) AS total_risk_assessments,
  (SELECT COUNT(*) FROM risk_assessments WHERE status = 'Active') AS active_risk_assessments,
  (SELECT COUNT(*) FROM risk_assessments WHERE next_review_date <= NOW()) AS overdue_risk_assessments,
  
  -- Assets
  (SELECT COUNT(*) FROM assets) AS total_assets,
  (SELECT COUNT(*) FROM assets WHERE status = 'active') AS active_assets,
  (SELECT COUNT(*) FROM assets WHERE next_service_date <= NOW()) AS overdue_service_assets,
  
  -- Messaging
  (SELECT COUNT(*) FROM messaging_messages) AS total_messages,
  (SELECT COUNT(*) FROM messaging_messages WHERE created_at >= NOW() - INTERVAL '24 hours') AS messages_today,
  (SELECT COUNT(*) FROM messaging_messages WHERE created_at >= NOW() - INTERVAL '7 days') AS messages_this_week,
  (SELECT COUNT(*) FROM messaging_channels) AS total_channels,
  
  -- Callouts
  (SELECT COUNT(*) FROM callouts) AS total_callouts,
  (SELECT COUNT(*) FROM callouts WHERE status = 'open') AS open_callouts,
  (SELECT COUNT(*) FROM callouts WHERE created_at >= NOW() - INTERVAL '7 days') AS callouts_this_week;

-- Grant access to the view
GRANT SELECT ON admin_platform_stats TO authenticated;

-- ============================================================================
-- EHO READINESS SCORES BY COMPANY
-- ============================================================================

-- Drop the view first (it depends on the function)
DROP VIEW IF EXISTS admin_company_eho_scores;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_company_eho_readiness(UUID);

-- Create a function to calculate EHO readiness per company
CREATE OR REPLACE FUNCTION get_company_eho_readiness(p_company_id UUID)
RETURNS TABLE (
  company_id UUID,
  overall_score INTEGER,
  task_completion_score INTEGER,
  sop_coverage_score INTEGER,
  ra_coverage_score INTEGER,
  asset_compliance_score INTEGER,
  training_score INTEGER,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_completion INTEGER := 0;
  v_sop_score INTEGER := 0;
  v_ra_score INTEGER := 0;
  v_asset_score INTEGER := 0;
  v_training_score INTEGER := 0;
  v_overall INTEGER := 0;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_sop_count INTEGER;
  v_ra_count INTEGER;
  v_overdue_ra INTEGER;
  v_asset_count INTEGER;
  v_overdue_assets INTEGER;
  v_details JSONB;
BEGIN
  -- Task Completion Rate (last 30 days)
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('completed', 'pending', 'missed')),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_tasks, v_completed_tasks
  FROM checklist_tasks 
  WHERE checklist_tasks.company_id = p_company_id 
    AND due_date >= NOW() - INTERVAL '30 days';
  
  IF v_total_tasks > 0 THEN
    v_task_completion := ROUND((v_completed_tasks::NUMERIC / v_total_tasks) * 100);
  ELSE
    v_task_completion := 100; -- No tasks = compliant by default
  END IF;
  
  -- SOP Coverage (having SOPs is good)
  SELECT COUNT(*) INTO v_sop_count FROM sop_entries WHERE sop_entries.company_id = p_company_id;
  v_sop_score := LEAST(100, v_sop_count * 10); -- 10 points per SOP, max 100
  
  -- Risk Assessment Coverage
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE next_review_date <= NOW())
  INTO v_ra_count, v_overdue_ra
  FROM risk_assessments WHERE risk_assessments.company_id = p_company_id;
  
  IF v_ra_count > 0 THEN
    v_ra_score := ROUND(((v_ra_count - v_overdue_ra)::NUMERIC / v_ra_count) * 100);
  ELSE
    v_ra_score := 50; -- No RAs = needs improvement
  END IF;
  
  -- Asset Compliance (service dates)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE next_service_date <= NOW())
  INTO v_asset_count, v_overdue_assets
  FROM assets WHERE assets.company_id = p_company_id AND status = 'active';
  
  IF v_asset_count > 0 THEN
    v_asset_score := ROUND(((v_asset_count - v_overdue_assets)::NUMERIC / v_asset_count) * 100);
  ELSE
    v_asset_score := 100; -- No assets = compliant
  END IF;
  
  -- Training Score (placeholder - based on profile certificate expiries)
  -- This would need the actual certificate expiry columns
  v_training_score := 75; -- Default placeholder
  
  -- Calculate overall (weighted average)
  v_overall := ROUND(
    (v_task_completion * 0.35) + -- Tasks are most important
    (v_sop_score * 0.15) +
    (v_ra_score * 0.20) +
    (v_asset_score * 0.20) +
    (v_training_score * 0.10)
  );
  
  -- Build details JSON
  v_details := jsonb_build_object(
    'tasks', jsonb_build_object('total', v_total_tasks, 'completed', v_completed_tasks),
    'sops', jsonb_build_object('count', v_sop_count),
    'risk_assessments', jsonb_build_object('total', v_ra_count, 'overdue', v_overdue_ra),
    'assets', jsonb_build_object('total', v_asset_count, 'overdue_service', v_overdue_assets)
  );
  
  RETURN QUERY SELECT 
    p_company_id,
    v_overall,
    v_task_completion,
    v_sop_score,
    v_ra_score,
    v_asset_score,
    v_training_score,
    v_details;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_company_eho_readiness(UUID) TO authenticated;

-- ============================================================================
-- ADMIN VIEW: ALL COMPANIES WITH EHO SCORES
-- ============================================================================

-- View was already dropped above, now create it
CREATE OR REPLACE VIEW admin_company_eho_scores AS
SELECT 
  c.id,
  c.name,
  c.created_at,
  (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) AS user_count,
  (SELECT COUNT(*) FROM sites s WHERE s.company_id = c.id) AS site_count,
  (SELECT COUNT(*) FROM checklist_tasks t WHERE t.company_id = c.id) AS task_count,
  (SELECT COUNT(*) FROM sop_entries sop WHERE sop.company_id = c.id) AS sop_count,
  (SELECT COUNT(*) FROM risk_assessments ra WHERE ra.company_id = c.id) AS ra_count,
  (SELECT COUNT(*) FROM assets a WHERE a.company_id = c.id) AS asset_count,
  eho.overall_score AS eho_score,
  eho.task_completion_score,
  eho.sop_coverage_score,
  eho.ra_coverage_score,
  eho.asset_compliance_score,
  eho.details AS eho_details
FROM companies c
LEFT JOIN LATERAL get_company_eho_readiness(c.id) eho ON true
ORDER BY COALESCE(eho.overall_score, 0) ASC, c.created_at DESC;

GRANT SELECT ON admin_company_eho_scores TO authenticated;

-- ============================================================================
-- ADD RLS POLICIES FOR PLATFORM ADMINS (if tables have RLS enabled)
-- ============================================================================

-- Note: These policies only apply if RLS is enabled on the tables
-- If RLS is not enabled, platform admins can already see all data

-- SOPs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sop_entries') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sop_entries' AND policyname = 'Platform admins can view all sops') THEN
      CREATE POLICY "Platform admins can view all sops"
        ON public.sop_entries FOR SELECT
        USING (public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- Risk Assessments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_assessments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'risk_assessments' AND policyname = 'Platform admins can view all risk_assessments') THEN
      CREATE POLICY "Platform admins can view all risk_assessments"
        ON public.risk_assessments FOR SELECT
        USING (public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- Assets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assets' AND policyname = 'Platform admins can view all assets') THEN
      CREATE POLICY "Platform admins can view all assets"
        ON public.assets FOR SELECT
        USING (public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- Messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messaging_messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messaging_messages' AND policyname = 'Platform admins can view all messages') THEN
      CREATE POLICY "Platform admins can view all messages"
        ON public.messaging_messages FOR SELECT
        USING (public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- Callouts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'callouts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'callouts' AND policyname = 'Platform admins can view all callouts') THEN
      CREATE POLICY "Platform admins can view all callouts"
        ON public.callouts FOR SELECT
        USING (public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
SELECT 'Setup complete! Run this query to check your stats:' AS message;
SELECT * FROM admin_platform_stats LIMIT 1;

