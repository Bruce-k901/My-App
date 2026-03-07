-- =====================================================
-- PERFORMANCE REVIEWS VIEW
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only create views if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE OR REPLACE VIEW performance_reviews_view AS
    SELECT 
      pr.id as review_id,
      pr.company_id,
      pr.cycle_id,
      pr.profile_id,
      pr.reviewer_id,
      pr.status,
      pr.due_date,
      pr.overall_rating,
      pr.overall_rating_label,
      pr.self_assessment_completed_at,
      pr.manager_review_completed_at,
      pr.completed_at,
      pr.acknowledged_at,
      pr.promotion_recommended,
      pr.salary_increase_recommended,
      pr.pip_recommended,
      p.full_name as employee_name,
      p.email as employee_email,
      p.avatar_url as employee_avatar,
      p.position_title,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site')
        THEN p.home_site
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id')
        THEN p.site_id
        ELSE NULL
      END as home_site,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
        THEN (SELECT name FROM sites WHERE id = CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site')
          THEN p.home_site
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id')
          THEN p.site_id
          ELSE NULL
        END)
        ELSE NULL
      END as site_name,
      r.full_name as reviewer_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_cycles')
        THEN (SELECT name FROM review_cycles WHERE id = pr.cycle_id)
        ELSE NULL
      END as cycle_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates')
        THEN (SELECT name FROM review_templates WHERE id = pr.template_id)
        ELSE NULL
      END as template_name,
      CASE 
        WHEN pr.status = 'not_started' THEN 0
        WHEN pr.status = 'self_assessment' THEN 25
        WHEN pr.status = 'manager_review' THEN 50
        WHEN pr.status = 'discussion' THEN 75
        WHEN pr.status IN ('completed', 'acknowledged') THEN 100
        ELSE 0
      END as progress_percentage
    FROM performance_reviews pr
    JOIN profiles p ON p.id = pr.profile_id
    JOIN profiles r ON r.id = pr.reviewer_id;

    GRANT SELECT ON performance_reviews_view TO authenticated;

    -- =====================================================
    -- GOALS VIEW
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
      CREATE OR REPLACE VIEW goals_view AS
      SELECT 
        g.id as goal_id,
        g.company_id,
        g.profile_id,
        g.review_id,
        g.title,
        g.description,
        g.goal_type,
        g.measurable_target,
        g.start_date,
        g.target_date,
        g.completed_date,
        g.progress_percentage,
        g.status,
        g.priority,
        g.weight_percentage,
        p.full_name as employee_name,
        p.avatar_url as employee_avatar,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reports_to')
          THEN (SELECT full_name FROM profiles WHERE id = p.reports_to)
          ELSE NULL
        END as manager_name,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_updates')
          THEN (SELECT COUNT(*) FROM goal_updates gu WHERE gu.goal_id = g.id)
          ELSE 0
        END as update_count,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_updates')
          THEN (SELECT MAX(created_at) FROM goal_updates gu WHERE gu.goal_id = g.id)
          ELSE NULL
        END as last_update_at,
        CASE 
          WHEN g.status = 'completed' THEN 'completed'
          WHEN g.target_date < CURRENT_DATE AND g.status NOT IN ('completed', 'cancelled') THEN 'overdue'
          WHEN g.target_date <= CURRENT_DATE + 7 AND g.status NOT IN ('completed', 'cancelled') THEN 'due_soon'
          ELSE g.status
        END as display_status
      FROM goals g
      JOIN profiles p ON p.id = g.profile_id;

      GRANT SELECT ON goals_view TO authenticated;
    END IF;

    -- =====================================================
    -- 1:1 MEETINGS VIEW
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_meetings') THEN
      CREATE OR REPLACE VIEW one_on_one_view AS
      SELECT 
        m.id as meeting_id,
        m.company_id,
        m.employee_id,
        m.manager_id,
        m.scheduled_date,
        m.scheduled_time,
        m.duration_minutes,
        m.location,
        m.meeting_link,
        m.status,
        m.is_recurring,
        m.recurrence_pattern,
        e.full_name as employee_name,
        e.avatar_url as employee_avatar,
        e.position_title,
        mgr.full_name as manager_name,
        mgr.avatar_url as manager_avatar,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_talking_points')
          THEN (SELECT COUNT(*) FROM one_on_one_talking_points tp WHERE tp.meeting_id = m.id)
          ELSE 0
        END as talking_point_count,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_talking_points')
          THEN (SELECT COUNT(*) FROM one_on_one_talking_points tp WHERE tp.meeting_id = m.id AND tp.is_discussed = false)
          ELSE 0
        END as pending_topics
      FROM one_on_one_meetings m
      JOIN profiles e ON e.id = m.employee_id
      JOIN profiles mgr ON mgr.id = m.manager_id;

      GRANT SELECT ON one_on_one_view TO authenticated;
    END IF;

    -- =====================================================
    -- TEAM PERFORMANCE SUMMARY
    -- =====================================================

    CREATE OR REPLACE FUNCTION get_team_performance_summary(p_manager_id UUID)
    RETURNS TABLE (
      profile_id UUID,
      employee_name TEXT,
      position_title TEXT,
      avg_rating DECIMAL,
      goals_completed INTEGER,
      goals_total INTEGER,
      last_1on1_date DATE,
      next_1on1_date DATE,
      pending_review BOOLEAN
    ) AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reports_to') THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT 
        p.id,
        p.full_name,
        p.position_title,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews')
          THEN (SELECT AVG(overall_rating) FROM performance_reviews WHERE profile_id = p.id AND status = 'completed')
          ELSE NULL
        END,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals')
          THEN (SELECT COUNT(*) FROM goals WHERE profile_id = p.id AND status = 'completed')::INTEGER
          ELSE 0
        END,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals')
          THEN (SELECT COUNT(*) FROM goals WHERE profile_id = p.id AND status NOT IN ('cancelled'))::INTEGER
          ELSE 0
        END,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_meetings')
          THEN (SELECT MAX(scheduled_date) FROM one_on_one_meetings WHERE employee_id = p.id AND status = 'completed')
          ELSE NULL
        END,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_meetings')
          THEN (SELECT MIN(scheduled_date) FROM one_on_one_meetings WHERE employee_id = p.id AND status = 'scheduled' AND scheduled_date >= CURRENT_DATE)
          ELSE NULL
        END,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews')
          THEN EXISTS (SELECT 1 FROM performance_reviews WHERE profile_id = p.id AND status NOT IN ('completed', 'acknowledged'))
          ELSE false
        END
      FROM profiles p
      WHERE p.reports_to = p_manager_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created performance views and functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (performance_reviews, profiles) do not exist yet - skipping performance views creation';
  END IF;
END $$;

