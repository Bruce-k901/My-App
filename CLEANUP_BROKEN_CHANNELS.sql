-- ============================================================================
-- CLEANUP BROKEN CHANNELS
-- This script removes channels that shouldn't exist:
-- 1. Direct channels with no members
-- 2. Direct channels where user is messaging themselves
-- 3. Channels with only one member (for direct messages)
-- ============================================================================

-- ============================================================================
-- 1. DELETE Direct channels with no members
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  SELECT mc.id 
  FROM public.messaging_channels mc
  LEFT JOIN public.messaging_channel_members mcm ON mc.id = mcm.channel_id AND mcm.left_at IS NULL
  WHERE mcm.id IS NULL
    AND mc.channel_type = 'direct'
    AND mc.archived_at IS NULL
);

-- ============================================================================
-- 2. DELETE Direct channels where user is messaging themselves
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  SELECT mc.id
  FROM public.messaging_channels mc
  INNER JOIN public.messaging_channel_members mcm ON mc.id = mcm.channel_id
  WHERE mc.channel_type = 'direct'
    AND mc.archived_at IS NULL
    AND mc.created_by = mcm.profile_id
    -- Only one member and it's the creator
    AND (
      SELECT COUNT(*)
      FROM public.messaging_channel_members mcm2
      WHERE mcm2.channel_id = mc.id
        AND mcm2.left_at IS NULL
    ) = 1
);

-- ============================================================================
-- 3. DELETE Direct channels with only one member (should have 2 for direct)
-- ============================================================================
DELETE FROM public.messaging_channels
WHERE id IN (
  SELECT mc.id
  FROM public.messaging_channels mc
  WHERE mc.channel_type = 'direct'
    AND mc.archived_at IS NULL
    AND (
      SELECT COUNT(*)
      FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = mc.id
        AND mcm.left_at IS NULL
    ) = 1
);

-- ============================================================================
-- VERIFICATION: Show remaining broken channels
-- ============================================================================
SELECT 
  mc.id,
  mc.name,
  mc.channel_type,
  mc.created_by,
  mc.created_at,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as active_member_count,
  STRING_AGG(mcm.profile_id::text, ', ') FILTER (WHERE mcm.left_at IS NULL) as member_ids
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
WHERE mc.archived_at IS NULL
  AND mc.channel_type = 'direct'
GROUP BY mc.id, mc.name, mc.channel_type, mc.created_by, mc.created_at
HAVING COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) < 2
ORDER BY mc.created_at DESC;
