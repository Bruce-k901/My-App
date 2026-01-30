-- Check if trial rota shifts were created

-- Check rotas table
SELECT 
  id,
  company_id,
  site_id,
  week_starting,
  status,
  created_at
FROM public.rotas
ORDER BY created_at DESC
LIMIT 10;

-- Check rota_shifts table for trial shifts
SELECT 
  rs.id,
  rs.rota_id,
  rs.shift_date,
  rs.start_time,
  rs.end_time,
  rs.role_required,
  rs.color,
  rs.notes,
  rs.profile_id,
  rs.status,
  rs.created_at
FROM public.rota_shifts rs
ORDER BY rs.created_at DESC
LIMIT 10;

-- Check applications with trial_rota_shift_id
SELECT 
  id,
  status,
  trial_scheduled_at,
  trial_rota_shift_id,
  updated_at
FROM public.applications
WHERE trial_scheduled_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Join to see full trial shift details
SELECT 
  a.id as application_id,
  c.full_name as candidate_name,
  j.title as job_title,
  a.trial_scheduled_at,
  a.trial_rota_shift_id,
  rs.shift_date,
  rs.start_time,
  rs.end_time,
  rs.notes,
  rs.color
FROM public.applications a
JOIN public.candidates c ON c.id = a.candidate_id
JOIN public.jobs j ON j.id = a.job_id
LEFT JOIN public.rota_shifts rs ON rs.id = a.trial_rota_shift_id
WHERE a.trial_scheduled_at IS NOT NULL
ORDER BY a.updated_at DESC
LIMIT 5;
