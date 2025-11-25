-- RUN THIS IN SUPABASE SQL EDITOR
-- This script will DROP and recreate the notifications table

-- Step 1: Drop existing notifications table and related objects
DROP TRIGGER IF EXISTS trigger_notify_task_update ON public.tasks;
DROP FUNCTION IF EXISTS notify_task_update();
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Step 2: Create notifications table with correct schema
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned', 'task_updated', 'task_completed', 'task_overdue', 'message', 'incident', 'other')),
  title text NOT NULL,
  message text,
  link text,
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Add indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);

-- Step 4: Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

-- Step 6: Add missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 7: Create notification trigger function
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
  task_creator_id uuid;
  task_assignee_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  task_creator_id := NEW.created_by;
  task_assignee_id := NEW.assigned_to;
  
  -- Handle INSERT (new task with assignment)
  IF TG_OP = 'INSERT' THEN
    IF task_assignee_id IS NOT NULL AND task_assignee_id != task_creator_id THEN
      INSERT INTO public.notifications (
        company_id, user_id, type, title, message, link, metadata
      ) VALUES (
        NEW.company_id,
        task_assignee_id,
        'task_assigned',
        'New Task Assigned',
        'You have been assigned: "' || NEW.title || '"',
        '/dashboard/tasks/my-tasks?task=' || NEW.id,
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'assigned_by', task_creator_id)
      );
    END IF;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Notify creator if someone else updates
    IF task_creator_id IS NOT NULL AND current_user_id != task_creator_id THEN
      IF OLD.status != NEW.status THEN
        IF NEW.status = 'completed' THEN
          INSERT INTO public.notifications (
            company_id, user_id, type, title, message, link, metadata
          ) VALUES (
            NEW.company_id,
            task_creator_id,
            'task_completed',
            'Task Completed',
            'Task "' || NEW.title || '" has been completed',
            '/dashboard/tasks/my-tasks?task=' || NEW.id,
            jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'completed_by', current_user_id)
          );
        ELSIF NEW.status = 'in_progress' THEN
          INSERT INTO public.notifications (
            company_id, user_id, type, title, message, link, metadata
          ) VALUES (
            NEW.company_id,
            task_creator_id,
            'task_updated',
            'Task Started',
            'Task "' || NEW.title || '" has been started',
            '/dashboard/tasks/my-tasks?task=' || NEW.id,
            jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'started_by', current_user_id)
          );
        END IF;
      END IF;
    END IF;
    
    -- Notify new assignee if assignment changed
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != current_user_id THEN
        INSERT INTO public.notifications (
          company_id, user_id, type, title, message, link, metadata
        ) VALUES (
          NEW.company_id,
          NEW.assigned_to,
          'task_assigned',
          'Task Assigned to You',
          'You have been assigned: "' || NEW.title || '"',
          '/dashboard/tasks/my-tasks?task=' || NEW.id,
          jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'assigned_by', current_user_id)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger
CREATE TRIGGER trigger_notify_task_update
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update();

-- Step 9: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Reload schema cache
NOTIFY pgrst, 'reload schema';

-- DONE! Refresh your app and notifications should work!
