-- Update storage global_docs policies to consider auth_user_id as well

-- Remove existing policies if they exist
drop policy if exists global_docs_select_company on storage.objects;
drop policy if exists global_docs_insert_company on storage.objects;
drop policy if exists global_docs_update_company on storage.objects;
drop policy if exists global_docs_delete_company on storage.objects;

-- Allow authenticated users to SELECT objects in their company path
create policy global_docs_select_company
  on storage.objects
  for select
  using (
    bucket_id = 'global_docs'
    and exists (
      select 1 from public.profiles p
      where (p.id = auth.uid() or p.auth_user_id = auth.uid())
        and split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
    )
  );

-- Allow authenticated users to INSERT objects into their company path
create policy global_docs_insert_company
  on storage.objects
  for insert
  with check (
    bucket_id = 'global_docs'
    and exists (
      select 1 from public.profiles p
      where (p.id = auth.uid() or p.auth_user_id = auth.uid())
        and split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
    )
  );

-- Allow authenticated users to UPDATE objects within their company path
create policy global_docs_update_company
  on storage.objects
  for update
  using (
    bucket_id = 'global_docs'
    and exists (
      select 1 from public.profiles p
      where (p.id = auth.uid() or p.auth_user_id = auth.uid())
        and split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
    )
  )
  with check (
    bucket_id = 'global_docs'
    and exists (
      select 1 from public.profiles p
      where (p.id = auth.uid() or p.auth_user_id = auth.uid())
        and split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
    )
  );

-- Allow authenticated users to DELETE objects in their company path
create policy global_docs_delete_company
  on storage.objects
  for delete
  using (
    bucket_id = 'global_docs'
    and exists (
      select 1 from public.profiles p
      where (p.id = auth.uid() or p.auth_user_id = auth.uid())
        and split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
    )
  );



