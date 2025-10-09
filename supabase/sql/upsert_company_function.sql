-- Create upsert_company function to prevent duplicate company inserts
create or replace function public.upsert_company(
  p_owner_id uuid,
  p_name text,
  p_country text
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.companies
    where owner_id = p_owner_id
  ) then
    insert into public.companies (name, country, owner_id)
    values (p_name, p_country, p_owner_id);
  end if;
end;
$$;