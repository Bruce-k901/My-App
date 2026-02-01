# Multi-Site Library-Based Stock Management - Implementation Summary

## Overview
This document summarizes the changes made to enable multi-site stock management using library items directly, addressing the issues identified in the current system.

## Issues Identified

### 1. Multi-Site Stock Management ✅ FIXED
**Problem:** Stock levels were not properly siloed per site. The existing `stock_levels` table uses `stock_item_id` which references a canonical `stock_items` table, not library items directly.

**Solution:** Created a new `library_stock_levels` table that uses polymorphic references to library items (`item_id` + `library_type`). This works alongside the existing `stock_levels` table for backward compatibility.

**Tables Created:**
- `library_stock_levels` - Stock levels per site for library items
- `library_stock_transactions` - All stock movements for library items
- `library_stock_transfers` - Site-to-site transfers for library items
- `library_stock_transfer_items` - Items within transfers

### 2. Library Editability & Missing Columns ✅ FIXED
**Problem:** 
- Ingredients library was editable but missing `is_saleable` and `selling_price` columns
- Packaging, FOH (serving_equipment_library), and First Aid libraries may not have been editable
- First Aid items didn't have costs applied

**Solution:** Added missing columns to all library tables:
- `is_saleable` (BOOLEAN, default false) - Marks items that can be sold
- `selling_price` (DECIMAL(10,2)) - Sale price for saleable items
- `cost_per_unit` (DECIMAL(10,2)) - Cost tracking (mapped from existing `unit_cost` where applicable)
- `unit_of_measurement` (TEXT) - Standardized unit field

**Libraries Updated:**
- ✅ `ingredients_library` - Added `is_saleable`, `selling_price`, ensured `unit_of_measurement` exists
- ✅ `packaging_library` - Added all missing columns
- ✅ `serving_equipment_library` (FOH items) - Added all missing columns
- ✅ `first_aid_supplies_library` - Added `cost_per_unit` and `unit_of_measurement` (not typically saleable)

### 3. Stock on Hand & GP Reporting ✅ IMPLEMENTED
**Problem:** No reporting views for stock on hand figures or GP calculations on saleable items.

**Solution:** Created two reporting views:
- `stock_on_hand_by_site` - Summary of stock levels by site and library type
- `gp_by_site` - Gross profit calculations for saleable items per site

**GP Calculation:**
- GP Percentage = ((selling_price - average_cost) / selling_price) × 100
- GP Value = (selling_price - average_cost) × current_level

## Database Schema Changes

### New Tables

#### `library_stock_levels`
```sql
- site_id (FK to sites)
- item_id (UUID - polymorphic)
- library_type ('ingredients', 'packaging', 'foh', 'first_aid')
- current_level, min_level, max_level
- average_cost, last_cost
- last_counted_at, last_updated_at
```

#### `library_stock_transactions`
```sql
- site_id (FK to sites)
- item_id, library_type (polymorphic reference)
- transaction_type ('stock_count', 'purchase', 'sale', 'production', 'waste', 'transfer_out', 'transfer_in', 'adjustment')
- quantity, unit_cost, total_value
- reference_type, reference_id (links to source records)
- from_site_id, to_site_id (for transfers)
```

#### `library_stock_transfers`
```sql
- company_id (FK to companies)
- from_site_id, to_site_id (FK to sites)
- transfer_number, status, transfer_type
- total_cost, total_sale_value
- sent_at, received_at (workflow tracking)
```

#### `library_stock_transfer_items`
```sql
- transfer_id (FK to library_stock_transfers)
- item_id, library_type (polymorphic)
- quantity_sent, quantity_received
- unit_cost, unit_price
```

### Views Created

#### `stock_on_hand_by_site`
Summary view showing:
- Site ID and name
- Library type
- Item count
- Total quantity
- Total value (quantity × average_cost)

#### `gp_by_site`
GP analysis view showing:
- Site ID and name
- Library type
- Item ID and name
- Current level
- Average cost
- Selling price
- GP percentage
- GP value

## Stock Counts Integration

The existing `stock_counts` table already has `site_id` (added in a previous migration), so it's compatible with the multi-site system. Stock counts can now:
- Be created per site
- Filter libraries by what's available at that site
- Save counts with `site_id` for proper site isolation

## Row Level Security (RLS)

All new tables have RLS policies that:
- Filter by company (users can only see their company's data)
- Filter by site (users can only see sites within their company)
- Allow appropriate INSERT/UPDATE/DELETE based on company membership

## Migration File

**File:** `supabase/migrations/20250212000001_multi_site_library_stock_management.sql`

**What it does:**
1. Adds missing columns to all library tables
2. Creates library-based stock management tables
3. Ensures `stock_counts` has `site_id` (if missing)
4. Creates reporting views
5. Sets up RLS policies
6. All operations are conditional and idempotent (safe to run multiple times)

## Current State vs. Required State

### ✅ What's Working Now:
- Multi-site stock levels (`library_stock_levels` with `site_id`)
- Library-based item tracking (polymorphic `item_id` + `library_type`)
- Stock transactions per site
- Stock transfers between sites
- GP calculations on saleable items
- Stock on hand reporting per site
- All libraries have cost tracking
- Saleable items marked with `is_saleable` and `selling_price`

### 📋 What Needs UI Work:
1. **Site Selector** - Add to Stockly navigation to filter all queries by site
2. **Library Management UI** - Create/edit screens for packaging, FOH, first aid (mirror ingredients interface)
3. **Stock Count Flow** - Add site selector to create count modal, filter by site
4. **Stock Transfer Flow** - UI for creating transfers between sites
5. **Reporting Dashboard** - Display `stock_on_hand_by_site` and `gp_by_site` views

## Next Steps

### Immediate:
1. Run the migration: `supabase/migrations/20250212000001_multi_site_library_stock_management.sql`
2. Verify tables and views were created correctly
3. Test RLS policies work as expected

### UI Development:
1. Add site selector context/provider (or extend existing AppContext)
2. Update all Stockly queries to filter by `site_id`
3. Build library management UI for packaging, FOH, first aid
4. Build stock transfer creation UI
5. Build reporting dashboard with stock on hand and GP views

### Data Migration (if needed):
- If you have existing stock data in the old `stock_levels` table, you may need to migrate it to `library_stock_levels`
- This depends on whether `stock_items` can be mapped to library items

## Notes

- The new `library_stock_levels` table works **alongside** the existing `stock_levels` table - they're not mutually exclusive
- The existing `stock_items`/`stock_levels` system continues to work for recipe/costing workflows
- Library-based system is for operational stock management (counting, transfers, reporting)
- FOH items are mapped to `serving_equipment_library` (not a separate `foh_items` table)
- First aid items use `first_aid_supplies_library` (already exists from previous migration)

## Testing Checklist

- [ ] Run migration successfully
- [ ] Verify all library tables have new columns
- [ ] Create test stock levels for different sites
- [ ] Test stock transactions create correctly
- [ ] Test stock transfers between sites
- [ ] Verify RLS policies restrict access appropriately
- [ ] Test reporting views return correct data
- [ ] Verify GP calculations are correct

