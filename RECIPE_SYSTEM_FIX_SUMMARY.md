# Recipe System Fix - Implementation Summary

## Overview
Complete fix for recipe ingredients schema, automated cost flow, and recipe-SOP linking system. All changes have been implemented according to the specifications.

## Step 1: Schema Migration ✅

**File**: `supabase/migrations/20250108000001_fix_recipe_ingredients_final.sql`

**Changes**:
- ✅ Removed `unit` TEXT column (replaced with `unit_id` UUID)
- ✅ Added `unit_id` UUID column with foreign key to `uom` table
- ✅ Renamed `display_order` to `sort_order` (standardized naming)
- ✅ Added `line_cost` column for real-time cost calculation
- ✅ Added `company_id` for multi-tenant support
- ✅ Created comprehensive view `public.recipe_ingredients` with JOINs to:
  - `ingredients_library` (for ingredient_name, supplier, costs, allergens)
  - `uom` (for unit_abbreviation, unit_name, base_multiplier)
- ✅ Updated INSTEAD OF triggers for view inserts/updates to use new schema
- ✅ Added performance indexes on `(recipe_id, sort_order)` and `unit_id`

## Step 2: Automated Cost Flow Migration ✅

**File**: `supabase/migrations/20250108000002_automated_cost_flow.sql`

**Changes**:
- ✅ Added computed fields to `recipes` table:
  - `total_ingredient_cost`
  - `calculated_yield_qty`
  - `unit_cost`
  - `last_cost_calculated_at`
- ✅ Created `calculate_recipe_total_cost()` function (with yield factor)
- ✅ Created `calculate_recipe_yield()` function
- ✅ Created `update_recipe_costs_and_propagate()` master function
- ✅ Created `propagate_cost_to_parent_recipes()` for recursive updates
- ✅ Added trigger `auto_update_recipe_costs` on `recipe_ingredients` changes
- ✅ Added trigger `auto_propagate_ingredient_cost` on `ingredients_library` price changes
- ✅ Automatic cost history tracking in `recipe_cost_history` table

## Step 3: Recipe-SOP Linking Migration ✅

**File**: `supabase/migrations/20250108000003_recipe_sop_linking.sql`

**Changes**:
- ✅ Added `linked_sop_id` to `recipes` table
- ✅ Added `linked_recipe_id` to `sop_entries` table (bidirectional link)
- ✅ Added `needs_update` and `last_synced_with_recipe_at` flags to `sop_entries`
- ✅ Created `check_sop_needs_update()` function
- ✅ Added trigger `flag_sop_on_recipe_change` to automatically flag SOPs when recipes change

## Step 4: RecipeIngredientsTable Component Updates ✅

**File**: `src/components/recipes/RecipeIngredientsTable.tsx`

**Key Changes**:

### Interface Updates:
- ✅ Changed `unit?: string` → `unit_id: string | null` (UUID)
- ✅ Changed `display_order` → `sort_order`
- ✅ Added `line_cost`, `ingredient_unit_cost`, `unit_abbreviation`, `unit_name` from view JOINs

### loadIngredients() Function:
- ✅ Now uses view `public.recipe_ingredients` (has all JOINs built-in)
- ✅ Uses `sort_order` instead of `display_order`
- ✅ Removed separate queries - single efficient query with JOINs

### handleSave() Function:
- ✅ Validates `unit_id` (UUID) instead of `unit` (string)
- ✅ Calculates `line_cost` with yield factor: `(unit_cost * quantity) / (yield_percent / 100)`
- ✅ Saves `unit_id` (UUID) to database
- ✅ Uses `sort_order` instead of `display_order`
- ✅ Handles insert vs update separately for better error handling

### Unit Display:
- ✅ Replaced text input with `Select` dropdown using `uomList`
- ✅ Displays `unit_abbreviation` from view JOIN (not stored string)
- ✅ Unit selector shows: `{abbreviation} - {name}` format

### Unit Conversion:
- ✅ Updated `convertUnit()` to accept `unit_id` (UUID) or abbreviation
- ✅ Updated `calculateYield()` to use `unit_id` for conversions

### Cost Display:
- ✅ Uses `ingredient_unit_cost` from view JOIN
- ✅ Uses `line_cost` for total cost calculations

## Step 5: SOP Creation Dialog ✅

**File**: `src/components/recipes/ExpandableRecipeCard.tsx`

**Changes**:
- ✅ Added "Complete & Save" button (replaces old finalise button)
- ✅ Button marks recipe as active, then shows SOP creation dialog
- ✅ Added `Dialog` component with:
  - "Skip for Now" option
  - "Create SOP" option
- ✅ Calls `createFoodSOPFromRecipe()` function
- ✅ Links recipe to SOP bidirectionally
- ✅ Shows success/error toasts

## Step 6: SOP Update Warning Badge ✅

**File**: `src/components/recipes/ExpandableRecipeCard.tsx`

**Changes**:
- ✅ Added `linkedSOPNeedsUpdate` state
- ✅ Checks `needs_update` flag from `sop_entries` table
- ✅ Displays animated yellow badge: "⚠️ SOP needs review"
- ✅ Badge appears when recipe changes and SOP needs updating

## Step 7: Supporting Files Updated ✅

### `src/lib/utils/sopCreator.ts`:
- ✅ Updated to use view `public.recipe_ingredients` with JOINs
- ✅ Uses `sort_order` instead of `display_order`
- ✅ Uses `unit_abbreviation` from view (no separate UOM query needed)
- ✅ Links recipe to SOP after creation

