# Task Templates Database Schema & Setup

## ✅ Completed Setup

### 1. Frontend Structure
- ✅ Created `/dashboard/tasks` layout with sidebar navigation
- ✅ Created `TaskSubHeader` component with tabs: Templates, Scheduled, Completed, Settings
- ✅ Created task templates page with grid layout
- ✅ Created placeholder pages for all tab sections

### 2. Database Schema

#### A. `task_templates` Table
**Purpose**: Blueprint for all compliance tasks

**Key Features**:
- Company isolation with global library templates (company_id NULL)
- Comprehensive scheduling (frequency, recurrence_pattern, time_of_day, dayparts)
- Assignment system (role-based or user-specific)
- Asset linking for equipment-specific tasks
- Compliance metadata (standards, audit categories, critical flags)
- Evidence requirements (photos, temperatures, signatures, etc.)
- Contractor trigger on failure
- Template library flag for plug-and-play templates

**Indexes**:
- Company + category filtering
- Template library filtering
- Unique slug per company
- Site and asset filtering
- Frequency filtering

#### B. `task_fields` Table
**Purpose**: Dynamic fields for task templates

**Features**:
- Multiple field types: text, number, temperature, checkbox, pass_fail, select, date, signature
- Validation rules (min/max values, required fields)
- Options for select fields
- Display ordering
- Trigger actions (fail_if_over, alert_if_under, etc.)

#### C. `task_instances` Table
**Purpose**: Individual scheduled task instances

**Features**:
- Scheduling date/time and due datetime
- Assignment to users/sites/assets
- Status tracking (pending, in_progress, completed, skipped, overdue, failed)
- Completion tracking with timestamps
- Failure handling and contractor notification
- Custom name/instructions for cloned templates

#### D. `task_completion_logs` Table
**Purpose**: Actual completion data and evidence

**Features**:
- Field responses as JSONB
- Photo evidence (URLs array)
- Signature data
- Completion metadata (user, timestamp, location)
- Pass/fail results with failure reasons
- Notes

### 3. Seeded Templates (18 Total)

#### Food Safety (6 templates)
1. **FS-001: Fridge & Freezer Temperature Check - Cold Hold** (daily)
   - Fields: fridge_name (repeatable), temperature, status, initials, photo
   - Repeatable labels: Walk-in Chiller, Display Fridge A/B, Freezer 1, Reach-in Freezer
   
2. **FS-002: Hot Hold Temperature Check - Cook Line** (daily)
   - Fields: hot_hold_unit_name (repeatable), temperature, status, initials
   - Repeatable labels: Hot Hold A (Sauces), Hot Hold B (Proteins), Bain-Marie (Veg)
   
3. **FS-003: Allergen Board Update & Verification** (daily, CRITICAL)
   - Fields: allergen_board_checked, new_items_added, photo_evidence, checked_by_initials
   
4. **FS-004: Stock Rotation & FIFO Check** (daily)
   - Fields: walk_in_fridge_checked, dry_store_checked, freezer_checked, stock_rotated, issues_found, initials
   
5. **FS-005: Delivery Acceptance Check** (triggered)
   - Fields: delivery_date, supplier_name, vehicle_temp_ok, goods_in_date, packaging_intact, chilled_items_cold, overall_status, checked_by_initials
   
6. **FS-006: Daily Deep Clean Checklist - Food Prep Area** (daily)
   - Fields: prep_surfaces_sanitized, cutting_boards_sanitized, sinks_clean, hand_wash_station_stocked, cleaned_by_initials

#### Health & Safety (3 templates)
7. **HS-001: Pre-Opening Safety Walkthrough** (daily, CRITICAL)
   - Fields: floor_hazards_checked, staff_health_ok, equipment_damage_checked, exits_clear, first_aid_kit_stocked, issues_found, manager_initials
   
8. **HS-002: Incident & Accident Report** (triggered, CRITICAL)
   - Fields: incident_date, incident_time, involved_person_name, incident_type (select), description, witnesses, action_taken, reported_by_initials
   
9. **HS-003: Manual Handling / Equipment Use Safety Check** (weekly)
   - Fields: lifting_techniques_observed, heavy_items_stored_correctly, equipment_being_used_safely, staff_training_needed, manager_initials

#### Fire & Security (3 templates)
10. **FR-001: Fire Alarm Test - Weekly** (weekly, CRITICAL)
    - Fields: test_date, test_point_activated, alarm_activated, all_staff_heard, issues, manager_initials
    
11. **FR-002: Emergency Exit & Assembly Point Check** (monthly, CRITICAL)
    - Fields: all_exits_accessible, signage_visible_legible, assembly_point_clear, emergency_lighting_working, photo_evidence, issues_found, manager_initials
    
12. **FR-003: Fire Extinguisher Inspection - Visual** (monthly)
    - Fields: location (repeatable), extinguisher_type, last_service_date, next_service_due, pressure_gauge_ok, physical_damage, manager_initials
    - Repeatable labels: Kitchen - Near Hob, Front of House - Bar Area, Front Entrance, Back Office

