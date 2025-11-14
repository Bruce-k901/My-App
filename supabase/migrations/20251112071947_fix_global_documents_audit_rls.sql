-- Ensure RLS is enabled for the audit table
alter table if exists public.global_documents_audit enable row level security;

-- Allow authenticated users to see their audit history (optional, mostly for debugging)
drop policy if exists global_documents_audit_select on public.global_documents_audit;
create policy global_documents_audit_select
  on public.global_documents_audit
  for select
  using (auth.uid() is not null or public.is_service_role());

-- Allow audit trigger to insert rows
-- The trigger runs as the same role as the caller (authenticated), so we need an insert policy
-- The trigger will populate document_id/action/timestamp/user_id, so we accept any values here
drop policy if exists global_documents_audit_insert on public.global_documents_audit;
create policy global_documents_audit_insert
  on public.global_documents_audit
  for insert
  with check (auth.uid() is not null or public.is_service_role());


