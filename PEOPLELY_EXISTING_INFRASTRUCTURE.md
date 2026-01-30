# Peoplely - Existing Infrastructure Audit

## ✅ Already Built & Ready to Use

### 1. **Core User & Organization Infrastructure**

#### Profiles Table (Extended)
**Location:** `supabase/migrations/20250206000001_add_training_certificates_to_profiles.sql`

**Existing Fields:**
- ✅ `id`, `auth_user_id`, `full_name`, `email`
- ✅ `app_role` (admin, owner, manager, staff)
- ✅ `company_id`, `site_id`, `home_site`
- ✅ `position_title`, `boh_foh`, `pin_code`, `phone_number`
- ✅ `status`, `is_primary_gm`, `avatar_url`, `last_login`
- ✅ **Training certificates** (already added):
  - `food_safety_level`, `food_safety_expiry_date`
  - `h_and_s_level`, `h_and_s_expiry_date`
  - `fire_marshal_trained`, `fire_marshal_expiry_date`
  - `first_aid_trained`, `first_aid_expiry_date`
  - `cossh_trained`, `cossh_expiry_date`

**What to ADD (from brief):**
- Personal info: `date_of_birth`, `gender`, `nationality`, address fields
- Emergency contacts (JSONB)
- Employment: `employee_number`, `start_date`, `probation_end_date`, `contract_type`, `contracted_hours`, `hourly_rate`, `salary`, `pay_frequency`, `department`, `reports_to`
- Compliance: `national_insurance_number`, `right_to_work_status`, `right_to_work_expiry`, `dbs_status`, `dbs_certificate_number`, `dbs_check_date`
- Banking: `bank_name`, `bank_account_name`, `bank_account_number`, `bank_sort_code`
- Leave: `annual_leave_allowance`, `leave_year_start`
- Offboarding: `termination_date`, `termination_reason`, `exit_interview_completed`

#### Companies & Sites Tables
**Status:** ✅ Fully built with RLS policies

**Companies:**
- `id`, `name`, `settings` (JSONB), `created_at`, `updated_at`
- RLS policies for company-level access

**Sites:**
- `id`, `company_id`, `name`, `address`, `location_type`, etc.
- RLS policies for site-level access

**What to ADD:**
- Companies: `holiday_year_start`, `default_leave_allowance`, `working_time_rules` (JSONB)
- Sites: `operating_hours`, `staffing_requirements` (JSONB)

#### Module Access Control
**Location:** `supabase/migrations/20250217000001_create_company_modules.sql`

**Structure:**
```sql
company_modules (
  id, company_id, module ('checkly' | 'stockly' | 'peoply'),
  is_enabled, enabled_at, settings (JSONB)
)
```

**Status:** ✅ Ready to use! Just need to:
- Update CHECK constraint to include 'peoplely' (currently has 'peoply' typo)
- Seed existing companies with `peoplely: true` if needed

### 2. **Staff Attendance System**

**Location:** `supabase/migrations/20250220000001_create_staff_attendance.sql`

**Complete Table Structure:**
```sql
staff_attendance (
  id, user_id, company_id, site_id,
  clock_in_time, clock_out_time,
  shift_status ('on_shift' | 'off_shift'),
  total_hours (auto-calculated),
  shift_notes,
  created_at, updated_at
)
```

**Features Already Built:**
- ✅ Clock in/out functionality
- ✅ Auto-calculation of total hours
- ✅ Prevention of duplicate active shifts
- ✅ Helper views: `active_shifts`, `todays_attendance`
- ✅ Helper functions: `get_active_shift()`, `get_staff_on_shift_at_site()`, `auto_clock_out_old_shifts()`
- ✅ Complete RLS policies (own records + company-wide for managers)
- ✅ Integration with notification system

**What You Can Reuse:**
- The entire attendance table - no changes needed!
- All helper functions and views
- RLS policies (already secure)

**Frontend Integration:**
- ✅ `src/app/dashboard/logs/attendance/page.tsx` - Attendance logs page exists
- ✅ `src/lib/notifications/attendance.ts` - Notification integration
- ✅ `src/lib/supabase.ts` - Has attendance redirect logic

### 3. **Authentication & Authorization**

**AppContext:**
- ✅ `src/context/AppContext.tsx` - Complete user/profile/company management
- ✅ Provides: `user`, `profile`, `company`, `siteId`, `role`, `loading`
- ✅ Handles auth state changes, profile fetching, company switching

**RLS Patterns:**
- ✅ Company-level isolation (all tables)
- ✅ Site-level filtering
- ✅ Role-based access (admin, manager, staff)
- ✅ Consistent pattern across all tables

**What You Can Reuse:**
- All RLS patterns - just copy the policy structure
- AppContext for user/profile data
- Auth flow (no changes needed)

### 4. **Training Certificate Integration**

**Already Built:**
- ✅ Training fields in profiles table
- ✅ Function: `create_training_certificate_renewal_tasks()` - Auto-creates tasks 1 month before expiry
- ✅ Indexes on expiry dates for efficient querying

**What You Can Reuse:**
- The training fields (food_safety, h_and_s, fire_marshal, first_aid, cossh)
- The renewal task function as a template for other expiry alerts
- The expiry date indexes

**Note:** The brief's Phase 5 (Training & Skills Matrix) will extend this with:
- `training_courses` table (catalog)
- `training_completions` table (records)
- `skills` and `staff_skills` tables
- Sync function to update profile fields from completions

### 5. **Profile Settings**

**Location:** `supabase/sql/profile_settings.sql`

**Table:**
```sql
profile_settings (
  user_id (PK), company_id, site_id,
  receive_email_digests, include_incidents, include_tasks,
  notify_temperature_warnings, sound_vibration
)
```

