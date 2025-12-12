# Stockly-Checkly Integration Plan

## Overview

This document outlines the plan to complete the Stockly stock management system and integrate it seamlessly with Checkly's existing library systems to create a unified, synergistic platform.

---

## 🎯 Goals

1. **Complete Stockly System**: Finish remaining features and ensure all components work together
2. **Connect to Checkly Libraries**: Link Stockly stock items to Checkly's library items (ingredients, chemicals, PPE, etc.)
3. **Create Synergy**: Enable seamless data flow between Stockly and Checkly modules

---

## 📊 Current State Analysis

### ✅ What's Complete in Stockly

- **Core Tables**: `stock_items`, `stock_levels`, `deliveries`, `delivery_lines`, `waste_logs`, `stock_counts`
- **POS Integration**: `sales`, `sale_items`, `daily_sales_summary`
- **Reporting**: Stock Value, Supplier Spend, Wastage, Dead Stock, Price Tracking, GP, Variance reports
- **UI Pages**: Dashboard, Stock Items, Deliveries, Credit Notes, Stock Counts, Sales, Reports Hub
- **Export Features**: Excel and PDF exports for all reports

### ✅ What Exists in Checkly

- **UnifiedLibrarySearch Component**: Searches across multiple libraries
- **Library Tables**:
  - `ingredients_library` (food ingredients)
  - `chemicals_library` (cleaning chemicals)
  - `ppe_library` (PPE items)
  - `drinks_library` (beverages)
  - `disposables_library` (disposable items)
  - `glassware_library` (glassware)
  - `packaging_library` (packaging)
  - `serving_equipment_library` (serving equipment)
- **SOP Templates**: Opening/closing procedures mention stock checks
- **Task System**: Daily checklists with stock-related tasks

### ❌ What's Missing

1. **No Link Between Stockly and Checkly Libraries**
   - Stock items are created independently
   - No way to link a stock item to a library item
   - Duplicate data entry required

2. **No Shared Stock Utilities**
   - No common functions for stock operations
   - Each system handles stock differently

3. **No Integration in SOPs**
   - Opening/closing templates mention stock but don't use Stockly
   - Stock checks are manual, not integrated

4. **No Library Integration in Stockly**
   - Can't search Checkly libraries when creating stock items
   - Can't use UnifiedLibrarySearch in Stockly components

---

## 🔗 Integration Strategy

### Phase 1: Database Schema Integration

#### 1.1 Add Library Item Links to Stock Items

**Migration**: `04-stockly-library-integration.sql`

```sql
-- Add library_item_id and library_type to stock_items
ALTER TABLE stockly.stock_items
  ADD COLUMN library_item_id UUID,
  ADD COLUMN library_type TEXT CHECK (library_type IN (
    'ingredients_library',
    'chemicals_library',
    'ppe_library',
    'drinks_library',
    'disposables_library',
    'glassware_library',
    'packaging_library',
    'serving_equipment_library'
  ));

-- Create index for faster lookups
CREATE INDEX idx_stock_items_library ON stockly.stock_items(library_type, library_item_id);

-- Add comment
COMMENT ON COLUMN stockly.stock_items.library_item_id IS 'Links to Checkly library item (ingredients_library, chemicals_library, etc.)';
COMMENT ON COLUMN stockly.stock_items.library_type IS 'Type of library this stock item links to';
```

#### 1.2 Create Unified Stock-Library View

