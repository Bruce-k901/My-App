-- Create COSHH Data Sheets Table
-- This migration creates the coshh_data_sheets table for managing chemical safety data sheets

-- Drop table if exists for clean migration
DROP TABLE IF EXISTS coshh_data_sheets CASCADE;

CREATE TABLE coshh_data_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  
  -- Chemical reference
  chemical_id uuid REFERENCES chemicals_library(id),
  product_name text NOT NULL,
  manufacturer text,
  
  -- Document details
  document_type text DEFAULT 'COSHH' CHECK (document_type IN ('COSHH', 'SDS', 'MSDS', 'Product Spec')),
  file_name text NOT NULL,
  file_url text NOT NULL, -- Supabase storage URL
  file_size_kb integer,
  
  -- Sheet metadata
  issue_date date,
  revision_number text,
  expiry_date date,
  
  -- Hazard summary (for quick filtering)
  hazard_types text[], -- ["Corrosive", "Irritant", "Flammable", etc.]
  emergency_contact text,
  
  -- Status
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Superseded', 'Archived')),
  verification_status text DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  verified_by text,
  verified_date date,
  
  -- Reminders
  review_reminder_sent boolean DEFAULT false,
  expiry_reminder_sent boolean DEFAULT false,
  
  -- Metadata
  uploaded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coshh_company ON coshh_data_sheets(company_id);
CREATE INDEX idx_coshh_chemical ON coshh_data_sheets(chemical_id);
CREATE INDEX idx_coshh_status ON coshh_data_sheets(status);
CREATE INDEX idx_coshh_expiry ON coshh_data_sheets(expiry_date);
CREATE INDEX idx_coshh_product_name ON coshh_data_sheets(product_name);

-- RLS Policies
ALTER TABLE coshh_data_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's COSHH sheets"
  ON coshh_data_sheets FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can upload COSHH sheets for their company"
  ON coshh_data_sheets FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company's COSHH sheets"
  ON coshh_data_sheets FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their company's COSHH sheets"
  ON coshh_data_sheets FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Updated at trigger
CREATE TRIGGER update_coshh_data_sheets_updated_at
  BEFORE UPDATE ON coshh_data_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON coshh_data_sheets TO authenticated;

/*
================================================================================
STORAGE BUCKET SETUP INSTRUCTIONS
================================================================================

After running this SQL, manually create the storage bucket in Supabase dashboard:

1. Go to Storage in Supabase dashboard
2. Click "Create bucket"
3. Bucket name: coshh-documents
4. Public: NO (private, authenticated access only)
5. File size limit: 10MB
6. Allowed MIME types: 
   - application/pdf
   - image/jpeg
   - image/png
   - image/webp

7. After creating the bucket, run these storage policies:

-- Allow authenticated users to upload to their company folder
CREATE POLICY "Users can upload COSHH documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coshh-documents' 
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
);

-- Allow users to view their company's documents
CREATE POLICY "Users can view their company COSHH documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'coshh-documents'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
);

-- Allow users to delete their company's documents
CREATE POLICY "Users can delete their company COSHH documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coshh-documents'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
);

-- Allow users to update their company's documents
CREATE POLICY "Users can update their company COSHH documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coshh-documents'
  AND (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
);

================================================================================
*/

