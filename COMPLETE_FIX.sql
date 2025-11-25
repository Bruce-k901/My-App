-- COMPLETE CLEANUP AND REBUILD
-- This will fix all schema cache issues

-- Step 1: Drop ALL related objects
DROP TRIGGER IF EXISTS trigger_notify_task_update ON public.tasks;
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
DROP FUNCTION IF EXISTS notify_task_update() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Step 2: Check if tasks table exists, if not create it
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
  created_from_message_id uuid,
  linked_asset_id uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Step 3: Add missing columns to existing tasks table (if it already existed)
DO $$ 
BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time;
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Step 4: Create fresh notifications table
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

-- Step 5: Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_site_id ON public.tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Step 6: Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

-- Step 8: RLS Policies for tasks (if not already exist)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view tasks in their company" ON public.tasks;
  CREATE POLICY "Users can view tasks in their company" 
    ON public.tasks FOR SELECT 
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create tasks in their company" ON public.tasks;
  CREATE POLICY "Users can create tasks in their company" 
    ON public.tasks FOR INSERT 
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update tasks in their company" ON public.tasks;
  CREATE POLICY "Users can update tasks in their company" 
    ON public.tasks FOR UPDATE 
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 9: Create notification trigger function
CREATE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
  task_creator_id uuid;
  task_assignee_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  task_creator_id := NEW.created_by;
  task_assignee_id := NEW.assigned_to;
  
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
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
      );
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
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
            jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
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
            jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
          );
        END IF;
      END IF;
    END IF;
    
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
          jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create triggers
CREATE TRIGGER trigger_notify_task_update
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update();

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Force reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 12: Verify tables
SELECT 'notifications' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'notifications'
UNION ALL
SELECT 'tasks' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY table_name, column_name;
