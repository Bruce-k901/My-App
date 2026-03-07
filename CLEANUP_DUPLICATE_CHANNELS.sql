-- ============================================================================
-- CLEANUP DUPLICATE AND ROGUE CHANNELS
-- This script removes:
-- 1. Direct channels where user is messaging themselves
-- 2. Duplicate direct channels between the same two users
-- 3. Channels with wrong member counts
-- ============================================================================

-- ============================================================================
-- 1. DELETE Direct channels where user is messaging themselves
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  SELECT mc.id
  FROM public.messaging_channels mc
  WHERE mc.channel_type = 'direct'
    AND mc.archived_at IS NULL
    AND (
      SELECT COUNT(DISTINCT mcm.profile_id)
      FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = mc.id
        AND mcm.left_at IS NULL
    ) = 1
    AND EXISTS (
      SELECT 1
      FROM public.messaging_channel_members mcm2
      WHERE mcm2.channel_id = mc.id
        AND mcm2.profile_id = mc.created_by
        AND mcm2.left_at IS NULL
    )
);

-- ============================================================================
-- 2. DELETE Duplicate direct channels between the same two users
-- Keep only the most recent one (by last_message_at or created_at)
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  WITH channel_pairs AS (
    SELECT 
      mc.id,
      mc.created_at,
      mc.last_message_at,
      ARRAY_AGG(mcm.profile_id ORDER BY mcm.profile_id) as member_ids,
      COUNT(DISTINCT mcm.profile_id) as member_count
    FROM public.messaging_channels mc
    INNER JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
    WHERE mc.channel_type = 'direct'
      AND mc.archived_at IS NULL
      AND mcm.left_at IS NULL
    GROUP BY mc.id, mc.created_at, mc.last_message_at
    HAVING COUNT(DISTINCT mcm.profile_id) = 2
  ),
  duplicates AS (
    SELECT 
      cp1.id,
      ROW_NUMBER() OVER (
        PARTITION BY cp1.member_ids 
        ORDER BY 
          COALESCE(cp1.last_message_at, cp1.created_at) DESC,
          cp1.created_at DESC
      ) as rn
    FROM channel_pairs cp1
  )
  SELECT id
  FROM duplicates
  WHERE rn > 1
);

-- ============================================================================
-- 3. DELETE Direct channels with wrong member count (not 2)
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  SELECT mc.id
  FROM public.messaging_channels mc
  WHERE mc.channel_type = 'direct'
    AND mc.archived_at IS NULL
    AND (
      SELECT COUNT(DISTINCT mcm.profile_id)
      FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = mc.id
        AND mcm.left_at IS NULL
    ) != 2
);

-- ============================================================================
-- VERIFICATION: Show remaining direct channels
-- ============================================================================
SELECT 
  mc.id,
  mc.name as channel_name,
  mc.created_by,
  p_creator.full_name as creator_name,
  COUNT(DISTINCT mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as member_count,
  STRING_AGG(
    p_member.full_name || ' (' || mcm.profile_id::text || ')', 
    ', '
  ) FILTER (WHERE mcm.left_at IS NULL) as members,
  mc.last_message_at,
  mc.created_at
FROM public.messaging_channels mc
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
LEFT JOIN public.profiles p_member ON p_member.id = mcm.profile_id
WHERE mc.channel_type = 'direct'
  AND mc.archived_at IS NULL
GROUP BY mc.id, mc.name, mc.created_by, p_creator.full_name, mc.last_message_at, mc.created_at
ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;
