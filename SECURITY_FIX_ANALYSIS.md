# Security Issues Analysis & Fix Plan

## Summary of Issues

### 1. RLS Disabled on Tables with Policies (2 tables)

- `assets` - Has policies but RLS not enabled ✅ **ACTIVELY USED** (120+ references)
- `conversations` - Has policies but RLS not enabled ✅ **ACTIVELY USED** (11 references)

### 2. RLS Disabled on Public Tables (9 tables)

- `contractors` ✅ **ACTIVELY USED** (37 references)
- `user_scope_assignments` ❌ **NOT FOUND IN CODEBASE** - Legacy/Unused
- `assets` ✅ **ACTIVELY USED** (duplicate of #1)
- `site_closures` ✅ **ACTIVELY USED** (found in sites page)
- `ppm_schedule_redundant` ❌ **ONLY IN TYPES FILE** - Legacy/Unused
- `troubleshooting_questions` ✅ **ACTIVELY USED** (found in CalloutModal)
- `archived_users` ✅ **ACTIVELY USED** (found in UsersTab)
- `conversations` ✅ **ACTIVELY USED** (duplicate of #1)
- `company_regions` ❌ **NOT FOUND IN CODEBASE** - Legacy/Unused
- `company_areas` ❌ **NOT FOUND IN CODEBASE** - Legacy/Unused

### 3. Security Definer Views (7 views)

- `ppm_schedule` ✅ **USED** (PPMDrawer.tsx, ppm.ts)
- `profile_settings` ✅ **USED** (settings page, calendar page)
- `site_compliance_score_latest` ✅ **USED** (compliance summary API)
- `ppm_full_schedule` ✅ **USED** (referenced in types)
- `v_current_profile` ⚠️ **NEED TO CHECK**
- `tenant_compliance_overview` ✅ **USED** (compliance summary API)
- `v_user_sites` ⚠️ **NEED TO CHECK**

### 4. RLS Policies Using user_metadata (4 policies)

- `profiles: select by company (jwt+user_metadata)` ❌ **INSECURE**
- `profiles: update by admins/managers (jwt+user_metadata)` ❌ **INSECURE**
- `profiles: self-update (jwt+user_metadata)` ❌ **INSECURE**
- `sites: select by company (jwt+user_metadata)` ❌ **INSECURE**

## Action Plan

### Phase 1: Enable RLS on Active Tables ✅

- Enable RLS on: `assets`, `conversations`, `contractors`, `site_closures`, `archived_users`, `troubleshooting_questions`
- Create RLS policies where missing

### Phase 2: Handle Legacy Tables ⚠️

- **Option A**: Drop unused tables (`ppm_schedule_redundant`, `user_scope_assignments`, `company_regions`, `company_areas`)
- **Option B**: Enable RLS on them (safer, but adds technical debt)

### Phase 3: Fix Security Definer Views ⚠️

- Recreate views without SECURITY DEFINER
- This requires getting view definitions and recreating them

### Phase 4: Fix user_metadata Policies ✅

- Drop policies using `user_metadata`
- Recreate using proper `company_id` checks from `profiles` table

## Recommendation

**For Legacy Tables**: Drop them if confirmed unused, or enable RLS if you want to keep them for now.

**For Views**: Recreate without SECURITY DEFINER - this is safer but requires manual view definition extraction.
