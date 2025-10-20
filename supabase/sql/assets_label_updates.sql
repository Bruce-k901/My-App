-- Asset label alignment: make label optional and remove uniqueness

-- Allow NULL labels so teams can defer naming
alter table if exists public.assets
  alter column label drop not null;

-- Remove any uniqueness/dependency on label
alter table if exists public.assets
  drop constraint if exists assets_label_key;

-- Optional: helpful index for grouping by site and type for PPM
-- create index if not exists idx_assets_site_type on public.assets(site_id, type);