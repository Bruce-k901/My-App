# Recipe Ingredients Table - Comprehensive Analysis

## Executive Summary

The `recipe_ingredients` table has **schema inconsistencies** between different migrations and the application code. There are two competing schemas, and the code is trying to handle both, causing data loading and display issues.

---

## Current Database Schema Analysis

### Schema 1: `stockly.recipe_ingredients` (Primary Schema - from `05-stockly-recipes.sql`)

**Location**: `stockly` schema (base table)

**Columns**:
| Column | Type | Purpose | Used By Code? | Notes |
|--------|------|---------|---------------|-------|
| `id` | UUID | Primary key | ✅ Yes | Auto-generated |
| `recipe_id` | UUID | Foreign key to recipes | ✅ Yes | Required, indexed |
| `stock_item_id` | UUID | **DEPRECATED** - References stock_items | ⚠️ Legacy | Renamed to `ingredient_id` in migration |
| `ingredient_id` | UUID | References ingredients_library | ✅ Yes | Added in migration 20250322000009 |
| `sub_recipe_id` | UUID | References recipes (for sub-recipes) | ✅ Yes | For nested recipes |
| `quantity` | NUMERIC(12,4) | Amount needed | ✅ Yes | Required, > 0 |
| `unit` | TEXT | **String unit** ('kg', 'g', 'litre', 'ml', 'each') | ⚠️ **MISMATCH** | Code expects this, but migration 20250217000007 uses `unit_id` |
| `yield_factor` | NUMERIC(5,3) | Waste/yield factor (0-1) | ❌ No | Not used in code |
| `unit_cost` | NUMERIC(12,4) | Cost per unit | ✅ Yes | Stored but also calculated |
| `gross_quantity` | NUMERIC(12,4) | quantity / yield_factor | ❌ No | Not used in code |
| `line_cost` | NUMERIC(12,4) | gross_quantity * unit_cost | ❌ No | Not used in code |
| `preparation_notes` | TEXT | Prep instructions | ❌ No | Not used in code |
| `display_order` | INTEGER | Sort order | ⚠️ **MISMATCH** | Code uses this, but migration 20250217000007 uses `sort_order` |
| `is_optional` | BOOLEAN | Optional ingredient flag | ❌ No | Not used in code |
| `created_at` | TIMESTAMPTZ | Creation timestamp | ❌ No | Not used in code |
| `updated_at` | TIMESTAMPTZ | Update timestamp | ❌ No | Not used in code |

**Constraints**:
- `ingredient_source`: Either `ingredient_id` OR `sub_recipe_id` must be set (not both)
- Unique index on `(recipe_id, ingredient_id, sub_recipe_id)` to prevent duplicates

**Indexes**:
- `idx_recipe_ingredients_recipe` on `recipe_id`
- `idx_recipe_ingredients_stock` on `stock_item_id` (legacy)
- `idx_recipe_ingredients_ingredient_id` on `ingredient_id` (added in migration)
- `idx_recipe_ingredients_sub` on `sub_recipe_id`

### Schema 2: `public.recipe_ingredients` (Alternative Schema - from `20250217000007_create_recipes_tables.sql`)

**Location**: `public` schema (view or table)

**Columns**:
| Column | Type | Purpose | Used By Code? | Notes |
|--------|------|---------|---------------|-------|
| `id` | UUID | Primary key | ✅ Yes | |
| `recipe_id` | UUID | Foreign key | ✅ Yes | |
| `stock_item_id` | UUID | **DEPRECATED** | ⚠️ Legacy | |
| `sub_recipe_id` | UUID | For sub-recipes | ✅ Yes | |
| `quantity` | DECIMAL(10,4) | Amount | ✅ Yes | |
| `unit_id` | UUID | **References uom table** | ❌ **NO** | Code doesn't use this! |
| `prep_notes` | TEXT | Prep instructions | ❌ No | |
| `unit_cost` | DECIMAL(10,4) | Cost per unit | ✅ Yes | |
| `line_cost` | DECIMAL(10,2) | Total line cost | ❌ No | |
| `sort_order` | INTEGER | Sort order | ❌ **NO** | Code uses `display_order`! |

