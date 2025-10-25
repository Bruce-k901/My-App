-- RPC function to assign default contractors based on site region and asset category
-- Updated to use the new 'type' column for contractor classification
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
  
  -- Return contractors that match the region, category, and type
  return query
  select
    ppm.id as ppm_contractor_id,
    reactive.id as reactive_contractor_id,
    warranty.id as warranty_contractor_id
  from contractors ppm
  left join contractors reactive on 
    reactive.region = v_region 
    and reactive.category = p_category 
    and lower(reactive.type) = 'reactive'
    and reactive.is_active = true
  left join contractors warranty on 
    warranty.region = v_region 
    and warranty.category = p_category 
    and lower(warranty.type) = 'warranty'
    and warranty.is_active = true
  where ppm.region = v_region 
    and ppm.category = p_category 
    and lower(ppm.type) = 'ppm'
    and ppm.is_active = true
  limit 1;
end;
$$;