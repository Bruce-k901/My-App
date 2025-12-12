# Stockly Integration Migrations - Complete

**Date**: February 17, 2025  
**Status**: ✅ All migrations created and ready for deployment

---

## 📋 Migration Files Created

All migrations follow the naming convention: `YYYYMMDDHHMMSS_description.sql`

### 1. `20250217000001_create_company_modules.sql`

- Creates `company_modules` table to track enabled modules (checkly, stockly, peoply)
- Seeds existing companies with Checkly module enabled
- RLS policies for company-scoped access

### 2. `20250217000002_extend_sites_for_stockly.sql`

- Adds `location_type` column (site, cpu, warehouse, external)
- Adds POS configuration fields (`pos_provider`, `pos_config`, `pos_location_id`)
- Adds `internal_markup_percent` for CPU internal sales
- Updates existing sites to default type 'site'

### 3. `20250217000003_create_uom_table.sql`

- Creates global `uom` (units of measure) table
- Seeds standard hospitality units (weight, volume, count)
- Global read access, service_role only for modifications

### 4. `20250217000004_create_stockly_core_tables.sql`

- **storage_areas**: Storage locations within sites
- **suppliers**: Supplier management with ordering configs
- **stock_categories**: Hierarchical stock categorization
- **stock_items**: Canonical stock items
- **product_variants**: Purchasable products from suppliers
- **price_history**: Price change tracking
- **stock_levels**: Current stock levels per site/storage area
- **stock_movements**: Complete audit trail of all stock movements

### 5. `20250217000005_create_deliveries_purchasing.sql`

- **deliveries**: Delivery receipts with AI processing support
- **delivery_lines**: Line items for deliveries
- **purchase_orders**: Purchase order management
- **purchase_order_lines**: PO line items with received quantities

### 6. `20250217000006_create_waste_counting_transfers.sql`

- **waste_logs**: Waste logging with Checkly task linking
- **waste_log_lines**: Waste line items
- **stock_counts**: Stock count sessions (full, partial, spot, rolling)
- **stock_count_sections**: Count sections by storage area
- **stock_count_lines**: Individual count line items
- **transfers**: Inter-site transfers with internal sale support
- **transfer_lines**: Transfer line items

### 7. `20250217000007_create_recipes_tables.sql`

- **recipes**: Recipe management (menu items, sub-recipes, prep items, batches)
- **recipe_ingredients**: Recipe ingredients (supports sub-recipes)
- Circular reference guard function to prevent recipe loops
- Cost calculation fields

### 8. `20250217000008_create_pos_integration.sql`

- **pos_sales**: POS transaction tracking
- **pos_sale_lines**: POS sale line items with recipe linking
- **ai_processing_queue**: Queue for AI invoice/label processing

### 9. `20250217000009_create_stockly_rls_policies.sql`

- RLS policies for all Stockly tables
- Company-scoped access using `stockly_company_access()` helper
- Site-scoped access for storage_areas and stock_levels
- Parent-child table policies for line items

### 10. `20250217000010_create_whatsapp_order_function.sql`

- `generate_whatsapp_order()` function for purchase orders
- `url_encode()` helper function
- Generates formatted WhatsApp messages with order details

---

## 🗄️ Database Schema Overview

### Core Tables (25 tables)

1. `company_modules` - Module enablement tracking
2. `storage_areas` - Site storage locations
3. `suppliers` - Supplier management
4. `stock_categories` - Stock categorization
5. `stock_items` - Canonical stock items
6. `product_variants` - Purchasable products
7. `price_history` - Price tracking
8. `stock_levels` - Current stock levels
9. `stock_movements` - Stock movement audit trail
10. `deliveries` - Delivery receipts
11. `delivery_lines` - Delivery line items
12. `purchase_orders` - Purchase orders
13. `purchase_order_lines` - PO line items
14. `waste_logs` - Waste logging
15. `waste_log_lines` - Waste line items
16. `stock_counts` - Stock count sessions
17. `stock_count_sections` - Count sections
18. `stock_count_lines` - Count line items
19. `transfers` - Inter-site transfers
20. `transfer_lines` - Transfer line items
21. `recipes` - Recipe management
22. `recipe_ingredients` - Recipe ingredients
23. `pos_sales` - POS transactions
24. `pos_sale_lines` - POS sale lines
25. `ai_processing_queue` - AI processing queue

### Extended Tables

