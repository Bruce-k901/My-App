-- ✅ Check Trial Shifts on Rota
-- Run this to see all trial shifts currently in the system

-- 1. Check all trial shifts with full details
SELECT 
  rs.id as shift_id,
  rs.shift_date,
  rs.start_time,
  rs.end_time,
  rs.color,
  rs.role_required,
  rs.status,
  substring(rs.notes from 1 for 100) as notes_preview,
  r.week_starting,
  s.name as site_name,
  a.id as application_id,
  c.full_name as candidate_name,
  j.title as job_title,
  a.trial_confirmation_status
FROM rota_shifts rs
LEFT JOIN rotas r ON rs.rota_id = r.id
LEFT JOIN sites s ON r.site_id = s.id
LEFT JOIN applications a ON a.trial_rota_shift_id = rs.id
LEFT JOIN candidates c ON a.candidate_id = c.id
LEFT JOIN jobs j ON a.job_id = j.id
WHERE rs.notes LIKE '%TRIAL SHIFT%'
ORDER BY rs.shift_date DESC, rs.start_time;

-- 2. Count of trial shifts
SELECT 
  COUNT(*) as total_trial_shifts,
  COUNT(CASE WHEN rs.shift_date >= CURRENT_DATE THEN 1 END) as upcoming_trials,
  COUNT(CASE WHEN rs.shift_date < CURRENT_DATE THEN 1 END) as past_trials
FROM rota_shifts rs
WHERE rs.notes LIKE '%TRIAL SHIFT%';

-- 3. Trial shifts by week
SELECT 
  r.week_starting,
  s.name as site_name,
  COUNT(*) as trial_shifts_this_week
FROM rota_shifts rs
JOIN rotas r ON rs.rota_id = r.id
JOIN sites s ON r.site_id = s.id
WHERE rs.notes LIKE '%TRIAL SHIFT%'
GROUP BY r.week_starting, s.name
ORDER BY r.week_starting DESC;

-- 4. Check specific candidate's trial shift
-- (Replace with actual candidate name)
SELECT 
  rs.*,
  r.week_starting,
  s.name as site_name
FROM rota_shifts rs
JOIN rotas r ON rs.rota_id = r.id
JOIN sites s ON r.site_id = s.id
WHERE rs.notes LIKE '%[Candidate Name]%'  -- Replace with actual name
ORDER BY rs.shift_date DESC;
