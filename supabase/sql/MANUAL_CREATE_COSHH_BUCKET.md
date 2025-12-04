# Manual COSHH Documents Bucket Creation

If the SQL script fails to create the bucket, follow these steps to create it manually in the Supabase dashboard:

## Steps to Create Bucket Manually

1. **Go to Supabase Dashboard**
   - Navigate to your Supabase project
   - Click on "Storage" in the left sidebar

2. **Create New Bucket**
   - Click the "New bucket" button
   - Fill in the following details:
     - **Name**: `coshh-documents`
     - **Public**: `NO` (unchecked - private bucket)
     - **File size limit**: `10` MB
     - **Allowed MIME types**:
       - `application/pdf`
       - `image/jpeg`
       - `image/png`
       - `image/webp`

3. **Click "Create bucket"**

4. **After creating the bucket, run the RLS policies SQL**
   - Go to SQL Editor
   - Run only the policy creation part from `coshh_documents_storage.sql` (Step 3 onwards)

## Alternative: Use Supabase CLI

If you have Supabase CLI set up, you can also create the bucket using:

```bash
supabase storage create coshh-documents --public false --file-size-limit 10485760
```

Then run the RLS policies SQL separately.
