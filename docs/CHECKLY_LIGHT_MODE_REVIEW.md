# Checkly Module Light Mode Review

## Status: In Progress
Last Updated: Current Session

## Completed Pages ✅

### Tasks Module
- ✅ `/dashboard/tasks/compliance/page.tsx` - Fully updated
- ✅ `/dashboard/tasks/templates/page.tsx` - Fully updated  
- ✅ `/dashboard/tasks/active/page.tsx` - Fully updated
- ✅ `/dashboard/tasks/completed/page.tsx` - Fully updated
- ✅ `/dashboard/tasks/page.tsx` - Fully updated

## Remaining Pages (Need Light Mode Updates) ⏳

### Tasks Module (3 remaining)
- ⏳ `/dashboard/tasks/view/[id]/page.tsx`
- ⏳ `/dashboard/tasks/my-tasks/page.tsx`
- ⏳ `/dashboard/tasks/templates/builder/page.tsx`

### Checklists Module (3 files)
- ⏳ `/dashboard/checklists/page.tsx` (1500+ lines - large file)
- ⏳ `/dashboard/checklists/templates/page.tsx`
- ⏳ `/dashboard/checklists/templates/card1/page.tsx`

### SOPs Module (20 files)
**Main Pages:**
- ⏳ `/dashboard/sops/page.tsx`
- ⏳ `/dashboard/sops/list/page.tsx`
- ⏳ `/dashboard/sops/templates/page.tsx`
- ⏳ `/dashboard/sops/archive/page.tsx`
- ⏳ `/dashboard/sops/risk-assessments/page.tsx`
- ⏳ `/dashboard/sops/view/[id]/page.tsx`
- ⏳ `/dashboard/sops/view/[id]/print/page.tsx`
- ⏳ `/dashboard/sops/my-ras/page.tsx`
- ⏳ `/dashboard/sops/ra-templates/page.tsx`
- ⏳ `/dashboard/sops/coshh/page.tsx`

**Template Pages:**
- ⏳ `/dashboard/sops/food-template/page.tsx`
- ⏳ `/dashboard/sops/service-template/page.tsx`
- ⏳ `/dashboard/sops/opening-template/page.tsx`
- ⏳ `/dashboard/sops/closing-template/page.tsx`
- ⏳ `/dashboard/sops/cleaning-template/page.tsx`
- ⏳ `/dashboard/sops/drinks-template/page.tsx`
- ⏳ `/dashboard/sops/cold-drinks-template/page.tsx`
- ⏳ `/dashboard/sops/cold-beverages-template/page.tsx`
- ⏳ `/dashboard/sops/hot-drinks-template/page.tsx`
- ⏳ `/dashboard/sops/hot-beverages-template/page.tsx`

### Incidents Module (5 files)
- ⏳ `/dashboard/incidents/page.tsx`
- ⏳ `/dashboard/incidents/customer-complaints/page.tsx`
- ⏳ `/dashboard/incidents/food-poisoning/page.tsx`
- ⏳ `/dashboard/incidents/staff-sickness/page.tsx`
- ⏳ `/dashboard/incidents/storage/page.tsx`

### Assets Module (3 files)
- ⏳ `/dashboard/assets/page.tsx`
- ⏳ `/dashboard/assets/callout-logs/page.tsx`
- ⏳ `/dashboard/assets/contractors/page.tsx`

### Logs Module (3 files)
- ⏳ `/dashboard/logs/page.tsx`
- ⏳ `/dashboard/logs/attendance/page.tsx`
- ⏳ `/dashboard/logs/temperature/page.tsx`

### Compliance Module (2 files)
- ⏳ `/dashboard/eho-report/page.tsx`
- ⏳ `/dashboard/compliance/eho/page.tsx`

### Organization/General Pages (8 files)
- ⏳ `/dashboard/business/page.tsx`
- ⏳ `/dashboard/sites/page.tsx`
- ⏳ `/dashboard/documents/page.tsx`
- ⏳ `/dashboard/training/page.tsx`
- ⏳ `/dashboard/users/page.tsx`
- ⏳ `/dashboard/calendar/page.tsx`
- ⏳ `/dashboard/messaging/page.tsx`
- ⏳ `/dashboard/reports/page.tsx`
- ⏳ `/dashboard/todays_tasks/page.tsx`
- ⏳ `/dashboard/ppm/page.tsx`

