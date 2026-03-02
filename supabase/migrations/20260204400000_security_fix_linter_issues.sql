-- ============================================================================
-- Migration: Security Fix - Supabase Linter Issues
-- Description: Fixes all security issues flagged by Supabase database linter
--              1. Enable RLS on tables with policies but RLS disabled
--              2. Change SECURITY DEFINER views to SECURITY INVOKER
--              3. Enable RLS on public tables without RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1: Enable RLS on ppm_service_events (has policies but RLS disabled)
-- ============================================================================

ALTER TABLE public.ppm_service_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX 2: Change SECURITY DEFINER views to SECURITY INVOKER
-- Views should use the querying user's permissions, not the view creator's
-- ============================================================================

-- Attendance & Time Tracking Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
    ALTER VIEW public.attendance_logs SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'weekly_attendance_review') THEN
    ALTER VIEW public.weekly_attendance_review SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'todays_attendance') THEN
    ALTER VIEW public.todays_attendance SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'time_entries_view') THEN
    ALTER VIEW public.time_entries_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'timesheets_view') THEN
    ALTER VIEW public.timesheets_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'active_shifts') THEN
    ALTER VIEW public.active_shifts SET (security_invoker = true);
  END IF;
END $$;

-- Leave Management Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'leave_calendar_view') THEN
    ALTER VIEW public.leave_calendar_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'leave_balances_enhanced_view') THEN
    ALTER VIEW public.leave_balances_enhanced_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'leave_balances_view') THEN
    ALTER VIEW public.leave_balances_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'leave_requests_view') THEN
    ALTER VIEW public.leave_requests_view SET (security_invoker = true);
  END IF;
END $$;

-- Recipe & Stock Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    ALTER VIEW public.recipes SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'recipe_ingredients') THEN
    ALTER VIEW public.recipe_ingredients SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'recipe_modifiers') THEN
    ALTER VIEW public.recipe_modifiers SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'recipe_data_health') THEN
    ALTER VIEW public.recipe_data_health SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    ALTER VIEW public.stock_counts SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    ALTER VIEW public.stock_movements SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
    ALTER VIEW public.stock_count_items SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_on_hand_by_site') THEN
    ALTER VIEW public.stock_on_hand_by_site SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'ingredient_price_history') THEN
    ALTER VIEW public.ingredient_price_history SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'saleable_items') THEN
    ALTER VIEW public.saleable_items SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'gp_by_site') THEN
    ALTER VIEW public.gp_by_site SET (security_invoker = true);
  END IF;
END $$;

-- Order Book Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'order_book_product_rating_summary') THEN
    ALTER VIEW public.order_book_product_rating_summary SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'order_book_product_waste_summary') THEN
    ALTER VIEW public.order_book_product_waste_summary SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'order_book_monthly_product_breakdown') THEN
    ALTER VIEW public.order_book_monthly_product_breakdown SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'order_book_daily_waste_summary') THEN
    ALTER VIEW public.order_book_daily_waste_summary SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'order_book_monthly_spend_summary') THEN
    ALTER VIEW public.order_book_monthly_spend_summary SET (security_invoker = true);
  END IF;
END $$;

-- PPM (Planned Preventative Maintenance) Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'ppm_full_schedule') THEN
    ALTER VIEW public.ppm_full_schedule SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'ppm_schedule') THEN
    ALTER VIEW public.ppm_schedule SET (security_invoker = true);
  END IF;
END $$;

-- Compliance & Training Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'training_stats_view') THEN
    ALTER VIEW public.training_stats_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'site_compliance_score_latest') THEN
    ALTER VIEW public.site_compliance_score_latest SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'compliance_matrix_view') THEN
    ALTER VIEW public.compliance_matrix_view SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'tenant_compliance_overview') THEN
    ALTER VIEW public.tenant_compliance_overview SET (security_invoker = true);
  END IF;
END $$;

-- Checklist Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'deduplicated_checklist_tasks') THEN
    ALTER VIEW public.deduplicated_checklist_tasks SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'site_checklists_active') THEN
    ALTER VIEW public.site_checklists_active SET (security_invoker = true);
  END IF;
END $$;

-- User & Profile Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_current_profile') THEN
    ALTER VIEW public.v_current_profile SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_user_sites') THEN
    ALTER VIEW public.v_user_sites SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_team_performance_summary') THEN
    ALTER VIEW public.v_team_performance_summary SET (security_invoker = true);
  END IF;
