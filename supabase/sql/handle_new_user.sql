-- Function to handle new user creation
-- This function is triggered whenever a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create a profile record for the new user
  insert into public.profiles (id, email, full_name, role, position_title)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'first_name' || ' ' || new.raw_user_meta_data->>'last_name', 'User'),
    'admin',
    'Administrator'
  );
  
  return new;
end;
$$;

-- Create the trigger that fires when a new user is created in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();