# Order Book Database Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] You have access to Supabase SQL Editor
- [ ] Your Supabase project is set up
- [ ] You have a `companies` table (required dependency)
- [ ] You have a `profiles` table (required dependency)

---

## 🚀 Deployment Steps

### Step 1: Run Migration 1 - Core Schema

**File:** `supabase/migrations/20250131000001_create_order_book_schema.sql`

1. Open Supabase SQL Editor
2. Copy the entire contents of the migration file
3. Paste into SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)
5. Wait for success message: `✅ Order Book schema tables created successfully`

**Expected Result:** 14 tables created

---

### Step 2: Run Migration 2 - Helper Functions

**File:** `supabase/migrations/20250131000002_order_book_helper_functions.sql`

1. Copy entire file contents
2. Paste into SQL Editor
3. Click **Run**
4. Wait for completion (no error messages)

**Expected Result:** 5 functions created + 2 triggers

---

### Step 3: Run Migration 3 - Production Planning Engine

**File:** `supabase/migrations/20250131000003_order_book_production_planning_engine.sql`

1. Copy entire file contents
2. Paste into SQL Editor
3. Click **Run**
4. Wait for completion

**Expected Result:** 5 production planning functions created

---

### Step 4: Run Migration 4 - RLS Policies

**File:** `supabase/migrations/20250131000004_order_book_rls_policies.sql`

1. Copy entire file contents
2. Paste into SQL Editor
3. Click **Run**
4. Wait for success message: `✅ Order Book RLS policies created successfully`

**Expected Result:** RLS enabled on all tables + policies created

---

### Step 5: Run Migration 5 - Sample Test Data

**File:** `supabase/migrations/20250131000005_order_book_sample_data.sql`

1. Copy entire file contents
2. Paste into SQL Editor
3. Click **Run**
4. Wait for success message: `✅ Order Book sample data created successfully`

**Expected Result:** 
- 1 supplier (Okja Bakery)
- 5 customers
- 15 products
- Production profiles
- Equipment
- Standing orders

---

## ✅ Verification Queries

Run these queries after deployment to verify everything is set up correctly:

### 1. Check All Tables Created

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'order_book%'
ORDER BY table_name;
```

**Expected:** 14 tables listed

---

### 2. Verify Supplier Created

```sql
SELECT 
  id,
  business_name,
  city,
  postcode,
  delivery_radius_km,
  delivery_days,
  is_active
FROM order_book_suppliers;
```

**Expected:** 1 row - "Okja Bakery"

---

### 3. Verify Customers Created

```sql
SELECT 
  business_name,
  contact_name,
  email,
  status,
  city
FROM order_book_customers
ORDER BY business_name;
```

**Expected:** 5 customers (High Grade Cafe, Cafe 1001, The Daily Grind, Artisan Roast, Brew & Bites)

---

### 4. Verify Products Created

```sql
SELECT 
  name,
  category,
  base_price,
  unit,
  is_active
FROM order_book_products
ORDER BY category, name;
```

**Expected:** 15 products across multiple categories

---

### 5. Verify Production Profiles Created

```sql
SELECT 
  p.name as product_name,
  pp.prep_lead_time_hours,
  pp.bake_time_minutes,
  pp.batch_size
FROM order_book_production_profiles pp
JOIN order_book_products p ON p.id = pp.product_id
ORDER BY p.name;
```

**Expected:** At least 2 profiles (Croissant, Almond Croissant)

---

### 6. Verify Equipment Created

```sql
SELECT 
  name,
  equipment_type,
  capacity_units,
  capacity_percent_max
FROM order_book_equipment
ORDER BY equipment_type, name;
```

**Expected:** 4 pieces of equipment (2 ovens, 1 fridge, 1 mixer)

---

### 7. Verify Standing Orders Created

```sql
SELECT 
  c.business_name as customer,
  so.delivery_days,
  so.is_active,
  jsonb_array_length(so.items) as item_count
FROM order_book_standing_orders so
JOIN order_book_customers c ON c.id = so.customer_id
ORDER BY c.business_name;
```

**Expected:** 2 standing orders (High Grade Cafe, Cafe 1001)

---

### 8. Test Helper Functions

```sql
-- Test order number generation (replace with your supplier_id)
SELECT generate_order_number((SELECT id FROM order_book_suppliers LIMIT 1));

-- Test invoice number generation
SELECT generate_invoice_number((SELECT id FROM order_book_suppliers LIMIT 1));

