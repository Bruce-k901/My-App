# Stockly-Checkly Integration Summary

## ✅ Completed

### 1. Integration Plan Document

- **File**: `STOCKLY_CHECKLY_INTEGRATION_PLAN.md`
- **Status**: Complete
- **Contents**: Comprehensive plan covering database schema, shared utilities, UI components, SOP integration, and implementation checklist

### 2. Database Migration

- **File**: `supabase/migrations/04-stockly-library-integration.sql`
- **Status**: Ready to run
- **Features**:
  - Adds `library_item_id` and `library_type` columns to `stock_items`
  - Creates indexes for fast lookups
  - Creates `v_stock_items_with_library` view
  - Adds helper function `get_library_item_name()`

### 3. Shared Stock Utilities

- **File**: `src/lib/stockly/stock-utils.ts`
- **Status**: Complete
- **Functions**:
  - `getLibraryItemName()` - Get name from library item based on type
  - `createStockItemFromLibrary()` - Create stock item from library item
  - `searchStockItemsWithLibrary()` - Search stock items with library data
  - `findOrCreateStockItemFromLibrary()` - Find existing or create new
  - `getStockItemWithLibrary()` - Get stock item with enriched library data

### 4. StockItemSelector Component

- **File**: `src/components/stockly/StockItemSelector.tsx`
- **Status**: Complete
- **Features**:
  - Toggle between library search and stock item search
  - Auto-creates stock items from library items
  - Shows library links for existing stock items
  - Filters purchasable items
  - Excludes already selected items

---

## 🚧 Next Steps (To Complete Integration)

### 1. Update ManualDeliveryModal

**File**: `src/components/stockly/ManualDeliveryModal.tsx`
**Action**: Replace stock item search with `StockItemSelector` component

```typescript
// Replace the stock item search section with:
<StockItemSelector
  onSelect={(stockItemId, item) => {
    // Handle selection
  }}
  allowCreateFromLibrary={true}
  filterPurchasable={true}
/>
```

### 2. Update StockItemsPage

**File**: `src/app/dashboard/stockly/stock-items/page.tsx`
**Action**:

- Add "Link to Library" button in the modal
- Show library link column in the table
- Add option to create from library when adding new item

### 3. Create Stock Check Task Component

**File**: `src/components/sops/StockCheckTask.tsx`
**Action**: Create component for stock checks in opening/closing SOPs

### 4. Integrate into SOP Templates

**Files**:

- `src/app/dashboard/sops/opening-template/page.tsx`
- `src/app/dashboard/sops/closing-template/page.tsx`
  **Action**: Add `StockCheckTask` component to templates

### 5. Update UnifiedLibrarySearch (Optional Enhancement)

**File**: `src/components/UnifiedLibrarySearch.tsx`
**Action**: Add option to show linked stock items when searching libraries

---

## 📋 Testing Checklist

After running migration `04-stockly-library-integration.sql`:

- [ ] Verify `library_item_id` and `library_type` columns exist in `stock_items`
- [ ] Test creating stock item from library item using `StockItemSelector`
- [ ] Test searching stock items that are linked to libraries
- [ ] Verify `v_stock_items_with_library` view works correctly
- [ ] Test `findOrCreateStockItemFromLibrary()` function
- [ ] Test stock check task in SOP templates
- [ ] Verify delivery creation with library-linked stock items

---

## 🎯 Usage Examples

### Example 1: Create Stock Item from Library

```typescript
import { StockItemSelector } from '@/components/stockly/StockItemSelector';

<StockItemSelector
  onSelect={(stockItemId, item) => {
    console.log('Selected:', item.name);
    console.log('Library data:', item.library_data);
  }}
  allowCreateFromLibrary={true}
/>
```

### Example 2: Use in Delivery Modal

```typescript
import { StockItemSelector } from '@/components/stockly/StockItemSelector';

// In ManualDeliveryModal component
<StockItemSelector
  onSelect={(stockItemId, item) => {
    addDeliveryLine({
      stock_item_id: stockItemId,
      description: item.name,
      // ... other fields
    });
  }}
  filterPurchasable={true}
  selectedItems={formData.lines.map(l => l.stock_item_id).filter(Boolean)}
/>
```

### Example 3: Programmatic Creation

```typescript
import { findOrCreateStockItemFromLibrary } from "@/lib/stockly/stock-utils";

const { id, created } = await findOrCreateStockItemFromLibrary(
  libraryItemId,
  "ingredients_library",
  companyId,
);

if (created) {
  console.log("New stock item created");
} else {
  console.log("Using existing stock item");
}
```

---

## 🔄 Data Flow

```
User Action                    Component                    Result
─────────────────             ───────────                  ───────
Search library item    →    StockItemSelector    →    Auto-create stock item
                                                          (if not exists)
                                                          Link stock item
                                                          to library item

Select stock item      →    StockItemSelector    →    Return stock item
                                                          with library data

Create delivery        →    ManualDeliveryModal  →    Use StockItemSelector
                                                          to find/create items

Stock check in SOP     →    StockCheckTask       →    Check stock levels
                                                          Show library info
```

---

## 📝 Notes

- **Backward Compatibility**: All existing stock items without library links continue to work
- **Optional Linking**: Library linking is optional - users can still create stock items independently
- **Performance**: The unified view may need optimization for large datasets
- **Future Enhancements**: Consider adding triggers to sync library item name changes to stock items

---

## 🚀 Quick Start

1. **Run Migration**:

   ```sql
   -- In Supabase SQL Editor
   -- Run: supabase/migrations/04-stockly-library-integration.sql
   ```

2. **Use StockItemSelector**:

   ```typescript
   import { StockItemSelector } from "@/components/stockly/StockItemSelector";
   ```

3. **Use Utilities**:
   ```typescript
   import { findOrCreateStockItemFromLibrary } from "@/lib/stockly/stock-utils";
   ```

---

## 📚 Related Files

- `STOCKLY_CHECKLY_INTEGRATION_PLAN.md` - Full integration plan
- `supabase/migrations/04-stockly-library-integration.sql` - Database migration
- `src/lib/stockly/stock-utils.ts` - Shared utilities
- `src/components/stockly/StockItemSelector.tsx` - UI component
