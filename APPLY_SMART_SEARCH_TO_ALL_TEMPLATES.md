# Apply SmartSearch to All Templates

## Quick Guide

SmartSearch is now available across all templates. To use it, simply:

### Step 1: Import SmartSearch
```tsx
import SmartSearch from '@/components/SmartSearch';
```

### Step 2: Replace `<select>` with `<SmartSearch>`

**Before:**
```tsx
<select
  value={item.drink_id}
  onChange={(e) => updateItem(e.target.value)}
  className="..."
>
  <option value="">Select...</option>
  {library.map(l => (
    <option key={l.id} value={l.id}>{l.item_name}</option>
  ))}
</select>
```

**After:**
```tsx
<SmartSearch
  libraryTable="drinks_library"
  placeholder="Search drinks..."
  onSelect={(item) => updateItem(item.id)}
  allowMultiple={false}
/>
```

## Templates That Need Updates

### ✅ Already Done
- Food SOP template - Ingredients section

### 🔄 To Update
1. **Drinks Template** (`drinks-template/page.tsx`)
   - Spirits dropdown → `drinks_library` (filter by category='Spirit')
   - Mixers dropdown → `drinks_library` (filter by category='Mixer')
   - Garnishes dropdown → `drinks_library` (filter by category='Garnish')
   - Disposables dropdown → `disposables_library`

2. **Hot Drinks Template** (`hot-drinks-template/page.tsx`)
   - Beverages dropdown → `drinks_library` (filter by category='Hot Beverages')
   - Disposables dropdown → `disposables_library`

3. **Cold Drinks Template** (`cold-drinks-template/page.tsx`)
   - Beverages dropdown → `drinks_library` (filter by category='Cold Beverages')
   - Disposables dropdown → `disposables_library`

4. **Cleaning Template** (`cleaning-template/page.tsx`)
   - Chemicals dropdown → `chemicals_library`
   - PPE dropdown → `ppe_library`
   - Equipment dropdown → `equipment_library`

5. **Service Template** (`service-template/page.tsx`)
   - Disposables dropdown → `disposables_library`

## Pattern for Each Template

1. Add SmartSearch import
2. Identify which library each dropdown uses
3. Replace `<select>` with `<SmartSearch>`
4. Pass correct `libraryTable` prop
5. Handle `onSelect` to update state

## Example: Drinks Template Spirits

```tsx
// Add state for recent items
const [recentSpirits, setRecentSpirits] = useState([]);

// Add handler
const handleSpiritSelect = (drink, targetId) => {
  setRecentSpirits(prev => {
    const filtered = prev.filter(item => item.id !== drink.id);
    return [drink, ...filtered].slice(0, 5);
  });
  
  const drink = drinksLibrary.find(d => d.id === drink.id);
  setSpirits(spirits.map(s => 
    s.id === targetId ? { 
      ...s, 
      drink_id: drink.id, 
      abv: drink?.abv || "",
      allergens: drink?.allergens || []
    } : s
  ));
};

// Replace dropdown
<SmartSearch
  libraryTable="drinks_library"
  placeholder="Search spirits..."
  onSelect={(drink) => handleSpiritSelect(drink, spirit.id)}
  recentItems={recentSpirits}
  allowMultiple={false}
  currentSelected={spirit.drink_id ? [drinksLibrary.find(d => d.id === spirit.drink_id)] : []}
/>
```

## Benefits

- ✅ Consistent UX across all templates
- ✅ Fast search as you type
- ✅ Keyboard navigation
- ✅ Recent items tracking
- ✅ Clean, readable results
- ✅ No category clutter

## Status

**SmartSearch component is ready and working!**

Just needs to be integrated into remaining templates following the pattern above.

