-- Migration: Add missing columns and unique constraints for SFBB compliance system

-- Add missing columns to existing checklist_templates table
DO $$ 
BEGIN
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'company_id') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN company_id uuid references public.companies(id) on delete cascade;
    END IF;
    
    -- Add site_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'site_id') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN site_id uuid references public.sites(id) on delete set null;
    END IF;
    
    -- Add day_part column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'day_part') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN day_part text;
    END IF;
    
    -- Add role_required column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'role_required') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN role_required text;
    END IF;
    
    -- Add form_schema column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'form_schema') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN form_schema jsonb;
    END IF;
    
    -- Add active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'active') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN active boolean not null default true;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' AND column_name = 'updated_at') THEN
        ALTER TABLE public.checklist_templates 
        ADD COLUMN updated_at timestamptz not null default now();
    END IF;
END $$;

-- Ensure site_checklists table exists with correct structure
CREATE TABLE IF NOT EXISTS public.site_checklists (
  id uuid primary key default gen_random_uuid(),
  site_id uuid null references public.sites(id) on delete cascade,
  checklist_template_id uuid null references public.checklist_templates(id) on delete cascade,
  name text null,
  day_part text null,
  frequency text null,
  active boolean null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drop existing constraints if they exist
DO $$ 
BEGIN
    ALTER TABLE public.site_checklists 
    DROP CONSTRAINT IF EXISTS site_checklists_site_template_unique;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE public.site_checklists 
    DROP CONSTRAINT IF EXISTS site_checklists_site_template_daypart_unique;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add unique constraint on site_id, checklist_template_id, and day_part
-- This prevents duplicate entries for the same template, site, and day part
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'site_checklists_site_template_daypart_unique'
    ) THEN
        ALTER TABLE public.site_checklists
        ADD CONSTRAINT site_checklists_site_template_daypart_unique 
        UNIQUE (site_id, checklist_template_id, day_part);
    END IF;
END $$;

-- Also add unique constraint to checklist_templates for upsert
DO $$ 
BEGIN
    ALTER TABLE public.checklist_templates
    DROP CONSTRAINT IF EXISTS checklist_templates_company_site_name_unique;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'checklist_templates_company_site_name_unique'
    ) THEN
        ALTER TABLE public.checklist_templates
        ADD CONSTRAINT checklist_templates_company_site_name_unique
        UNIQUE (company_id, site_id, name);
    END IF;
END $$;