-- Test distance calculation
SELECT calculate_distance_km(51.5074, -0.1278, 51.5155, -0.1419) as distance_km;
```

**Expected:** 
- Order number: `OB-YYYYMMDD-001` format
- Invoice number: `INV-YYYYMMDD-001` format
- Distance: ~1.0 km (between London coordinates)

---

### 9. Test Production Planning Functions

```sql
-- Generate standing orders for next 7 days
SELECT generate_standing_orders(7) as orders_generated;

-- Check if orders were created
SELECT 
  o.order_number,
  c.business_name,
  o.delivery_date,
  o.status,
  o.total
FROM order_book_orders o
JOIN order_book_customers c ON c.id = o.customer_id
ORDER BY o.delivery_date, c.business_name
LIMIT 10;
```

**Expected:** 
- `orders_generated` > 0 (depending on delivery days)
- Multiple orders with order numbers, customer names, delivery dates

---

### 10. Test Production Plan Calculation

```sql
-- Get a delivery date from generated orders
WITH next_delivery AS (
  SELECT DISTINCT delivery_date 
  FROM order_book_orders 
  WHERE delivery_date >= CURRENT_DATE
  ORDER BY delivery_date 
  LIMIT 1
)
SELECT 
  calculate_production_plan(
    (SELECT id FROM order_book_suppliers LIMIT 1),
    (SELECT delivery_date FROM next_delivery)
  ) as schedule_id;
```

Then check the production schedule:

```sql
SELECT 
  delivery_date,
  total_orders,
  total_items,
  total_value,
  status,
  jsonb_array_length(timeline) as timeline_stages
FROM order_book_production_schedule
WHERE delivery_date >= CURRENT_DATE
ORDER BY delivery_date
LIMIT 5;
```

**Expected:** Production schedules with timeline data

---

### 11. Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'order_book%'
ORDER BY tablename;
```

**Expected:** All tables show `rlsenabled = true`

---

## 🧪 Generate Test Standing Orders

After deployment, generate orders from standing orders:

```sql
-- Generate standing orders for next 7 days
SELECT generate_standing_orders(7);

-- View generated orders
SELECT 
  o.order_number,
  c.business_name,
  o.delivery_date,
  o.status,
  o.total,
  (SELECT COUNT(*) FROM order_book_order_items oi WHERE oi.order_id = o.id) as item_count
FROM order_book_orders o
JOIN order_book_customers c ON c.id = o.customer_id
WHERE o.delivery_date >= CURRENT_DATE
ORDER BY o.delivery_date, c.business_name;
```

---

## 🔧 Troubleshooting

### Error: "companies table does not exist"
- **Solution:** The Order Book schema requires `companies` table. Make sure your Supabase project has the core Checkly schema deployed first.

### Error: "profiles table does not exist"
- **Solution:** Ensure the `profiles` table exists. This is part of the core authentication schema.

### Error: "relation already exists"
- **Solution:** Tables already exist. This is fine - the migrations use `CREATE TABLE IF NOT EXISTS`, so they're idempotent. You can continue.

### No orders generated from standing orders
- **Check:** Verify standing orders have valid delivery_days that match the next 7 days
- **Check:** Ensure standing orders are `is_active = TRUE` and `is_paused = FALSE`

### RLS policies blocking queries
- **Solution:** Make sure you're authenticated in Supabase. RLS requires a valid auth session.

---

## 📊 Quick Stats Query

After deployment, run this to see everything at a glance:

```sql
SELECT 
  'Suppliers' as entity, COUNT(*)::text as count FROM order_book_suppliers
UNION ALL
SELECT 'Customers', COUNT(*)::text FROM order_book_customers
UNION ALL
SELECT 'Products', COUNT(*)::text FROM order_book_products
UNION ALL
SELECT 'Production Profiles', COUNT(*)::text FROM order_book_production_profiles
UNION ALL
SELECT 'Equipment', COUNT(*)::text FROM order_book_equipment
UNION ALL
SELECT 'Standing Orders', COUNT(*)::text FROM order_book_standing_orders
UNION ALL
SELECT 'Orders', COUNT(*)::text FROM order_book_orders
ORDER BY entity;
```

---

## ✅ Success Criteria

Your deployment is successful if:

- [x] All 14 tables created
- [x] All helper functions work
- [x] All production planning functions work
- [x] RLS policies enabled on all tables
- [x] Test data created (1 supplier, 5 customers, 15 products)
- [x] Standing orders can generate orders
- [x] Production plans can be calculated

---

## 🎯 Next Steps After Deployment

1. ✅ Database deployed (YOU ARE HERE)
2. ⏭️ Create API routes (`/api/order-book/*`)
3. ⏭️ Set up authentication flows
4. ⏭️ Build Customer Portal UI (Week 2)

---

**Ready to deploy?** Copy each migration file into Supabase SQL Editor and run them in order (1 → 5).