END $$;

-- Review Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_upcoming_reviews') THEN
    ALTER VIEW public.v_upcoming_reviews SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_overdue_reviews') THEN
    ALTER VIEW public.v_overdue_reviews SET (security_invoker = true);
  END IF;
END $$;

-- Admin Views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_company_eho_scores') THEN
    ALTER VIEW public.admin_company_eho_scores SET (security_invoker = true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'admin_platform_stats') THEN
    ALTER VIEW public.admin_platform_stats SET (security_invoker = true);
  END IF;
END $$;

-- ============================================================================
-- FIX 3: Enable RLS on public tables without RLS
-- ============================================================================

-- PPM & Equipment Tables
ALTER TABLE public.ppm_service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_equipment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;

-- Order Book Tables
ALTER TABLE public.order_book_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_product_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book_credit_requests ENABLE ROW LEVEL SECURITY;

-- Credit Notes
ALTER TABLE public.credit_note_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;

-- Training & Courses
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;

-- Calendar
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

-- Archive/Backup Tables (enable RLS but may need special policies)
ALTER TABLE public.conversations_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_checklists_archive ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX 4: Create basic RLS policies for tables that now have RLS enabled
-- Using company_id pattern consistent with existing policies
-- ============================================================================

-- PPM Service Events
DO $$ BEGIN
  DROP POLICY IF EXISTS ppm_service_events_company ON public.ppm_service_events;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ppm_service_events' AND column_name = 'company_id') THEN
    CREATE POLICY ppm_service_events_company ON public.ppm_service_events FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = ppm_service_events.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ppm_service_events' AND column_name = 'site_id') THEN
    CREATE POLICY ppm_service_events_site ON public.ppm_service_events FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = ppm_service_events.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Site Equipment Positions
DO $$ BEGIN
  DROP POLICY IF EXISTS site_equipment_positions_company ON public.site_equipment_positions;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_equipment_positions' AND column_name = 'site_id') THEN
    CREATE POLICY site_equipment_positions_site ON public.site_equipment_positions FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = site_equipment_positions.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Service Reports
DO $$ BEGIN
  DROP POLICY IF EXISTS service_reports_company ON public.service_reports;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_reports' AND column_name = 'company_id') THEN
    CREATE POLICY service_reports_company ON public.service_reports FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = service_reports.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_reports' AND column_name = 'site_id') THEN
    CREATE POLICY service_reports_site ON public.service_reports FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = service_reports.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Order Book Message Threads
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_message_threads_company ON public.order_book_message_threads;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_message_threads' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_message_threads_company ON public.order_book_message_threads FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_message_threads.company_id)
    );
  END IF;
END $$;

-- Order Book Messages
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_messages_company ON public.order_book_messages;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_messages' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_messages_company ON public.order_book_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_messages.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_messages' AND column_name = 'thread_id') THEN
    CREATE POLICY order_book_messages_thread ON public.order_book_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM public.order_book_message_threads t
              JOIN public.profiles p ON p.company_id = t.company_id
              WHERE t.id = order_book_messages.thread_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Order Book Issues
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_issues_company ON public.order_book_issues;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_issues' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_issues_company ON public.order_book_issues FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_issues.company_id)
    );
  END IF;
END $$;

-- Order Book Issue Comments
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_issue_comments_company ON public.order_book_issue_comments;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_issue_comments' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_issue_comments_company ON public.order_book_issue_comments FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_issue_comments.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_issue_comments' AND column_name = 'issue_id') THEN
    CREATE POLICY order_book_issue_comments_issue ON public.order_book_issue_comments FOR ALL USING (
      EXISTS (SELECT 1 FROM public.order_book_issues i
              JOIN public.profiles p ON p.company_id = i.company_id
              WHERE i.id = order_book_issue_comments.issue_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Order Book Product Ratings
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_product_ratings_company ON public.order_book_product_ratings;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_product_ratings' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_product_ratings_company ON public.order_book_product_ratings FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_product_ratings.company_id)
    );
  END IF;
END $$;

-- Order Book Credit Requests
DO $$ BEGIN
  DROP POLICY IF EXISTS order_book_credit_requests_company ON public.order_book_credit_requests;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_book_credit_requests' AND column_name = 'company_id') THEN
    CREATE POLICY order_book_credit_requests_company ON public.order_book_credit_requests FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = order_book_credit_requests.company_id)
    );
  END IF;