```sql
-- View that combines stock_items with library data
CREATE OR REPLACE VIEW stockly.v_stock_items_with_library AS
SELECT
  si.*,
  CASE si.library_type
    WHEN 'ingredients_library' THEN (SELECT row_to_json(il.*) FROM ingredients_library il WHERE il.id = si.library_item_id)
    WHEN 'chemicals_library' THEN (SELECT row_to_json(cl.*) FROM chemicals_library cl WHERE cl.id = si.library_item_id)
    WHEN 'ppe_library' THEN (SELECT row_to_json(pl.*) FROM ppe_library pl WHERE pl.id = si.library_item_id)
    WHEN 'drinks_library' THEN (SELECT row_to_json(dl.*) FROM drinks_library dl WHERE dl.id = si.library_item_id)
    WHEN 'disposables_library' THEN (SELECT row_to_json(disl.*) FROM disposables_library disl WHERE disl.id = si.library_item_id)
    WHEN 'glassware_library' THEN (SELECT row_to_json(gl.*) FROM glassware_library gl WHERE gl.id = si.library_item_id)
    WHEN 'packaging_library' THEN (SELECT row_to_json(packl.*) FROM packaging_library packl WHERE packl.id = si.library_item_id)
    WHEN 'serving_equipment_library' THEN (SELECT row_to_json(sel.*) FROM serving_equipment_library sel WHERE sel.id = si.library_item_id)
    ELSE NULL
  END AS library_data
FROM stockly.stock_items si;

GRANT SELECT ON stockly.v_stock_items_with_library TO authenticated;
```

### Phase 2: Shared Utilities Library

#### 2.1 Create Stock Utilities (`src/lib/stockly/stock-utils.ts`)

```typescript
/**
 * Shared stock utilities for Stockly and Checkly integration
 */

import { supabase } from "@/lib/supabase";

export interface LibraryItem {
  id: string;
  library_type: string;
  name: string;
  [key: string]: any;
}

export interface StockItemWithLibrary {
  id: string;
  name: string;
  library_item_id?: string;
  library_type?: string;
  library_data?: LibraryItem;
}

/**
 * Get library item name based on library type
 */
export function getLibraryItemName(item: any, libraryType: string): string {
  switch (libraryType) {
    case "ingredients_library":
      return item.ingredient_name || "";
    case "chemicals_library":
      return item.product_name || "";
    case "equipment_library":
      return item.equipment_name || "";
    default:
      return item.item_name || item.name || "";
  }
}

/**
 * Create stock item from library item
 */
export async function createStockItemFromLibrary(
  libraryItemId: string,
  libraryType: string,
  companyId: string,
  additionalData?: Partial<any>,
): Promise<string> {
  // Fetch library item
  const { data: libraryItem, error } = await supabase
    .from(libraryType)
    .select("*")
    .eq("id", libraryItemId)
    .single();

  if (error || !libraryItem) {
    throw new Error(`Library item not found: ${libraryType}/${libraryItemId}`);
  }

  // Get name from library item
  const name = getLibraryItemName(libraryItem, libraryType);

  // Create stock item
  const { data: stockItem, error: createError } = await supabase
    .from("stock_items")
    .insert({
      company_id: companyId,
      name,
      library_item_id: libraryItemId,
      library_type: libraryType,
      is_purchasable: true,
      track_stock: true,
      ...additionalData,
    })
    .select("id")
    .single();

  if (createError || !stockItem) {
    throw new Error(`Failed to create stock item: ${createError?.message}`);
  }

  return stockItem.id;
}

/**
 * Search stock items with library data
 */
export async function searchStockItemsWithLibrary(
  companyId: string,
  searchTerm: string,
): Promise<StockItemWithLibrary[]> {
  const { data, error } = await supabase
    .from("stock_items")
    .select(
      `
      *,
      library_item_id,
      library_type
    `,
    )
    .eq("company_id", companyId)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(50);

  if (error) {
    throw error;
  }

  // Enrich with library data
  const enriched = await Promise.all(
    (data || []).map(async (item) => {
      if (item.library_item_id && item.library_type) {
        const { data: libraryData } = await supabase
          .from(item.library_type)
          .select("*")
          .eq("id", item.library_item_id)
          .single();

        return {
          ...item,
          library_data: libraryData,
        };
      }
      return item;
    }),
  );

  return enriched;
}
```

### Phase 3: UI Component Integration

#### 3.1 Enhanced StockItemSelector Component

**File**: `src/components/stockly/StockItemSelector.tsx`

