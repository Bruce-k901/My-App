-- ============================================================================
-- Migration: 20251111100000_extend_incidents_riddor.sql
-- Description: Extends incidents table with detailed RIDDOR tracking fields
-- ============================================================================

alter table if exists public.incidents
  add column if not exists lost_time_days integer;

alter table if exists public.incidents
  add column if not exists hospitalisation boolean default false;

alter table if exists public.incidents
  add column if not exists public_involved boolean default false;

alter table if exists public.incidents
  add column if not exists reportable_disease boolean default false;

alter table if exists public.incidents
  add column if not exists environmental_release boolean default false;

alter table if exists public.incidents
  add column if not exists riddor_category text check (
    riddor_category in (
      'fatality',
      'specified_injury',
      'over_seven_day',
      'hospitalisation',
      'public_hospitalisation',
      'occupational_disease',
      'dangerous_occurrence',
      'other'
    )
  );

alter table if exists public.incidents
  add column if not exists riddor_reason text;

alter table if exists public.incidents
  add column if not exists riddor_due_date date;

alter table if exists public.incidents
  add column if not exists riddor_notes text;

alter table if exists public.incidents
  add column if not exists riddor_notified_at timestamptz;

alter table if exists public.incidents
  add column if not exists export_url text;

do $$
begin
  if to_regclass('public.incidents') is not null then
    comment on column public.incidents.lost_time_days is 'Number of days the injured worker is expected to be off work';
    comment on column public.incidents.hospitalisation is 'Whether anyone was admitted to hospital as a result of the incident';
    comment on column public.incidents.public_involved is 'True if a member of the public was injured and taken to hospital';
    comment on column public.incidents.reportable_disease is 'True if it involves a reportable occupational disease';
    comment on column public.incidents.environmental_release is 'True if a dangerous occurrence or hazardous substance release occurred';
    comment on column public.incidents.riddor_category is 'RIDDOR category assigned to this incident';
    comment on column public.incidents.riddor_reason is 'Derived explanation of why the incident is RIDDOR reportable';
    comment on column public.incidents.riddor_due_date is 'Deadline by which the RIDDOR report must be submitted';
    comment on column public.incidents.riddor_notes is 'Additional context or decision notes for the RIDDOR assessment';
    comment on column public.incidents.riddor_notified_at is 'Timestamp when the RIDDOR notification was sent';
    comment on column public.incidents.export_url is 'Reference to the generated incident export (PDF/JSON) if stored';
  end if;
end
$$;


