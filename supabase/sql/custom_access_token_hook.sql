-- Custom Access Token Hook
-- This function runs before a JWT token is issued and adds profile data to the token
-- This ensures that app_metadata contains role and company information

create or replace function public.custom_access_token(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_profile record;
begin
  -- Get the claims from the event
  claims := event->'claims';
  
  -- Get user profile data
  select 
    p.company_id,
    p.site_id,
    p.app_role,
    p.position_title,
    p.full_name
  into user_profile
  from public.profiles p
  where p.id = (event->'user_id')::uuid;
  
  -- If profile exists, add the data to app_metadata
  if found then
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      coalesce(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object(
        'company_id', user_profile.company_id,
        'role', user_profile.app_role,
        'position_title', user_profile.position_title
      )
    );
    
    -- Also add to user_metadata for additional context
    claims := jsonb_set(
      claims,
      '{user_metadata}',
      coalesce(claims->'user_metadata', '{}'::jsonb) || jsonb_build_object(
        'site_id', user_profile.site_id,
        'full_name', user_profile.full_name
      )
    );
  end if;
  
  -- Return the modified event with updated claims
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant necessary permissions
grant execute on function public.custom_access_token(jsonb) to supabase_auth_admin;
grant execute on function public.custom_access_token(jsonb) to postgres;
grant execute on function public.custom_access_token(jsonb) to anon;
grant execute on function public.custom_access_token(jsonb) to authenticated;