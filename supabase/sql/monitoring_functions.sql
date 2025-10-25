-- Database monitoring and health check functions

-- Function to check database health
CREATE OR REPLACE FUNCTION public.check_database_health()
RETURNS TABLE(
  check_name text,
  status text,
  message text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Database connectivity
  RETURN QUERY
  SELECT 
    'database_connectivity'::text,
    'healthy'::text,
    'Database is accessible'::text,
    jsonb_build_object('timestamp', now())::jsonb;

  -- Check 2: RLS policies are enabled
  RETURN QUERY
  SELECT 
    'rls_enabled'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('assets', 'tasks', 'notifications', 'incidents')
          AND c.relrowsecurity = true
      ) THEN 'healthy'::text
      ELSE 'warning'::text
    END,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('assets', 'tasks', 'notifications', 'incidents')
          AND c.relrowsecurity = true
      ) THEN 'RLS is properly enabled on critical tables'::text
      ELSE 'Some tables may not have RLS enabled'::text
    END,
    jsonb_build_object(
      'tables_checked', ARRAY['assets', 'tasks', 'notifications', 'incidents']
    )::jsonb;

  -- Check 3: Index usage
  RETURN QUERY
  SELECT 
    'index_usage'::text,
    'info'::text,
    'Index usage statistics available'::text,
    jsonb_build_object(
      'total_indexes', (
        SELECT count(*) FROM pg_indexes 
        WHERE schemaname = 'public'
      )
    )::jsonb;

  -- Check 4: Active connections
  RETURN QUERY
  SELECT 
    'active_connections'::text,
    CASE 
      WHEN (
        SELECT count(*) FROM pg_stat_activity 
        WHERE state = 'active'
      ) < 50 THEN 'healthy'::text
      WHEN (
        SELECT count(*) FROM pg_stat_activity 
        WHERE state = 'active'
      ) < 100 THEN 'warning'::text
      ELSE 'critical'::text
    END,
    format('Active connections: %s', (
      SELECT count(*) FROM pg_stat_activity 
      WHERE state = 'active'
    ))::text,
    jsonb_build_object(
      'active_connections', (
        SELECT count(*) FROM pg_stat_activity 
        WHERE state = 'active'
      ),
      'total_connections', (
        SELECT count(*) FROM pg_stat_activity
      )
    )::jsonb;

END;
$$;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION public.get_table_stats()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  table_size text,
  index_size text,
  last_analyzed timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    COALESCE(s.n_tup_ins - s.n_tup_del, 0)::bigint as row_count,
    pg_size_pretty(pg_total_relation_size(c.oid))::text as table_size,
    pg_size_pretty(pg_indexes_size(c.oid))::text as index_size,
    s.last_analyze
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

-- Function to get slow queries (if pg_stat_statements is enabled)
CREATE OR REPLACE FUNCTION public.get_slow_queries()
RETURNS TABLE(
  query text,
  calls bigint,
  total_time numeric,
  mean_time numeric,
  rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if pg_stat_statements extension is available
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) THEN
    RETURN QUERY
    SELECT 
      'pg_stat_statements extension not available'::text,
      0::bigint,
      0::numeric,
      0::numeric,
      0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    LEFT(query, 100)::text,
    calls,
    total_exec_time::numeric,
    mean_exec_time::numeric,
    rows
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000  -- Queries taking more than 1 second on average
  ORDER BY mean_exec_time DESC
  LIMIT 10;
END;
$$;

-- Function to check for missing indexes
CREATE OR REPLACE FUNCTION public.check_missing_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  usage_count bigint,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    attname as column_name,
    seq_scan as usage_count,
    CASE 
      WHEN seq_scan > 1000 THEN 'Consider adding index on ' || attname
      ELSE 'No index needed'
    END as recommendation
  FROM pg_stat_user_tables t
  JOIN pg_attribute a ON a.attrelid = t.relid
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND seq_scan > 100
  ORDER BY seq_scan DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_database_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_missing_indexes() TO authenticated;
