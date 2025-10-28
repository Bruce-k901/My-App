-- Function to clean up orphaned files when SOPs are deleted
CREATE OR REPLACE FUNCTION cleanup_sop_attachments()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated files from storage when SOP is deleted
  DELETE FROM storage.objects 
  WHERE bucket_id = 'sop_uploads' 
  AND name LIKE 'images/%' 
  AND name LIKE '%' || OLD.id::text || '%';
  
  DELETE FROM storage.objects 
  WHERE bucket_id = 'sop_uploads' 
  AND name LIKE 'attachments/%' 
  AND name LIKE '%' || OLD.id::text || '%';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up files when SOP is deleted
CREATE TRIGGER cleanup_sop_files_on_delete
  AFTER DELETE ON public.sop_entries
  FOR EACH ROW EXECUTE FUNCTION cleanup_sop_attachments();

-- Function to get file statistics for a SOP
CREATE OR REPLACE FUNCTION get_sop_file_stats(sop_uuid uuid)
RETURNS TABLE (
  total_files bigint,
  total_size bigint,
  image_count bigint,
  attachment_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_files,
    COALESCE(SUM(file_size), 0) as total_size,
    COUNT(*) FILTER (WHERE file_type LIKE 'image/%') as image_count,
    COUNT(*) FILTER (WHERE file_type NOT LIKE 'image/%') as attachment_count
  FROM public.sop_attachments 
  WHERE sop_id = sop_uuid;
END;
$$ LANGUAGE plpgsql;