**What You Can Reuse:**
- The pattern for user preferences
- RLS policies (own settings + company read access)
- Can extend with Peoplely-specific settings

---

## ⚠️ Needs Extension (Add Columns, Don't Recreate)

### Profiles Table
**Action:** Run migration to ADD new columns (don't recreate table)

**Fields to Add:**
- Personal information (DOB, gender, nationality, address)
- Emergency contacts (JSONB)
- Employment details (employee_number, start_date, contract_type, etc.)
- Compliance (NI number, RTW, DBS)
- Banking details
- Leave allowances
- Offboarding fields

**Migration:** `001_extend_profiles.sql` (from brief Section 4.1)

### Companies Table
**Action:** ADD columns for HR settings

**Fields to Add:**
- `holiday_year_start DATE`
- `default_leave_allowance DECIMAL(5,2) DEFAULT 28`
- `working_time_rules JSONB` (for UK Working Time Directive)

### Sites Table
**Action:** ADD columns for scheduling

**Fields to Add:**
- `operating_hours JSONB` (opening/closing times per day)
- `staffing_requirements JSONB` (minimum coverage rules)

---

## ❌ Not Yet Built (Create New)

### Phase 1: Foundation
- ❌ `employee_documents` table
- ❌ Staff Directory page (`/dashboard/people/directory`)
- ❌ Employee Profile Detail page (`/dashboard/people/[id]`)

### Phase 2: Leave Management
- ❌ `leave_types` table
- ❌ `leave_requests` table
- ❌ `leave_balances` table
- ❌ `leave_adjustments` table
- ❌ `public_holidays` table
- ❌ `leave_blackout_dates` table
- ❌ Leave calendar UI
- ❌ Leave request form

### Phase 3: Scheduling
- ❌ `shift_patterns` table
- ❌ `scheduled_shifts` table
- ❌ `staff_availability` table
- ❌ `shift_swap_requests` table
- ❌ `shift_templates` table
- ❌ `staffing_requirements` table
- ❌ Rota grid UI
- ❌ Shift editor

### Phase 4: Onboarding
- ❌ `onboarding_templates` table
- ❌ `onboarding_task_templates` table
- ❌ `onboarding_progress` table
- ❌ `onboarding_task_progress` table
- ❌ `initialize_onboarding()` function
- ❌ Onboarding wizard UI

### Phase 5: Training & Skills (Extends existing)
- ❌ `training_courses` table
- ❌ `training_completions` table
- ❌ `skills` table
- ❌ `staff_skills` table
- ❌ `training_requests` table
- ❌ `training_matrix` view
- ❌ `sync_training_to_profile()` function
- ❌ Training matrix UI

### Phase 6: Performance
- ❌ `review_templates` table
- ❌ `reviews` table
- ❌ `review_responses` table
- ❌ `objectives` table
- ❌ `one_to_ones` table
- ❌ `feedback` table

### Phase 7: Offboarding
- ❌ `offboarding_checklists` table
- ❌ `exit_interviews` table
- ❌ `equipment_returns` table

---

## 🔄 Integration Points

### 1. **Training → Tasks Integration**
**Already Built:**
- ✅ `create_training_certificate_renewal_tasks()` function
- ✅ Creates tasks automatically when certificates expire

**Can Extend:**
- Link `training_completions` → `tasks` for mandatory training
- Create tasks when training is overdue

### 2. **Attendance → Notifications**
**Already Built:**
- ✅ `is_user_clocked_in()` function (checks `staff_attendance`)
- ✅ `get_managers_on_shift()` function
- ✅ Notification system uses attendance data

**Can Extend:**
- Leave requests → notify managers
- Shift swaps → notify affected staff
- Onboarding tasks → notify assignees

### 3. **Module Toggle**
**Already Built:**
- ✅ `company_modules` table
- ✅ Pattern for checking module access

**Implementation:**
```typescript
// Check if Peoplely is enabled
const { data: modules } = await supabase
  .from('company_modules')
  .select('is_enabled')
  .eq('company_id', companyId)
  .eq('module', 'peoplely')
  .single();

if (modules?.is_enabled) {
  // Show Peoplely navigation
}
```

---

## 📋 Quick Start Checklist

### Step 1: Fix Module Name
- [ ] Update `company_modules` CHECK constraint: `'peoply'` → `'peoplely'`
- [ ] Seed existing companies with `peoplely: true` if needed

### Step 2: Extend Profiles
- [ ] Run `001_extend_profiles.sql` migration
- [ ] Update TypeScript types in `src/types/index.ts`
- [ ] Update `src/types/supabase.ts` (regenerate from Supabase)

### Step 3: Build Foundation
- [ ] Create `employee_documents` table
- [ ] Build Staff Directory page
- [ ] Build Employee Profile Detail page

### Step 4: Continue with Phases
- [ ] Phase 2: Leave Management
- [ ] Phase 3: Scheduling
- [ ] Phase 4: Onboarding
- [ ] Phase 5: Training & Skills
- [ ] Phase 6: Performance
- [ ] Phase 7: Offboarding

---

## 🎯 Key Takeaways

1. **Attendance System:** ✅ 100% ready - no changes needed
2. **Profiles Table:** ⚠️ Needs extension (add columns, don't recreate)
3. **Companies/Sites:** ⚠️ Needs minor extensions for HR settings
4. **Module Access:** ✅ Ready - just fix typo and enable
5. **Training Fields:** ✅ Already in profiles - Phase 5 will extend
6. **RLS Patterns:** ✅ Copy existing patterns for new tables
7. **AppContext:** ✅ Ready to use for user/profile data

**Estimated Reuse:** ~40% of infrastructure already exists!

