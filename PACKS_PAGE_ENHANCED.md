# ✅ Onboarding Packs Page - Enhanced with Document Viewer

## What Changed

Enhanced the Onboarding Packs page to show documents in each pack with an expandable accordion view.

### New Features

1. **Expandable Pack Cards**
   - Click the chevron icon to expand/collapse each pack
   - Shows all documents in the pack inline
   - No need to select a pack to see what's inside

2. **Document Count Display**
   - Each pack card shows how many documents it contains
   - Format: "FOH • hourly • 5 docs"

3. **Quick Document Preview**
   - Expandable section shows:
     - Document name
     - Required/Optional status
     - File icon for visual clarity

4. **Edit Button**
   - "Edit" button on each pack card
   - Opens the detailed editor panel on the right
   - Allows adding/removing documents
   - Toggle required/optional status

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Onboarding Packs                    [+ Create Pack] │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Packs (4)                                            │
│ ┌──────────────────────────────────────────┐        │
│ │ ▼ FOH - Hourly Staff              [Edit] │        │
│ │   FOH • hourly • 5 docs                  │        │
│ │ ┌────────────────────────────────────┐   │        │
│ │ │ 📄 Employment Contract - FOH        │   │        │
│ │ │    Required                         │   │        │
│ │ │ 📄 Staff Handbook                   │   │        │
│ │ │    Required                         │   │        │
│ │ │ 📄 Uniform Policy                   │   │        │
│ │ │    Optional                         │   │        │
│ │ └────────────────────────────────────┘   │        │
│ └──────────────────────────────────────────┘        │
│                                                       │
│ ┌──────────────────────────────────────────┐        │
│ │ ▶ BOH - Hourly Staff              [Edit] │        │
│ │   BOH • hourly • 6 docs                  │        │
│ └──────────────────────────────────────────┘        │
│                                                       │
│ ┌──────────────────────────────────────────┐        │
│ │ ▶ FOH - Salaried                  [Edit] │        │
│ │   FOH • salaried • 7 docs                │        │
│ └──────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## How to Use

1. **View Documents in a Pack**
   - Click the chevron (▶) to expand
   - Click again to collapse

2. **Edit a Pack**
   - Click the "Edit" button
   - Detailed editor opens showing all documents
   - Add new documents from the dropdown
   - Remove documents with the "Remove" button
   - Toggle required/optional status

3. **Create New Pack**
   - Click "+ Create New Pack" button at the top
   - Fill in pack details
   - Add documents after creation using the Edit panel

## Technical Changes

### File Modified
`src/app/dashboard/people/onboarding/packs/page.tsx`

### New State
```typescript
const [expandedPackIds, setExpandedPackIds] = useState<Set<string>>(new Set())
```

### New Functions
```typescript
const togglePackExpanded = (packId: string) => {
  // Toggles expansion state for a pack
}

const getPackDocCount = (packId: string) => {
  // Returns number of documents in a pack
}
```

### New Icons
- `ChevronDown` - Expanded state
- `ChevronRight` - Collapsed state

## Benefits

1. **Quick Overview** - See all pack contents at a glance
2. **Better UX** - No need to click into each pack to see what's inside
3. **Visual Clarity** - Document count shows completeness
4. **Easy Navigation** - Expand/collapse keeps the page organized
5. **Dual View** - Quick view (accordion) + detailed editor (side panel)

---

**Status:** ✅ Complete  
**Date:** December 16, 2024
