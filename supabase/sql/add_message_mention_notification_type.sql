-- Add message_mention type to notifications table
-- This allows notifications to be created when users are @mentioned in messages

-- First, drop the existing check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with message_mention type included
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'incident',
  'temperature',
  'task',
  'maintenance',
  'digest',
  'ppm_due_soon',
  'ppm_overdue',
  'ppm_completed',
  'message_mention'
));

-- Add index for efficient querying of mention notifications
CREATE INDEX IF NOT EXISTS idx_notifications_message_mention 
ON public.notifications(user_id, type, created_at DESC) 
WHERE type = 'message_mention' AND read = false;
