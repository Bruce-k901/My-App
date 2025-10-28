# SOP Templates Implementation Summary

## ✅ Completed Templates

### 1. Hot Drinks Template (`src/app/dashboard/sops/hot-drinks-template/page.tsx`)
**Status:** Fully implemented with all required sections

**Sections:**
- ✅ SOP Details (status, title, ref code, version, author, estimated time)
- ✅ Equipment Setup (repeatable rows for equipment, settings, notes)
- ✅ Ingredients (repeatable rows with drinks library integration)
- ✅ Recipe Steps (repeatable rows with temperature, timing, texture notes)
- ✅ Quality Checks (repeatable rows for checks and standards)
- ✅ Common Faults & Fixes (repeatable rows for fault, cause, fix)
- ✅ Presentation Standards (glassware dropdown, garnish, serving temp)
- ✅ Save functionality to `sop_entries` table

**Integration:**
- `drinks_library` (for coffee, tea ingredients)
- `glassware_library` (for presentation)
- `disposables_library` (for accessories)

---

### 2. Cold Drinks Template (`src/app/dashboard/sops/cold-drinks-template/page.tsx`)
**Status:** Fully implemented with all required sections

**Sections:**
- ✅ SOP Details
- ✅ Equipment (blender type, speed setting, other equipment)
- ✅ Ingredients (with prep notes and cost tracking)
- ✅ Recipe Steps (with blending time and order)
- ✅ Consistency Checks (repeatable rows)
- ✅ Presentation (glassware, garnish, straw, serving temp)
- ✅ Storage Information (pre-make capabilities, shelf life)
- ✅ Save functionality

**Integration:**
- `ingredients_library` (fruits, vegetables, etc.)
- `drinks_library` (base liquids, syrups)
- `glassware_library` (presentation)
- `disposables_library` (straws, etc.)

---

## ⚠️ Partially Complete Templates

### 3. Opening Procedures Template (`src/app/dashboard/sops/opening-template/page.tsx`)
**Status:** Basic structure exists (170 lines), needs full implementation

**Required Sections (per spec):**
1. Time-Based Checklist (repeatable by time slot)
   - Time slot input
   - Area/Zone dropdown
   - Tasks for each time slot
   - Responsible role dropdown
   - Estimated duration
   - Critical checkbox
   - Verification method (Text/Photo/Signature)
   - Photo upload

2. Equipment Startup Sequence
   - Equipment name
   - Startup procedure (textarea)
   - Warmup time
   - Safety checks (checklist)
   - Photo upload

3. Safety Checks (checklist)
   - Fire exits clear
   - Emergency lighting
   - First aid kit
   - Spill kits
   - Gas isolation valves
   - Electrical safety
   - Slip hazards

4. Stock Checks
   - Area dropdown
   - Items to check
   - Par levels
   - Action if low

5. Final Walkthrough Checklist
   - All areas clean
   - All equipment operational
   - Staff briefed
   - Till float correct
   - Music/ambiance set
   - Temperature logs started
   - Opening time confirmed
   - Manager sign-off

**Integration Needed:**
- `equipment_library` or `assets` table (for equipment startup)
- `sites` table (for site location)
- Photos to Supabase Storage

---

### 4. Closing Procedures Template (`src/app/dashboard/sops/closing-template/page.tsx`)
**Status:** Basic structure exists, needs full implementation

**Required Sections (per spec):**
1. Time-Based Checklist (reverse of opening)
   - Time slots from last service to lock-up
   - Area-by-area shutdown tasks
   - Responsible roles
   - Critical tasks flagged

2. Equipment Shutdown Sequence
   - Equipment name
   - Shutdown procedure
   - Cool-down time
   - Cleaning requirements
   - Power off sequence
   - Photo upload

3. Cleaning Checklist (repeatable by area)
   - Area dropdown
   - Cleaning tasks
   - Responsible role
   - Deep clean required
   - Verification (Text/Photo/Signature)

4. Security Checks
   - All customers left
   - All doors locked
   - Windows secured
   - Alarm set
   - Lights off
   - Gas valves closed
   - Tills closed
   - Safe locked
   - Keys secured

5. Stock & Waste
   - Area
   - Stock rotation completed
   - Waste logged
   - Spoilage recorded
   - Food waste disposed
   - Recycling sorted

6. Cash Handling
   - Till counted
   - Float removed
   - Cash reconciliation
   - Variances noted
   - Safe drop completed
   - Manager sign-off

7. Next Day Prep
   - Prep list
   - Special events/bookings
   - Staff rota
   - Delivery schedule

8. Final Walkthrough & Sign-Off
   - Manager final check
   - All tasks completed
   - Issues to escalate
   - Closing time logged
   - Manager signature + timestamp

**Integration Needed:**
- `equipment_library` or `assets` table
- `sites` table
- Photos to Supabase Storage

---

## 📋 SQL Libraries Created

### ✅ Glassware Library
- Table: `glassware_library`
- 33+ items seeded
- Categories: Beer, Wine, Cocktails, Hot Beverages, Soft Drinks, Spirits, Specialist
- RLS policies in place

### ✅ Packaging Library
- Table: `packaging_library`
- 43+ items seeded
- Categories: Food Containers, Drink Cups, Bags, Cutlery, Boxes, Lids, Napkins, Straws
- RLS policies in place

### ✅ Serving Equipment Library
- Table: `serving_equipment_library`
- 25+ items seeded
- Categories: Platters, Bowls, Baskets, Trays, Stands, Boards, Dishes, Holders
- RLS policies in place

---

## 🎯 Next Steps

1. **Run SQL Migrations**
   - Execute `supabase/sql/create_additional_libraries.sql` in Supabase
   - Execute `supabase/sql/seed_additional_libraries.sql` (update company_id placeholders)

2. **Complete Opening Template**
   - Build time-based checklist sections
   - Add equipment startup sequence
   - Add safety checks checklist
   - Add stock checks functionality
   - Add final walkthrough with sign-off

3. **Complete Closing Template**
   - Build time-based shutdown checklist
   - Add equipment shutdown sequence
   - Add cleaning checklist by area
   - Add security checks
   - Add stock & waste tracking
   - Add cash handling
   - Add next day prep
   - Add final walkthrough with sign-off

4. **Update Existing Templates**
   - Food SOP template → add packaging_library integration
   - Service (FOH) template → add serving_equipment_library integration
   - Drinks template → add glassware_library integration

5. **Test All Integrations**
   - Verify library dropdowns populate correctly
   - Test save functionality
   - Test photo uploads
   - Test sign-off workflow

---

## 📝 Notes

- All templates use `useCallback` to prevent loading loops
- All templates have proper error handling
- Photo upload functionality needs to be implemented for all templates
- Sign-off workflow for Opening/Closing needs date/time stamping
- Manager approval flow needs to be built