```typescript
'use client';

import { useState } from 'react';
import UnifiedLibrarySearch from '@/components/UnifiedLibrarySearch';
import { createStockItemFromLibrary } from '@/lib/stockly/stock-utils';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

interface StockItemSelectorProps {
  onSelect: (stockItemId: string, item: any) => void;
  allowCreateFromLibrary?: boolean;
  filterPurchasable?: boolean;
}

export function StockItemSelector({
  onSelect,
  allowCreateFromLibrary = true,
  filterPurchasable = true,
}: StockItemSelectorProps) {
  const { companyId } = useAppContext();
  const [creating, setCreating] = useState(false);

  const handleLibrarySelect = async (libraryItem: any, libraryType: string) => {
    try {
      setCreating(true);

      // Check if stock item already exists for this library item
      const { data: existing } = await supabase
        .from('stock_items')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('library_item_id', libraryItem.id)
        .eq('library_type', libraryType)
        .maybeSingle();

      if (existing) {
        // Use existing stock item
        onSelect(existing.id, { ...existing, library_data: libraryItem });
        toast.success(`Selected existing stock item: ${existing.name}`);
      } else if (allowCreateFromLibrary) {
        // Create new stock item from library item
        const stockItemId = await createStockItemFromLibrary(
          libraryItem.id,
          libraryType,
          companyId
        );
        toast.success('Stock item created from library');
        onSelect(stockItemId, { id: stockItemId, library_data: libraryItem });
      } else {
        toast.error('Stock item not found. Enable "Create from Library" to auto-create.');
      }
    } catch (error: any) {
      toast.error(`Failed to create stock item: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <UnifiedLibrarySearch
        onSelect={handleLibrarySelect}
        context="all"
      />
      {creating && (
        <div className="text-sm text-neutral-400">Creating stock item...</div>
      )}
    </div>
  );
}
```

#### 3.2 Update ManualDeliveryModal to Use StockItemSelector

Replace the stock item search in `ManualDeliveryModal.tsx` with `StockItemSelector` component.

#### 3.3 Update StockItemsPage to Show Library Links

Add a column showing which library item each stock item is linked to, with a button to view/edit the library item.

### Phase 4: SOP Integration

#### 4.1 Stock Check Task in Opening/Closing Templates

**File**: `src/components/sops/StockCheckTask.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Package, AlertCircle, CheckCircle } from 'lucide-react';
import { StockItemSelector } from '@/components/stockly/StockItemSelector';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

interface StockCheckTaskProps {
  onComplete: (checks: StockCheck[]) => void;
}

interface StockCheck {
  stock_item_id: string;
  stock_item_name: string;
  checked_quantity: number;
  status: 'ok' | 'low' | 'out';
  notes?: string;
}

