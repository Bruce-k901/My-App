-- RPC function to get assets with contractor names joined
-- This function returns all asset fields plus contractor names for display
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
