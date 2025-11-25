-- Fix tasks table schema and add notification system for message-created tasks
-- This migration ensures the tasks table has the correct schema and adds notifications

-- Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category text,
  due_date date,
  due_time time,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_from_message_id uuid REFERENCES public.messaging_messages(id) ON DELETE SET NULL,
  linked_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_site_id ON public.tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_from_message ON public.tasks(created_from_message_id);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
DROP POLICY IF EXISTS "Users can view tasks in their company" ON public.tasks;
CREATE POLICY "Users can view tasks in their company" 
  ON public.tasks FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create tasks in their company" ON public.tasks;
CREATE POLICY "Users can create tasks in their company" 
  ON public.tasks FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update tasks in their company" ON public.tasks;
CREATE POLICY "Users can update tasks in their company" 
  ON public.tasks FOR UPDATE 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete tasks they created" ON public.tasks;
CREATE POLICY "Users can delete tasks they created" 
  ON public.tasks FOR DELETE 
  USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('Admin', 'Manager')
    )
  );

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true); -- Allow system to create notifications for any user

-- Function to create notification when task is updated or assigned
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
  task_creator_id uuid;
  task_assignee_id uuid;
  current_user_id uuid;
  notification_title text;
  notification_message text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Get task creator and assignee
  task_creator_id := NEW.created_by;
  task_assignee_id := NEW.assigned_to;
  
  -- Handle INSERT (new task created with assignment)
  IF TG_OP = 'INSERT' THEN
    -- Notify assignee if task is assigned to someone other than creator
    IF task_assignee_id IS NOT NULL AND task_assignee_id != task_creator_id THEN
      notification_title := 'New Task Assigned';
      notification_message := 'You have been assigned: "' || NEW.title || '"';
      
      INSERT INTO public.notifications (
        company_id,
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        NEW.company_id,
        task_assignee_id,
        'task_assigned',
        notification_title,
        notification_message,
        '/dashboard/tasks/my-tasks?task=' || NEW.id,
        jsonb_build_object(
          'task_id', NEW.id,
          'task_title', NEW.title,
          'assigned_by', task_creator_id
        )
      );
    END IF;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Notify task creator if someone else updates the task
    IF task_creator_id IS NOT NULL AND current_user_id != task_creator_id THEN
      -- Status changed
      IF OLD.status != NEW.status THEN
        IF NEW.status = 'completed' THEN
          notification_title := 'Task Completed';
          notification_message := 'Task "' || NEW.title || '" has been completed';
          
          INSERT INTO public.notifications (
            company_id,
            user_id,
            type,
            title,
            message,
            link,
            metadata
          ) VALUES (
            NEW.company_id,
            task_creator_id,
            'task_completed',
            notification_title,
            notification_message,
            '/dashboard/tasks/my-tasks?task=' || NEW.id,
            jsonb_build_object(
              'task_id', NEW.id,
              'task_title', NEW.title,
              'old_status', OLD.status,
              'new_status', NEW.status,
              'completed_by', current_user_id
            )
          );
        ELSIF NEW.status = 'in_progress' THEN
          notification_title := 'Task Started';
          notification_message := 'Task "' || NEW.title || '" has been started';
          
          INSERT INTO public.notifications (
            company_id,
            user_id,
            type,
            title,
            message,
            link,
            metadata
          ) VALUES (
            NEW.company_id,
            task_creator_id,
            'task_updated',
            notification_title,
            notification_message,
            '/dashboard/tasks/my-tasks?task=' || NEW.id,
            jsonb_build_object(
              'task_id', NEW.id,
              'task_title', NEW.title,
              'old_status', OLD.status,
              'new_status', NEW.status,
              'started_by', current_user_id
            )
          );
        END IF;
      END IF;
    END IF;
    
    -- Notify new assignee if assignment changed
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != current_user_id THEN
        notification_title := 'Task Assigned to You';
        notification_message := 'You have been assigned: "' || NEW.title || '"';
        
        INSERT INTO public.notifications (
          company_id,
          user_id,
          type,
          title,
          message,
          link,
          metadata
        ) VALUES (
          NEW.company_id,
          NEW.assigned_to,
          'task_assigned',
          notification_title,
          notification_message,
          '/dashboard/tasks/my-tasks?task=' || NEW.id,
          jsonb_build_object(
            'task_id', NEW.id,
            'task_title', NEW.title,
            'assigned_by', current_user_id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task updates AND inserts
DROP TRIGGER IF EXISTS trigger_notify_task_update ON public.tasks;
CREATE TRIGGER trigger_notify_task_update
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update();

-- Update updated_at timestamp automatically
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
