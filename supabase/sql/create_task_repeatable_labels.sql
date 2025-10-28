-- Task Repeatable Labels Table
-- Predefined labels for repeatable fields (e.g., fridge names, extinguisher locations)

CREATE TABLE IF NOT EXISTS public.task_repeatable_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Label Info
  label_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_repeatable_labels_template 
  ON public.task_repeatable_labels(task_template_id);

CREATE INDEX IF NOT EXISTS idx_task_repeatable_labels_order 
  ON public.task_repeatable_labels(task_template_id, display_order);

-- Enable RLS
ALTER TABLE public.task_repeatable_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from task_templates)
CREATE POLICY task_repeatable_labels_select ON public.task_repeatable_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_repeatable_labels_insert ON public.task_repeatable_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_repeatable_labels_update ON public.task_repeatable_labels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_repeatable_labels_delete ON public.task_repeatable_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_repeatable_labels TO authenticated;

COMMENT ON TABLE public.task_repeatable_labels IS 'Predefined labels for repeatable fields in task templates (e.g., specific fridge names, extinguisher locations)';