### Other Checkly Pages (7 files)
- ⏳ `/dashboard/libraries/page.tsx`
- ⏳ `/dashboard/compliance-templates/page.tsx`
- ⏳ `/dashboard/coshh-data/page.tsx`
- ⏳ `/dashboard/courses/page.tsx`
- ⏳ `/dashboard/risk-assessments/page.tsx`
- ⏳ `/dashboard/my_tasks/page.tsx`
- ⏳ `/dashboard/my_templates/page.tsx`

**Total Remaining: ~58 pages**

## Update Patterns

### 1. Main Container
```tsx
// OLD:
<div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">

// NEW:
<div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#0f1220] text-[rgb(var(--text-primary))] dark:text-white border border-[rgb(var(--border))] dark:border-neutral-800 rounded-xl p-8">
```

### 2. Text Colors
```tsx
// OLD:
text-white → text-[rgb(var(--text-primary))] dark:text-white
text-white/60 → text-[rgb(var(--text-secondary))] dark:text-white/60
text-white/40 → text-[rgb(var(--text-tertiary))] dark:text-white/40
text-white/80 → text-[rgb(var(--text-primary))] dark:text-white/80
text-white/20 → text-[rgb(var(--text-tertiary))] dark:text-white/20
```

### 3. Backgrounds & Borders
```tsx
// OLD:
bg-white/[0.03] → bg-theme-surface dark:bg-white/[0.03]
border-white/[0.06] → border-theme dark:border-white/[0.06]
bg-white/[0.05] → bg-theme-button dark:bg-white/[0.05]
hover:bg-white/[0.08] → hover:bg-theme-button-hover dark:hover:bg-white/[0.08]
```

### 4. Status/Color Badges
```tsx
// OLD:
text-green-400 → text-green-600 dark:text-green-400
text-red-400 → text-red-600 dark:text-red-400
text-yellow-400 → text-yellow-600 dark:text-yellow-400
text-blue-400 → text-blue-600 dark:text-blue-400
text-orange-400 → text-orange-600 dark:text-orange-400
text-pink-400 → text-pink-600 dark:text-pink-400

// For badge backgrounds:
bg-green-500/10 → bg-green-100 dark:bg-green-500/10
text-green-400 → text-green-700 dark:text-green-400
border-green-500/20 → border-green-300 dark:border-green-500/20
```

### 5. Input Fields
```tsx
// OLD:
className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-white/40"

// NEW:
className="w-full pl-10 pr-4 py-2 bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.1] rounded-lg text-theme-primary dark:text-white placeholder:text-theme-tertiary dark:placeholder-white/40"
```

### 6. Buttons (Standard Checkly Style)
```tsx
// OLD:
className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"

// NEW:
className="p-1.5 rounded hover:bg-black/[0.05] dark:hover:bg-white/10 text-[rgb(var(--text-tertiary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white"
```

## Quick Find/Replace Patterns

Use these regex patterns in your editor:

**Find:** `bg-\[#0f1220\]`
**Replace:** `bg-[rgb(var(--surface-elevated))] dark:bg-[#0f1220]`

**Find:** `text-white[^/]`
**Replace:** `text-[rgb(var(--text-primary))] dark:text-white`

**Find:** `text-white/60`
**Replace:** `text-[rgb(var(--text-secondary))] dark:text-white/60`

**Find:** `text-white/40`
**Replace:** `text-[rgb(var(--text-tertiary))] dark:text-white/40`

**Find:** `bg-white/\[0\.03\]`
**Replace:** `bg-theme-surface dark:bg-white/[0.03]`

**Find:** `border-white/\[0\.06\]`
**Replace:** `border-theme dark:border-white/[0.06]`

**Find:** `hover:bg-white/\[0\.08\]`
**Replace:** `hover:bg-theme-button-hover dark:hover:bg-white/[0.08]`

## Priority Order

1. **High Priority** (Most Used):
   - Checklists main page
   - Today's Tasks page
   - SOPs list page
   - Incidents main page
   - Assets main page

2. **Medium Priority**:
   - Task detail/view pages
   - SOPs templates and archive
   - Remaining incidents pages
   - Logs pages

3. **Lower Priority**:
   - Template builder pages
   - Organization/admin pages
   - Archive/specialty pages

## Testing Checklist

After updating each page:
- [ ] Toggle between light/dark mode
- [ ] Verify all text is readable in both modes
- [ ] Check button/input contrast
- [ ] Verify status badges are visible
- [ ] Test hover states
- [ ] Check empty states
- [ ] Verify loading states

## Notes

- Some pages may use custom components that need separate updates
- Watch for inline styles that might override theme classes
- Some pages may share components - update those once for multiple pages
- Large files (1500+ lines) should be updated section by section