**Note**: This schema uses `unit_id` (UUID reference to `uom` table) instead of `unit` (TEXT string).

---

## Code Usage Analysis

### Current Code Behavior (`RecipeIngredientsTable.tsx`)

**Loading Ingredients**:
```typescript
// Line 225-228: Uses display_order (not sort_order)
.select('*')
.eq('recipe_id', recipeId)
.order('display_order', { ascending: true, nullsFirst: true });

// Line 316: Expects unit as string (not unit_id)
unit: ri.unit || ingredient?.unit || '',

// Line 471: Tries to save display_order (not sort_order)
display_order: ingredients.length
```

**Saving Ingredients**:
```typescript
// Line 469: Saves unit as string
unit: dataToSave.unit || '',

// Line 470: Saves unit_cost
unit_cost: unitCost,

// Line 471: Saves display_order (not sort_order)
display_order: ingredients.length
```

**Issues Identified**:
1. ❌ Code saves `unit` as TEXT string, but migration `20250217000007` expects `unit_id` UUID
2. ❌ Code uses `display_order`, but migration `20250217000007` uses `sort_order`
3. ⚠️ Code handles both `ingredient_id` and `stock_item_id` (legacy compatibility)
4. ❌ Code doesn't JOIN with `uom` table to get unit abbreviations
5. ❌ Code doesn't JOIN with `ingredients_library` properly - does separate query

---

## Data Access Patterns

### Current Pattern (Inefficient)

1. **Load recipe_ingredients** → Get IDs only
2. **Separate query** → Load ingredients_library details
3. **Client-side join** → Merge data in JavaScript

**Problems**:
- Multiple round trips to database
- No proper JOINs
- Missing unit information (no JOIN to `uom` table)
- Inefficient for large recipes

### Recommended Pattern (Efficient)

**Single Query with JOINs**:
```sql
SELECT 
  ri.*,
  il.ingredient_name,
  il.supplier,
  il.unit_cost as library_unit_cost,
  il.pack_cost,
  il.pack_size,
  il.yield_percent,
  uom.abbreviation as unit_abbreviation,
  uom.name as unit_name,
  uom.base_multiplier,
  uom.unit_type
FROM recipe_ingredients ri
LEFT JOIN ingredients_library il ON il.id = ri.ingredient_id
LEFT JOIN uom ON uom.id = ri.unit_id  -- If using unit_id schema
WHERE ri.recipe_id = ?
ORDER BY ri.display_order ASC, ri.sort_order ASC
```

**Benefits**:
- Single database round trip
- All data in one query
- Proper relational integrity
- Scalable for large datasets

---

## Column Usage Effectiveness

### ✅ Effectively Used Columns

| Column | Usage | Efficiency | Notes |
|--------|-------|------------|-------|
| `id` | Primary key, updates | ✅ High | Essential |
| `recipe_id` | Foreign key, filtering | ✅ High | Indexed, essential |
| `ingredient_id` | References ingredients | ✅ High | Indexed, essential |
| `quantity` | Display, calculations | ✅ High | Essential for recipes |
| `unit_cost` | Cost calculations | ✅ Medium | Stored but also calculated |

### ⚠️ Partially Used Columns

| Column | Usage | Efficiency | Notes |
|--------|-------|------------|-------|
| `unit` / `unit_id` | Display, conversions | ⚠️ **LOW** | Schema mismatch - code uses string, DB may use UUID |
| `display_order` / `sort_order` | Sorting | ⚠️ **LOW** | Schema mismatch - code uses display_order, DB may use sort_order |
| `sub_recipe_id` | Sub-recipe support | ⚠️ Medium | Used but not fully tested |

### ❌ Unused Columns (Dead Weight)

| Column | Purpose | Why Unused | Recommendation |
|--------|---------|------------|----------------|
| `yield_factor` | Waste/yield calculation | Not implemented in UI | **Remove or implement** |
| `gross_quantity` | Calculated field | Not used | **Remove** (can be calculated) |
| `line_cost` | Calculated field | Not used | **Remove** (can be calculated) |
| `preparation_notes` / `prep_notes` | Prep instructions | Not in UI | **Remove or implement** |
| `is_optional` | Optional flag | Not in UI | **Remove or implement** |
| `created_at` | Audit trail | Not displayed | **Keep for audit** |
| `updated_at` | Audit trail | Not displayed | **Keep for audit** |