export function StockCheckTask({ onComplete }: StockCheckTaskProps) {
  const { companyId, siteId } = useAppContext();
  const [checks, setChecks] = useState<StockCheck[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleAddCheck = async (stockItemId: string, item: any) => {
    // Fetch current stock level
    const { data: stockLevel } = await supabase
      .from('stock_levels')
      .select('quantity, par_level')
      .eq('stock_item_id', stockItemId)
      .eq('site_id', siteId)
      .maybeSingle();

    const newCheck: StockCheck = {
      stock_item_id: stockItemId,
      stock_item_name: item.name || item.library_data?.name,
      checked_quantity: stockLevel?.quantity || 0,
      status: stockLevel?.quantity <= (stockLevel?.par_level || 0) ? 'low' : 'ok',
    };

    setChecks([...checks, newCheck]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="text-[#EC4899]" />
        <h3 className="font-semibold">Stock Check</h3>
      </div>

      <StockItemSelector
        onSelect={handleAddCheck}
        allowCreateFromLibrary={true}
      />

      <div className="space-y-2">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="font-medium">{check.stock_item_name}</div>
              <div className="text-sm text-neutral-400">
                Current: {check.checked_quantity}
              </div>
            </div>
            {check.status === 'low' && (
              <AlertCircle className="text-yellow-500" />
            )}
            {check.status === 'ok' && (
              <CheckCircle className="text-green-500" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onComplete(checks)}
        className="w-full bg-[#EC4899] text-white py-2 rounded-lg"
      >
        Complete Stock Check
      </button>
    </div>
  );
}
```

#### 4.2 Integrate into Opening/Closing Templates

Add `StockCheckTask` component to opening and closing SOP templates.

### Phase 5: Enhanced Features

#### 5.1 Library Item Sync

Create a function to sync library item changes to linked stock items:

```typescript
// src/lib/stockly/library-sync.ts

export async function syncLibraryItemToStockItems(libraryItemId: string, libraryType: string) {
  // Find all stock items linked to this library item
  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("id, name")
    .eq("library_item_id", libraryItemId)
    .eq("library_type", libraryType);

  // Update each stock item's name if library item name changed
  // (This would be triggered by a database trigger or webhook)
}
```

#### 5.2 Stock Level Alerts in Checkly Dashboard

Add stock level alerts to the main Checkly dashboard when items are low/out.

#### 5.3 Waste Logging from Stock Items

When logging waste in Stockly, allow selection from library items (which auto-creates stock items if needed).

---

## 📋 Implementation Checklist

### Database Migrations

- [ ] Create `04-stockly-library-integration.sql` migration
- [ ] Add `library_item_id` and `library_type` to `stock_items`
- [ ] Create `v_stock_items_with_library` view
- [ ] Add RLS policies for library integration

### Shared Utilities

- [ ] Create `src/lib/stockly/stock-utils.ts`
- [ ] Create `src/lib/stockly/library-sync.ts`
- [ ] Add TypeScript types for library integration

### UI Components

- [ ] Create `StockItemSelector` component
- [ ] Update `UnifiedLibrarySearch` to include stock_items
- [ ] Update `ManualDeliveryModal` to use `StockItemSelector`
- [ ] Update `StockItemsPage` to show library links
- [ ] Create `StockCheckTask` component for SOPs

### SOP Integration

- [ ] Add stock check task to opening template
- [ ] Add stock check task to closing template
- [ ] Create stock check completion flow

### Enhanced Features

- [ ] Add library sync function
- [ ] Add stock alerts to Checkly dashboard
- [ ] Integrate waste logging with library items

### Testing

- [ ] Test creating stock item from library item
- [ ] Test stock check in SOP templates
- [ ] Test library item sync
- [ ] Test stock level alerts

---

## 🎨 User Experience Flow

### Scenario 1: Creating Stock Item from Library

1. User goes to Stockly → Stock Items
2. Clicks "Add Stock Item"
3. Sees option: "Select from Library" or "Create New"
4. Selects "Select from Library"
5. `UnifiedLibrarySearch` opens
6. User searches for "Tomatoes" in ingredients library
7. Selects item
8. System creates stock item linked to library item
9. Stock item pre-populated with library data (name, unit, etc.)

### Scenario 2: Stock Check in Opening SOP

1. User opens Opening Procedure template
2. Sees "Stock Check" section
3. Uses `StockItemSelector` to add items to check
4. System shows current stock levels
5. Highlights low/out items
6. User completes check
7. Data saved to task completion record

### Scenario 3: Delivery with Library Items

1. User creates new delivery
2. Adds line item
3. Uses `StockItemSelector` to find item
4. Can search by library item name
5. If library item selected but no stock item exists, auto-creates one
6. Delivery line linked to stock item

---

## 🔄 Data Flow Diagram

```
Checkly Libraries          Stockly Stock Items          Stock Operations
─────────────────         ───────────────────         ────────────────
ingredients_library  ────> stock_items (linked)  ────> deliveries
chemicals_library    ────> stock_items (linked)  ────> stock_levels
ppe_library         ────> stock_items (linked)  ────> waste_logs
...                 ────> stock_items (linked)  ────> stock_counts
                                              ────> sales
```

---

## 🚀 Next Steps

1. **Review and approve this plan**
2. **Create database migration** (`04-stockly-library-integration.sql`)
3. **Build shared utilities** (`src/lib/stockly/stock-utils.ts`)
4. **Create StockItemSelector component**
5. **Update existing components** to use new integration
6. **Test end-to-end flows**
7. **Document for users**

---

## 📝 Notes

- **Backward Compatibility**: Existing stock items without library links will continue to work
- **Optional Linking**: Library linking is optional - users can still create stock items independently
- **Data Sync**: Consider adding triggers to sync library item name changes to stock items
- **Performance**: The unified view may need optimization for large datasets - consider materialized view