- `sites` - Extended with `location_type`, POS fields, `internal_markup_percent`
- `uom` - New global units of measure table

---

## 🚀 Deployment Steps

### 1. Verify Existing Schema

Before running migrations, verify the existing schema matches expectations:

```sql
-- Check companies table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Check sites table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sites'
ORDER BY ordinal_position;

-- Check for conflicts
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'suppliers', 'stock_items', 'product_variants',
    'recipes', 'deliveries', 'stock_counts', 'uom',
    'stock_movements', 'transfers', 'company_modules'
);
```

### 2. Run Migrations

Apply migrations in order:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor:
# Run each migration file in sequence (00001 through 00010)
```

### 3. Verify Deployment

After running migrations, verify tables were created:

```sql
-- Check all Stockly tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'company_modules', 'storage_areas', 'suppliers',
    'stock_categories', 'stock_items', 'product_variants',
    'price_history', 'stock_levels', 'stock_movements',
    'deliveries', 'delivery_lines', 'purchase_orders',
    'purchase_order_lines', 'waste_logs', 'waste_log_lines',
    'stock_counts', 'stock_count_sections', 'stock_count_lines',
    'transfers', 'transfer_lines', 'recipes', 'recipe_ingredients',
    'pos_sales', 'pos_sale_lines', 'ai_processing_queue', 'uom'
)
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'company_modules', 'storage_areas', 'suppliers',
    'stock_categories', 'stock_items', 'product_variants'
)
ORDER BY tablename;

-- Check UOM seed data
SELECT COUNT(*) as uom_count FROM uom;
-- Should return 30 (or more if additional units added)
```

### 4. Test RLS Policies

Test that RLS policies work correctly:

```sql
-- Test company access (should only see your company's data)
SELECT COUNT(*) FROM suppliers;
SELECT COUNT(*) FROM stock_items;

-- Test site access
SELECT COUNT(*) FROM storage_areas;
SELECT COUNT(*) FROM stock_levels;
```

---

## 🔗 Integration Points

### Checkly Integration

- **Waste Logs**: `waste_logs.checkly_task_id` links to Checkly tasks
- **Temperature Breaches**: Waste can be logged from temperature breach tasks
- **Shared Auth**: Uses existing `profiles` and `user_site_access` tables

### POS Integration

- **POS Sales**: Tracks sales from Square, Lightspeed, Toast, Zonal
- **Recipe Linking**: Links POS products to recipes for cost analysis
- **Drawdown Processing**: Automatic stock drawdown from sales

### AI Processing

- **Invoice Extraction**: AI processes delivery invoices
- **Label Scanning**: Barcode/label recognition
- **Photo Counting**: AI-assisted stock counting
- **Waste Photo**: Waste logging from photos

---

## 📝 Next Steps

1. **Enable Stockly Module**: Update `company_modules` to enable Stockly for companies
2. **Create UI Pages**: Build Stockly dashboard pages
   - Suppliers management
   - Stock items catalog
   - Purchase orders
   - Deliveries
   - Stock counts
   - Recipes
   - Transfers
3. **Build API Functions**: Create server-side functions for:
   - Stock level calculations
   - Cost calculations
   - Recipe costing
   - Transfer processing
4. **POS Integration**: Set up webhooks for POS providers
5. **AI Processing**: Integrate AI service for invoice/label processing

---

## ⚠️ Important Notes

- **Company Modules**: Existing companies are automatically seeded with Checkly module
- **Sites Extension**: Existing sites default to `location_type = 'site'`
- **UOM Global**: Units of measure are global, not per-company
- **RLS Security**: All tables have RLS enabled with company-scoped access
- **Circular References**: Recipe system prevents circular sub-recipe references
- **WhatsApp Orders**: Requires supplier `ordering_config` with `whatsapp_number`

---

## 🐛 Troubleshooting

### Migration Fails

- Check for existing tables with same names
- Verify foreign key references exist (companies, sites, profiles)
- Check for column conflicts in `sites` table

### RLS Issues

- Verify `profiles` table has correct `company_id` values
- Check `auth.uid()` returns correct user ID
- Test with different user roles

### Missing Data

- Verify UOM seed data loaded (should have 30 units)
- Check company_modules seeded correctly
- Verify sites updated with `location_type`

---

## 📚 Related Documentation

- See `stockly-checkly-integration.md` for full integration plan
- Check existing Checkly schema in `supabase/sql/` directory
- Review RLS patterns in existing migrations