END $$;

-- Credit Note Requests
DO $$ BEGIN
  DROP POLICY IF EXISTS credit_note_requests_company ON public.credit_note_requests;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_note_requests' AND column_name = 'company_id') THEN
    CREATE POLICY credit_note_requests_company ON public.credit_note_requests FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = credit_note_requests.company_id)
    );
  END IF;
END $$;

-- Credit Note Lines
DO $$ BEGIN
  DROP POLICY IF EXISTS credit_note_lines_company ON public.credit_note_lines;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_note_lines' AND column_name = 'company_id') THEN
    CREATE POLICY credit_note_lines_company ON public.credit_note_lines FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = credit_note_lines.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_note_lines' AND column_name = 'credit_note_request_id') THEN
    CREATE POLICY credit_note_lines_request ON public.credit_note_lines FOR ALL USING (
      EXISTS (SELECT 1 FROM public.credit_note_requests r
              JOIN public.profiles p ON p.company_id = r.company_id
              WHERE r.id = credit_note_lines.credit_note_request_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- Course Assignments
DO $$ BEGIN
  DROP POLICY IF EXISTS course_assignments_company ON public.course_assignments;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_assignments' AND column_name = 'company_id') THEN
    CREATE POLICY course_assignments_company ON public.course_assignments FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = course_assignments.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_assignments' AND column_name = 'user_id') THEN
    CREATE POLICY course_assignments_user ON public.course_assignments FOR ALL USING (
      course_assignments.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p1, public.profiles p2
              WHERE p1.id = auth.uid() AND p2.id = course_assignments.user_id
              AND p1.company_id = p2.company_id)
    );
  END IF;
END $$;

-- Calendar Reminders
DO $$ BEGIN
  DROP POLICY IF EXISTS calendar_reminders_company ON public.calendar_reminders;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_reminders' AND column_name = 'company_id') THEN
    CREATE POLICY calendar_reminders_company ON public.calendar_reminders FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = calendar_reminders.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_reminders' AND column_name = 'user_id') THEN
    CREATE POLICY calendar_reminders_user ON public.calendar_reminders FOR ALL USING (
      calendar_reminders.user_id = auth.uid()
    );
  END IF;
END $$;

-- Archive/Backup tables - restrict to admins only via company_id
DO $$ BEGIN
  DROP POLICY IF EXISTS conversations_backup_company ON public.conversations_backup;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations_backup' AND column_name = 'company_id') THEN
    CREATE POLICY conversations_backup_company ON public.conversations_backup FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = conversations_backup.company_id)
    );
  ELSE
    -- Default deny policy if no company_id
    CREATE POLICY conversations_backup_deny ON public.conversations_backup FOR ALL USING (false);
  END IF;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS messages_backup_company ON public.messages_backup;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages_backup' AND column_name = 'company_id') THEN
    CREATE POLICY messages_backup_company ON public.messages_backup FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = messages_backup.company_id)
    );
  ELSE
    CREATE POLICY messages_backup_deny ON public.messages_backup FOR ALL USING (false);
  END IF;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS task_templates_archive_company ON public.task_templates_archive;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_templates_archive' AND column_name = 'company_id') THEN
    CREATE POLICY task_templates_archive_company ON public.task_templates_archive FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = task_templates_archive.company_id)
    );
  ELSE
    CREATE POLICY task_templates_archive_deny ON public.task_templates_archive FOR ALL USING (false);
  END IF;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS site_checklists_archive_company ON public.site_checklists_archive;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_checklists_archive' AND column_name = 'company_id') THEN
    CREATE POLICY site_checklists_archive_company ON public.site_checklists_archive FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = site_checklists_archive.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_checklists_archive' AND column_name = 'site_id') THEN
    CREATE POLICY site_checklists_archive_site ON public.site_checklists_archive FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = site_checklists_archive.site_id AND p.id = auth.uid())
    );
  ELSE
    CREATE POLICY site_checklists_archive_deny ON public.site_checklists_archive FOR ALL USING (false);
  END IF;
END $$;

COMMIT;
