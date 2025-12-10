# Stockly Recipes System - Status Check

## ✅ What We Have

### Database Migration

- **File**: `supabase/migrations/05-stockly-recipes.sql`
- **Status**: ✅ Complete and ready to run
- **Note**: User mentioned "04-stockly-recipes.sql" but file is numbered 05 (after library integration)

### UI Pages Created

- ✅ `/dashboard/stockly/recipes/page.tsx` - Recipe list with filtering, stats, search
- ❌ `/dashboard/stockly/recipes/[id]/page.tsx` - **MISSING** - Recipe builder/editor
- ❌ `/dashboard/stockly/recipes/new/page.tsx` - **MISSING** - Could redirect to [id] or be same page

### Navigation Updated

- ✅ Added "Recipes" to Stockly section in `NewMainSidebar.tsx`
- ✅ Added `ChefHat` icon import
- ✅ Reordered Stockly nav items (Dashboard, Recipes first)

## 📋 Recipe System Features

### Recipe Types ✅

- **PREP**: Sub-recipe used as ingredient (pizza dough, burger sauce, stock)
- **DISH**: Sellable menu item (Margherita pizza, beef burger)
- **COMPOSITE**: Weighted average of variants (Gelato scoop with 12 flavours)
- **MODIFIER**: Add-on that adjusts cost (Extra cheese, add bacon)

### Database Tables ✅

- `stockly.recipes` - Master recipe record
- `stockly.recipe_ingredients` - Items in a recipe (stock or sub-recipe)
- `stockly.recipe_variants` - Variants for composite recipes
- `stockly.recipe_modifiers` - Add-ons/extras
- `stockly.recipe_portions` - S/M/L size variations
- `stockly.recipe_cost_history` - Cost tracking over time

### Features Built ✅

- ✅ Prep recipes can be used as ingredients in other recipes
- ✅ Yield factors for waste (e.g., 85% usable veg)
- ✅ Auto-costing when ingredients change (trigger)
- ✅ GP tracking with target vs actual
- ✅ Composite recipes for weighted average (gelato case)
- ✅ POS code linking for sales matching
- ✅ Recipe duplication for quick variations
- ✅ Batch recalculate all recipes when prices change

## ❌ What's Missing

### 1. Recipe Builder/Editor Page

**File**: `src/app/dashboard/stockly/recipes/[id]/page.tsx`

**Features Needed**:

- Form to edit recipe details (name, type, yield, price, etc.)
- Ingredient list with add/edit/remove
- Stock item selector (using StockItemSelector component)
- Sub-recipe selector for PREP recipes
- Variant management for COMPOSITE recipes
- Modifier management
- Portion size management
- Cost breakdown display
- GP calculation display
- Save/Delete actions

### 2. New Recipe Page

**File**: `src/app/dashboard/stockly/recipes/new/page.tsx`

**Options**:

- Could redirect to `/dashboard/stockly/recipes/new` with `id=new`
- Or use same component as `[id]/page.tsx` with empty state

## 🎯 Next Steps

1. **Create Recipe Builder Page** (`/dashboard/stockly/recipes/[id]/page.tsx`)
   - Full recipe editing form
   - Ingredient management
   - Cost calculation display
   - Integration with StockItemSelector

2. **Test Recipe System**
   - Create a PREP recipe
   - Create a DISH recipe using the PREP
   - Create a COMPOSITE recipe (gelato example)
   - Test cost recalculation
   - Test GP tracking

3. **Optional Enhancements**
   - Recipe templates
   - Bulk import recipes
   - Recipe versioning UI
   - Cost history chart

## 📝 Notes

- Migration file is `05-stockly-recipes.sql` (not 04) because it runs after library integration
- Navigation has been updated to include Recipes
- Recipe list page is complete and functional
- Need to build the recipe editor/builder page next
