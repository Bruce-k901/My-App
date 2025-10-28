-- Create sop_attachments table for document attachments
CREATE TABLE IF NOT EXISTS public.sop_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid REFERENCES public.sop_entries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.sop_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for SOPs they have access to
CREATE POLICY "Users can view attachments for accessible SOPs" ON public.sop_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sop_entries 
      WHERE sop_entries.id = sop_attachments.sop_id 
      AND sop_entries.company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert attachments for SOPs they can edit
CREATE POLICY "Users can insert attachments for editable SOPs" ON public.sop_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sop_entries 
      WHERE sop_entries.id = sop_attachments.sop_id 
      AND sop_entries.company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update attachments they uploaded
CREATE POLICY "Users can update their own attachments" ON public.sop_attachments
  FOR UPDATE USING (uploaded_by = auth.uid());

-- Policy: Users can delete attachments they uploaded
CREATE POLICY "Users can delete their own attachments" ON public.sop_attachments
  FOR DELETE USING (uploaded_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sop_attachments_sop_id ON public.sop_attachments(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_attachments_uploaded_by ON public.sop_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_sop_attachments_created_at ON public.sop_attachments(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sop_attachments_updated_at 
  BEFORE UPDATE ON public.sop_attachments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
