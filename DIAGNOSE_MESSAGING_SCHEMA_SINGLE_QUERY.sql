-- ============================================================================
-- DIAGNOSTIC SCRIPT: Check Current Messaging Schema Structure
-- This version returns all results in a single query for Supabase SQL Editor
-- ============================================================================

SELECT 
  'SCHEMA_DIAGNOSIS' as report_section,
  jsonb_build_object(
    'messaging_messages_columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'messaging_messages'
      ORDER BY ordinal_position
    ),
    'messaging_messages_sender_column', (
      SELECT CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'messaging_messages' 
          AND column_name = 'sender_profile_id'
        ) THEN 'sender_profile_id'
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'messaging_messages' 
          AND column_name = 'sender_id'
        ) THEN 'sender_id'
        ELSE 'NOT_FOUND'
      END
    ),
    'typing_indicators_columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'typing_indicators'
      ORDER BY ordinal_position
    ),
    'typing_indicators_channel_column', (
      SELECT CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'typing_indicators' 
          AND column_name = 'channel_id'
        ) THEN 'channel_id'
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'typing_indicators' 
          AND column_name = 'conversation_id'
        ) THEN 'conversation_id'
        ELSE 'NOT_FOUND'
      END
    ),
    'typing_indicators_user_column', (
      SELECT CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'typing_indicators' 
          AND column_name = 'profile_id'
        ) THEN 'profile_id'
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'typing_indicators' 
          AND column_name = 'user_id'
        ) THEN 'user_id'
        ELSE 'NOT_FOUND'
      END
    ),
    'typing_indicators_constraints', (
      SELECT jsonb_agg(jsonb_build_object(
        'constraint_name', constraint_name,
        'constraint_type', constraint_type
      ))
      FROM information_schema.table_constraints
      WHERE table_name = 'typing_indicators'
      AND table_schema = 'public'
    ),
    'typing_indicators_primary_key_columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', kcu.column_name,
        'ordinal_position', kcu.ordinal_position
      ))
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'typing_indicators'
      AND tc.table_schema = 'public'
      AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    ),
    'messaging_channel_members_columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'messaging_channel_members'
      ORDER BY ordinal_position
    ),
    'messaging_channel_members_user_column', (
      SELECT CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'messaging_channel_members' 
          AND column_name = 'profile_id'
        ) THEN 'profile_id'
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'messaging_channel_members' 
          AND column_name = 'user_id'
        ) THEN 'user_id'
        ELSE 'NOT_FOUND'
      END
    ),
    'messaging_messages_rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policyname', policyname,
        'operation', cmd,
        'using_clause', substring(qual, 1, 200),
        'with_check_clause', substring(with_check, 1, 200)
      ))
      FROM pg_policies
      WHERE tablename = 'messaging_messages'
      AND schemaname = 'public'
    ),
    'typing_indicators_rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policyname', policyname,
        'operation', cmd,
        'using_clause', substring(qual, 1, 200),
        'with_check_clause', substring(with_check, 1, 200)
      ))
      FROM pg_policies
      WHERE tablename = 'typing_indicators'
      AND schemaname = 'public'
    ),
    'messaging_channel_members_rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policyname', policyname,
        'operation', cmd,
        'using_clause', substring(qual, 1, 200),
        'with_check_clause', substring(with_check, 1, 200)
      ))
      FROM pg_policies
      WHERE tablename = 'messaging_channel_members'
      AND schemaname = 'public'
    )
  ) as diagnosis;