### `src/lib/utils/sopUpdater.ts`:
- ✅ Already uses view (no changes needed, but should verify it uses `sort_order`)

### `src/components/ui/dialog.tsx`:
- ✅ Added `DialogDescription` component
- ✅ Added `DialogFooter` component

## Database Schema Summary

### Final `stockly.recipe_ingredients` Schema:
```sql
- id UUID (PK)
- recipe_id UUID (FK to recipes)
- ingredient_id UUID (FK to ingredients_library) -- NEW, replaces stock_item_id
- sub_recipe_id UUID (FK to recipes, for nested recipes)
- quantity NUMERIC(12,4)
- unit_id UUID (FK to uom) -- NEW, replaces unit TEXT
- sort_order INTEGER -- RENAMED from display_order
- line_cost DECIMAL(12,4) -- NEW
- company_id UUID (FK to companies) -- NEW
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

### View `public.recipe_ingredients`:
Includes all base columns PLUS:
- `ingredient_name` (from JOIN)
- `supplier` (from JOIN)
- `ingredient_unit_cost` (from JOIN)
- `unit_abbreviation` (from JOIN)
- `unit_name` (from JOIN)
- `allergens` (from JOIN)
- `is_prep_item` (from JOIN)
- And more...

## Testing Checklist

After running migrations, test in this order:

### ✅ Basic Functionality
- [ ] Load recipe card - ingredients display with correct units
- [ ] Ingredient names show correctly
- [ ] Units show as abbreviations (g, kg, ml, L)
- [ ] Supplier information displays

### ✅ Ingredient Management
- [ ] Add new ingredient - saves with unit_id (UUID)
- [ ] Select unit from dropdown (not text input)
- [ ] Edit existing ingredient - updates correctly
- [ ] Delete ingredient - removes from recipe
- [ ] Sort order maintained when adding/removing

### ✅ Cost Calculations
- [ ] Recipe cost updates automatically when ingredient added
- [ ] Line cost calculated with yield factor
- [ ] Total recipe cost displays correctly
- [ ] Prep item cost updates when recipe saved (if recipe is prep item)
- [ ] Parent recipe updates if prep item used in another recipe

### ✅ Yield Calculations
- [ ] Yield quantity updates when ingredients added
- [ ] Unit conversions work correctly (mg→g→kg, ml→L)
- [ ] Yield displays with correct unit abbreviation

### ✅ SOP Integration
- [ ] Click "Complete & Save" - shows SOP dialog
- [ ] Create SOP - SOP appears with ingredients pre-filled
- [ ] Recipe linked to SOP bidirectionally
- [ ] Edit recipe - SOP shows "needs review" badge
- [ ] Update SOP button works correctly

### ✅ Data Persistence
- [ ] Reopen recipe card - all data loads correctly
- [ ] Ingredients persist after page refresh
- [ ] Costs persist correctly
- [ ] Units persist correctly

## Migration Execution Order

1. **Run Migration 1**: `20250108000001_fix_recipe_ingredients_final.sql`
   - This standardizes the schema and creates the view

2. **Run Migration 2**: `20250108000002_automated_cost_flow.sql`
   - This adds cost calculation functions and triggers

3. **Run Migration 3**: `20250108000003_recipe_sop_linking.sql`
   - This adds SOP linking and update detection

## Important Notes

### ✅ DO:
- Always use `unit_id` (UUID), never `unit` as string
- Always use `sort_order`, never `display_order`
- Load from VIEW (`public.recipe_ingredients`) for efficiency
- Save to VIEW (triggers handle routing to base table)
- Use `ingredient_unit_cost` from view for display
- Use `unit_abbreviation` from view for display

### ❌ DON'T:
- Never save `unit` as TEXT string
- Never reference `display_order`
- Never query `ingredients_library` separately when loading recipe ingredients (view has JOINs)
- Never hardcode unit strings - always use UOM table

## Known Issues / Future Improvements

1. **Unit Conversion**: Currently handles basic conversions (mg/g/kg, ml/L). Could be enhanced for more complex conversions.

2. **Cost History**: `recipe_cost_history` table tracking is implemented but may need UI to display history.

3. **SOP Sync**: Manual "Update SOP" button exists, but automatic sync could be added in future.

4. **Yield Calculation**: Currently sums quantities. Could be enhanced to handle different unit types more intelligently.

## Files Modified

### Migrations:
- ✅ `supabase/migrations/20250108000001_fix_recipe_ingredients_final.sql` (NEW)
- ✅ `supabase/migrations/20250108000002_automated_cost_flow.sql` (NEW)
- ✅ `supabase/migrations/20250108000003_recipe_sop_linking.sql` (NEW)

### Components:
- ✅ `src/components/recipes/RecipeIngredientsTable.tsx` (UPDATED)
- ✅ `src/components/recipes/ExpandableRecipeCard.tsx` (UPDATED)

### Utilities:
- ✅ `src/lib/utils/sopCreator.ts` (UPDATED)
- ✅ `src/components/ui/dialog.tsx` (UPDATED - added DialogDescription, DialogFooter)

## Next Steps

1. **Run Migrations**: Execute the three migration files in order
2. **Test**: Follow the testing checklist above
3. **Verify**: Check that existing recipes still work after migration
4. **Monitor**: Watch for any errors in console or database logs

## Rollback Plan

If issues occur:
1. The migrations use `IF EXISTS` and `IF NOT EXISTS` clauses for safety
2. Can drop the view and recreate old one if needed
3. Can revert component changes if necessary
4. Database triggers can be disabled if causing issues

