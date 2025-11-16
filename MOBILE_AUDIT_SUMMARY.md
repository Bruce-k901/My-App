# Mobile Audit Summary

## ✅ Completed

### 1. Temperature Inputs for Negative Numbers

**Fixed:** All temperature input fields now support negative numbers on mobile devices.

**Files Updated:**

- `src/components/templates/features/TemperatureLoggingFeature.tsx`
- `src/components/assets/AssetForm.tsx` (working_temp_min, working_temp_max)
- `src/components/StorageInfoComponent.tsx` (temp_min, temp_max)
- `src/app/dashboard/sops/food-template/page.tsx` (process step temperature)

**Solution:** Changed from `type="number"` to `type="text"` with:

- `inputMode="decimal"` - Shows numeric keyboard on mobile
- `pattern="-?[0-9]*\.?[0-9]*"` - Allows negative numbers and decimals
- Custom onChange handler to validate input

### 2. Dropdown Menus - White Text on Dark Backgrounds

**In Progress:** Standardizing all dropdown menus across SOP templates.

**Standard Classes Applied:**

```css
className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 hover:bg-neutral-800 transition-colors"
```

**Option Classes:**

```html
<option value="..." className="bg-neutral-900 text-white">...</option>
```

**Files Updated:**

- `src/app/dashboard/sops/opening-template/page.tsx` (Status, Site, Equipment, Safety Check status)

**Files Still Need Updates:**

- `src/app/dashboard/sops/closing-template/page.tsx`
- `src/app/dashboard/sops/food-template/page.tsx`
- `src/app/dashboard/sops/hot-drinks-template/page.tsx`
- `src/app/dashboard/sops/cold-drinks-template/page.tsx`
- `src/app/dashboard/sops/service-template/page.tsx`
- `src/app/dashboard/sops/cleaning-template/page.tsx`
- `src/app/dashboard/sops/drinks-template/page.tsx`
- All other pages with native `<select>` elements

## 🔄 In Progress

### 3. SOP Templates Mobile Responsiveness

**Status:** Started with opening-template, needs completion across all templates.

**Changes Needed:**

- Replace `grid-cols-2` with `grid-cols-1 md:grid-cols-2` for responsive grids
- Replace `grid-cols-12` with `grid-cols-1 md:grid-cols-12` for complex grids
- Add mobile-friendly spacing: `p-4 md:p-6`
- Ensure buttons are full-width on mobile: `w-full md:w-auto`
- Test form inputs on mobile viewports

**Files Updated:**

- `src/app/dashboard/sops/opening-template/page.tsx` (partial)

**Files Still Need Updates:**

- All other SOP template pages

## 📋 To Do

### 4. General Mobile Performance Audit

**Status:** Not started

**Areas to Check:**

- All page.tsx files in `src/app/dashboard/`
- All modal components in `src/components/`
- Form layouts and inputs
- Button sizes and touch targets (min 44x44px)
- Scrollable areas with proper overflow handling
- Image optimization for mobile
- Font sizes (ensure readable on small screens)
- Spacing and padding adjustments

**Key Files to Audit:**

- All pages in `src/app/dashboard/`
- All modals in `src/components/`
- Form components
- Table/list components

## 🛠️ Utility Components Created

### StyledSelect Component

**Location:** `src/components/ui/StyledSelect.tsx`

**Usage:**

```tsx
import StyledSelect, { StyledOption } from "@/components/ui/StyledSelect";

<StyledSelect value={value} onChange={handleChange}>
  <StyledOption value="">Select...</StyledOption>
  <StyledOption value="option1">Option 1</StyledOption>
</StyledSelect>;
```

## 📝 Next Steps

1. **Complete dropdown fixes** - Update all remaining `<select>` elements in SOP templates
2. **Complete mobile responsiveness** - Add responsive classes to all SOP template grids
3. **General mobile audit** - Review all pages and modals for mobile optimization
4. **Testing** - Test on actual mobile devices/browsers

## 🔍 Search Patterns for Finding Issues

```bash
# Find all native select elements
grep -r "<select" src/app/dashboard/sops

# Find temperature inputs
grep -r "type=\"number\".*temp\|temp.*type=\"number\"" src/

# Find grid layouts that need mobile fixes
grep -r "grid-cols-[0-9]" src/app/dashboard/sops
```
