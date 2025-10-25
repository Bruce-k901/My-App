-- Asset improvements: contractor assignment and model backfill

-- 1. Create assign_default_contractors RPC function
create or replace function assign_default_contractors(
  p_site_id uuid,
  p_category text
)
returns table (
  ppm_contractor_id uuid,
  reactive_contractor_id uuid,
  warranty_contractor_id uuid
) 
language plpgsql
security definer
as $$
declare
  v_region text;
begin
  -- Get the site region
  select region into v_region from sites where id = p_site_id;
  
  if v_region is null then
    return;
  end if;
  
  -- Return contractors that match the region and category
  return query
  select
    ppm.id as ppm_contractor_id,
    reactive.id as reactive_contractor_id,
    warranty.id as warranty_contractor_id
  from contractors ppm
  left join contractors reactive on 
    reactive.region = v_region 
    and reactive.category = p_category 
    and reactive.is_active = true
  left join contractors warranty on 
    warranty.region = v_region 
    and warranty.category = p_category 
    and warranty.is_active = true
  where ppm.region = v_region 
    and ppm.category = p_category 
    and ppm.is_active = true
  limit 1;
end;
$$;

-- 2. Backfill missing model values
update assets
set model = concat(brand, ' ', name)
where (model is null or model = '')
  and brand is not null
  and name is not null;

-- 3. Create get_assets_with_contractors RPC function (if not exists)
create or replace function get_assets_with_contractors(company_id uuid)
returns table (
  id uuid,
  company_id uuid,
  name text,
  brand text,
  model text,
  serial_number text,
  category text,
  site_id uuid,
  site_name text,
  ppm_contractor_id uuid,
  ppm_contractor_name text,
  reactive_contractor_id uuid,
  reactive_contractor_name text,
  warranty_contractor_id uuid,
  warranty_contractor_name text,
  install_date date,
  warranty_end date,
  last_service_date date,
  next_service_date date,
  ppm_frequency_months integer,
  ppm_status text,
  status text,
  archived boolean,
  notes text,
  document_url text
)
language sql
security definer
as $$
  select 
    a.id,
    a.company_id,
    a.name,
    a.brand,
    a.model,
    a.serial_number,
    a.category,
    a.site_id,
    s.name as site_name,
    a.ppm_contractor_id,
    ppm_c.name as ppm_contractor_name,
    a.reactive_contractor_id,
    reactive_c.name as reactive_contractor_name,
    a.warranty_contractor_id,
    warranty_c.name as warranty_contractor_name,
    a.install_date,
    a.warranty_end,
    a.last_service_date,
    a.next_service_date,
    a.ppm_frequency_months,
    a.ppm_status,
    a.status,
    a.archived,
    a.notes,
    a.document_url
  from assets a
  left join sites s on s.id = a.site_id
  left join contractors ppm_c on ppm_c.id = a.ppm_contractor_id
  left join contractors reactive_c on reactive_c.id = a.reactive_contractor_id
  left join contractors warranty_c on warranty_c.id = a.warranty_contractor_id
  where a.company_id = company_id
    and a.archived = false
  order by a.name;
$$;
