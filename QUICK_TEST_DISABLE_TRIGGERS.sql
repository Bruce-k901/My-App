-- ============================================================================
-- QUICK TEST: Disable triggers one by one to find the problematic one
-- Run this and test message sending after each step
-- ============================================================================

-- Test 1: Disable unread counts trigger (most likely culprit)
ALTER TABLE messaging_messages DISABLE TRIGGER trg_update_unread_counts;

-- Now try sending a message. If it works, this was the problem!
-- If not, continue...

-- Test 2: Also disable thread count trigger
-- ALTER TABLE messaging_messages DISABLE TRIGGER trg_update_thread_count;

-- Test 3: Disable all except the channel update (which is probably safe)
-- ALTER TABLE messaging_messages DISABLE TRIGGER trg_update_thread_count;
-- ALTER TABLE messaging_messages DISABLE TRIGGER trg_update_unread_counts;
-- ALTER TABLE messaging_messages DISABLE TRIGGER trg_update_channel_last_message_at;

-- To re-enable later:
-- ALTER TABLE messaging_messages ENABLE TRIGGER trg_update_unread_counts;

-- Check current status:
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;