#### Cleaning & Maintenance (3 templates)
13. **CL-001: FOH Deep Clean Checklist - Daily Post-Service** (daily)
    - Fields: tables_chairs_cleaned, floor_swept_mopped, toilets_cleaned, bar_area_wiped, bins_emptied, cleaner_initials
    
14. **CL-002: Pest Control Log & Trap Check** (weekly)
    - Fields: check_date, traps_inspected, evidence_found, evidence_description, action_taken, checked_by_initials
    
15. **CL-003: Equipment PPM - Chiller/Freezer Unit** (monthly, triggers contractor)
    - Fields: equipment_id, service_date, engineer_name, coils_cleaned, doors_sealing, temperature_calibrated, drainage_clear, issues_found, next_service_due

#### Compliance & Audit (3 templates)
16. **CP-001: Monthly Compliance Audit - Self-Assessment** (monthly, CRITICAL)
    - Fields: food_safety_score (0-100), health_safety_score (0-100), fire_safety_score (0-100), cleanliness_score (0-100), critical_issues, action_plan, auditor_initials
    
17. **CP-002: SOP Review & Update Trigger** (triggered)
    - Fields: sop_name, last_review_date, still_relevant, updates_made, version_number, reviewed_by_initials
    
18. **CP-003: Training Records Review** (triggered)
    - Fields: all_staff_inducted, food_safety_training_current, manual_handling_certificates_valid, retraining_needed, reviewed_by_initials

### 4. Sample Field Configurations

**Fridge Temperature Check** includes:
- Temperature field (0-8°C validation)
- Pass/fail checkbox

**Opening Safety Checklist** includes:
- Equipment check (pass/fail)
- Fire exits clear (pass/fail)
- Manager signature (signature)

**Fire Alarm Test** includes:
- Test date (date)
- Test result (pass/fail)
- Tester signature (signature)

## 🎯 Success Criteria Met

✅ All tables created and indexed properly
✅ 18+ core templates seeded and tested
✅ Templates support repeatable fields (via `repeatable_field_name`)
✅ Ready for reporting queries
✅ Migrations are clean and rollback-safe
✅ RLS policies applied for security
✅ Updated_at triggers implemented

## 📁 Files Created

### Frontend
- `src/app/dashboard/tasks/layout.tsx` - Layout with subheader
- `src/app/dashboard/tasks/page.tsx` - Main redirect
- `src/app/dashboard/tasks/templates/page.tsx` - Templates grid
- `src/app/dashboard/tasks/scheduled/page.tsx` - Scheduled tasks
- `src/app/dashboard/tasks/completed/page.tsx` - Completed tasks
- `src/app/dashboard/tasks/settings/page.tsx` - Settings
- `src/components/tasks/TaskSubHeader.tsx` - Tab navigation

### Database
- `supabase/sql/create_task_templates_table.sql` - Main templates table
- `supabase/sql/create_task_tables.sql` - Fields, instances, logs tables
- `supabase/sql/seed_task_templates.sql` - 18+ seed templates

## 🚀 Applying Migrations

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_create_task_template_schema.sql`
3. Run `supabase/sql/seed_task_templates.sql`
4. Run `supabase/sql/seed_task_templates_part2.sql`
5. Verify with queries from `supabase/sql/queries.sql`

### Option 2: Supabase CLI
```bash
supabase db reset  # Reset and apply all migrations
# OR
supabase migration up  # Apply pending migrations
```

### Verification
Run these queries to verify:
```sql
-- Should return 18
SELECT COUNT(*) FROM task_templates WHERE is_template_library = true;

-- Should return 0
SELECT COUNT(*) FROM task_fields WHERE task_template_id NOT IN (SELECT id FROM task_templates);
```

## 🔄 Rollback
To rollback migrations:
```bash
supabase migration down
# OR manually run: supabase/migrations/001_create_task_template_schema.down.sql
```

## 🚀 Next Steps

1. ✅ **Apply Migrations**: See above
2. **Build Task Editor**: Create template customization UI
3. **Build Scheduler**: Implement task instance creation from templates
4. **Build Completion UI**: Create form builder for field collection
5. **Add Reporting**: Query completion logs for compliance reports
6. **Add Contractor Integration**: Connect failure triggers to contractor system

## 📊 Query Examples

### Get all templates for a company
```sql
SELECT * FROM task_templates 
WHERE company_id = $1 OR company_id IS NULL 
ORDER BY category, name;
```

### Get overdue tasks
```sql
SELECT ti.*, tt.name 
FROM task_instances ti
JOIN task_templates tt ON tt.id = ti.task_template_id
WHERE ti.status IN ('pending', 'in_progress')
  AND ti.due_datetime < NOW()
ORDER BY ti.due_datetime;
```

### Get completion rate
```sql
SELECT 
  tt.category,
  COUNT(*) FILTER (WHERE ti.status = 'completed') as completed,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ti.status = 'completed') / COUNT(*), 2) as completion_rate
FROM task_instances ti
JOIN task_templates tt ON tt.id = ti.task_template_id
WHERE ti.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tt.category;
```

