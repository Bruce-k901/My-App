-- ============================================================================
-- FIX EXISTING CHANNEL MEMBERSHIPS
-- This script ensures all existing channels have their participants as members
-- ============================================================================

DO $$
DECLARE
  v_channel RECORD;
  v_creator_id UUID;
  v_other_participant_id UUID;
  v_member_exists BOOLEAN;
  v_other_member_count INTEGER;
BEGIN
  -- Loop through all messaging channels
  FOR v_channel IN 
    SELECT id, created_by, channel_type, name, company_id
    FROM public.messaging_channels
    WHERE archived_at IS NULL
  LOOP
    -- Ensure the creator is a member
    IF v_channel.created_by IS NOT NULL THEN
      -- Check if creator is already a member
      SELECT EXISTS (
        SELECT 1 FROM public.messaging_channel_members
        WHERE channel_id = v_channel.id
          AND profile_id = v_channel.created_by
          AND left_at IS NULL
      ) INTO v_member_exists;
      
      IF NOT v_member_exists THEN
        -- Add creator as member (admin role)
        -- Use INSERT with ON CONFLICT if unique constraint exists, otherwise just INSERT
        BEGIN
          INSERT INTO public.messaging_channel_members (
            channel_id,
            profile_id,
            member_role,
            joined_at
          )
          VALUES (
            v_channel.id,
            v_channel.created_by,
            'admin',
            NOW()
          )
          ON CONFLICT (channel_id, profile_id) DO UPDATE
          SET left_at = NULL, -- Rejoin if they left
              member_role = COALESCE(messaging_channel_members.member_role, 'admin');
        EXCEPTION WHEN OTHERS THEN
          -- If ON CONFLICT fails (no unique constraint), try simple INSERT
          INSERT INTO public.messaging_channel_members (
            channel_id,
            profile_id,
            member_role,
            joined_at
          )
          VALUES (
            v_channel.id,
            v_channel.created_by,
            'admin',
            NOW()
          );
        END;
        
        RAISE NOTICE 'Added creator % to channel %', v_channel.created_by, v_channel.id;
      END IF;
    END IF;
    
    -- For direct message channels, try to find the other participant
    IF v_channel.channel_type = 'direct' THEN
      -- First, try to find participants from messages
      -- Get all unique message senders who aren't the creator
      FOR v_other_participant_id IN 
        SELECT DISTINCT sender_profile_id
        FROM public.messaging_messages
        WHERE channel_id = v_channel.id
          AND sender_profile_id != v_channel.created_by
          AND sender_profile_id IS NOT NULL
      LOOP
        -- Check if they're already a member
        SELECT EXISTS (
          SELECT 1 FROM public.messaging_channel_members
          WHERE channel_id = v_channel.id
            AND profile_id = v_other_participant_id
            AND left_at IS NULL
        ) INTO v_member_exists;
        
        IF NOT v_member_exists THEN
          -- Add the participant
          BEGIN
            INSERT INTO public.messaging_channel_members (
              channel_id,
              profile_id,
              member_role,
              joined_at
            )
            VALUES (
              v_channel.id,
              v_other_participant_id,
              'member',
              NOW()
            )
            ON CONFLICT (channel_id, profile_id) DO UPDATE
            SET left_at = NULL, -- Rejoin if they left
                member_role = COALESCE(messaging_channel_members.member_role, 'member');
          EXCEPTION WHEN OTHERS THEN
            -- If ON CONFLICT fails (no unique constraint), try simple INSERT
            INSERT INTO public.messaging_channel_members (
              channel_id,
              profile_id,
              member_role,
              joined_at
            )
            VALUES (
              v_channel.id,
              v_other_participant_id,
              'member',
              NOW()
            );
          END;
          
          RAISE NOTICE 'Added participant % to direct channel %', v_other_participant_id, v_channel.id;
        END IF;
      END LOOP;
      
      -- If no messages found, try to infer from channel name (if it matches a user's name)
      -- This is a fallback - not perfect but better than nothing
      -- Check if we found any participants from messages (other than creator)
      SELECT COUNT(*) INTO v_other_member_count
      FROM public.messaging_channel_members
      WHERE channel_id = v_channel.id
        AND profile_id != v_channel.created_by
        AND left_at IS NULL;
      
      -- If no other participants found from messages, try name matching
      IF v_other_member_count = 0 THEN
        SELECT id INTO v_other_participant_id
        FROM public.profiles
        WHERE company_id = v_channel.company_id
          AND id != v_channel.created_by
          AND (
            full_name = v_channel.name
            OR email = v_channel.name
          )
        LIMIT 1;
        
        IF v_other_participant_id IS NOT NULL THEN
          -- Check if they're already a member
          SELECT EXISTS (
            SELECT 1 FROM public.messaging_channel_members
            WHERE channel_id = v_channel.id
              AND profile_id = v_other_participant_id
              AND left_at IS NULL
          ) INTO v_member_exists;
          
          IF NOT v_member_exists THEN
            BEGIN
              INSERT INTO public.messaging_channel_members (
                channel_id,
                profile_id,
                member_role,
                joined_at
              )
              VALUES (
                v_channel.id,
                v_other_participant_id,
                'member',
                NOW()
              )
              ON CONFLICT (channel_id, profile_id) DO UPDATE
              SET left_at = NULL,
                  member_role = COALESCE(messaging_channel_members.member_role, 'member');
            EXCEPTION WHEN OTHERS THEN
              INSERT INTO public.messaging_channel_members (
                channel_id,
                profile_id,
                member_role,
                joined_at
              )
              VALUES (
                v_channel.id,
                v_other_participant_id,
                'member',
                NOW()
              );
            END;
            
            RAISE NOTICE 'Added participant % (from name match) to direct channel %', v_other_participant_id, v_channel.id;
          END IF;
        ELSE
            RAISE NOTICE 'Could not find other participant for direct channel % (name: %)', v_channel.id, v_channel.name;
          END IF;
        END IF;
    END IF;
    
    -- For group/site/team channels, ensure at least the creator is a member
    -- (Other participants should be added through the normal flow)
    IF v_channel.channel_type IN ('group', 'site', 'team') THEN
      -- Creator is already handled above
      RAISE NOTICE 'Group/site/team channel % - creator membership ensured', v_channel.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Finished fixing channel memberships';
END $$;

-- ============================================================================
-- VERIFICATION: Check channels without members
-- ============================================================================
SELECT 
  mc.id,
  mc.name,
  mc.channel_type,
  mc.created_by,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as active_member_count
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
WHERE mc.archived_at IS NULL
GROUP BY mc.id, mc.name, mc.channel_type, mc.created_by
HAVING COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) = 0
ORDER BY mc.created_at DESC;

-- ============================================================================
-- VERIFICATION: Check channels with only creator as member
-- ============================================================================
SELECT 
  mc.id,
  mc.name,
  mc.channel_type,
  mc.created_by,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as active_member_count,
  STRING_AGG(mcm.profile_id::text, ', ') FILTER (WHERE mcm.left_at IS NULL) as member_ids
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
WHERE mc.archived_at IS NULL
  AND mc.channel_type = 'direct'
GROUP BY mc.id, mc.name, mc.channel_type, mc.created_by
HAVING COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) = 1
ORDER BY mc.created_at DESC;