---

## Scalability Concerns

### Current Issues

1. **N+1 Query Problem**: 
   - Load recipe_ingredients (1 query)
   - Load ingredients_library for each ingredient (N queries or 1 query with IN clause)
   - No JOIN, so multiple round trips

2. **Missing Indexes**:
   - No index on `display_order` / `sort_order` for sorting
   - No composite index on `(recipe_id, display_order)` for efficient sorting

3. **Schema Mismatch**:
   - Code and database don't agree on column names/types
   - Causes confusion and potential bugs

4. **Data Redundancy**:
   - `unit_cost` stored in both `recipe_ingredients` and `ingredients_library`
   - Should be calculated or normalized

### Recommendations for Scale

1. **Use Proper JOINs**: Single query with JOINs instead of multiple queries
2. **Add Composite Index**: `CREATE INDEX idx_recipe_ingredients_recipe_order ON recipe_ingredients(recipe_id, display_order)`
3. **Normalize Unit Storage**: Decide on `unit` (TEXT) vs `unit_id` (UUID) and stick to it
4. **Remove Unused Columns**: Clean up dead weight to improve query performance
5. **Use Database Views**: Create a view that JOINs all needed data for common queries
6. **Cache Frequently Accessed Data**: Consider caching ingredient details if they don't change often

---

## Schema Decision Matrix

### Option 1: Use `unit` (TEXT) - Current Code Approach

**Pros**:
- Simple, human-readable
- No JOIN needed for display
- Code already written for this

**Cons**:
- No referential integrity
- Can't enforce valid units
- Harder to do unit conversions
- Inconsistent with `recipes.yield_unit_id` (which uses UUID)

### Option 2: Use `unit_id` (UUID) - Database Schema Approach

**Pros**:
- Referential integrity
- Consistent with `recipes.yield_unit_id`
- Can enforce valid units
- Better for unit conversions (has `base_multiplier`)

**Cons**:
- Requires JOIN to `uom` table for display
- More complex queries
- Code needs refactoring

### Recommendation: **Option 2 (unit_id UUID)**

**Rationale**:
- Consistent with rest of schema (`recipes.yield_unit_id` uses UUID)
- Better data integrity
- Enables proper unit conversions
- Scalable and maintainable
- Aligns with database design principles

---

## Migration Path

### Step 1: Standardize Schema
- Choose ONE schema (recommend `stockly.recipe_ingredients` with `unit_id`)
- Update all migrations to use consistent column names
- Remove conflicting schemas

### Step 2: Update Code
- Refactor to use `unit_id` instead of `unit` string
- Add JOINs to `uom` table for unit display
- Use `sort_order` consistently (or rename to `display_order` everywhere)

### Step 3: Add Missing Indexes
- Composite index on `(recipe_id, display_order)` for sorting
- Index on `unit_id` for JOINs

### Step 4: Clean Up
- Remove unused columns or implement their features
- Consolidate duplicate schemas
- Update all queries to use JOINs

---

## Questions to Resolve

1. **Which schema is authoritative?** `stockly.recipe_ingredients` or `public.recipe_ingredients`?
2. **Should we use `unit` (TEXT) or `unit_id` (UUID)?** (Recommend UUID for consistency)
3. **Should we use `display_order` or `sort_order`?** (Recommend standardizing on one)
4. **Should we remove unused columns?** (Recommend yes, but need to confirm no future plans)
5. **Should we implement unused columns?** (e.g., `yield_factor`, `preparation_notes`)

---

## Next Steps

1. ✅ **Complete this analysis** (DONE)
2. ⏳ **Get stakeholder approval** on schema decisions
3. ⏳ **Create migration plan** to standardize schema
4. ⏳ **Refactor code** to use proper JOINs and correct column names
5. ⏳ **Add missing indexes** for performance
6. ⏳ **Test with large datasets** to verify scalability
7. ⏳ **Document final schema** for future reference

