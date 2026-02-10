# Archive Page Specification

This document defines the standard implementation for archive functionality across all pages in the application. Any new archive pages MUST follow this specification exactly.

## Overview

Archive pages provide a toggle view between active and archived items, with specific UI/UX patterns that must be consistently implemented.

## Required Components

### 1. Toggle Button (Archive/Back Button)

**Location**: In the `customActions` prop of `EntityPageLayout`

**Implementation**:

```tsx
<Tooltip.Provider delayDuration={100}>
  <Tooltip.Root key={viewArchived ? "chevron" : "archive"}>
    <Tooltip.Trigger asChild>
      <IconButton
        ariaLabel={viewArchived ? "Back to [Entity Name]" : "View Archived"}
        onClick={() => setViewArchived(!viewArchived)}
        variant={viewArchived ? "magentaOutline" : "orangeOutline"}
      >
        {viewArchived ? <ChevronLeft className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
      </IconButton>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        align="center"
        sideOffset={6}
        className={`text-xs px-2 py-1 rounded-md border shadow-[0_0_10px] bg-[#0f0f12] transition z-50 ${
          viewArchived
            ? "border-[#EC4899] text-[#EC4899] shadow-[0_0_10px_rgba(236,72,153,0.7)]"
            : "border-orange-400 text-orange-400 shadow-[0_0_6px_#fb923c]"
        }`}
      >
        {viewArchived ? "Back to [Entity Name]" : "Archived"}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

**Required Features**:

- Uses `ChevronLeft` icon when in archive view, `Archive` icon when in normal view
- `magentaOutline` variant when in archive view, `orangeOutline` when in normal view
- Tooltip with Portal wrapper for proper rendering
- Magenta styling for archive view tooltip, orange for normal view tooltip
- Proper z-index (`z-50`) for tooltip visibility

### 2. Action Button Behavior

**Requirement**: When `viewArchived` is true, disable/hide the following buttons:

- Upload button (`onUpload={viewArchived ? undefined : handleUploadFunction}`)
- Download button (`onDownload={viewArchived ? undefined : handleDownloadFunction}`)
- Add button (`onAdd={viewArchived ? undefined : handleAddFunction}`)

### 3. Archive Card Styling

**Required Card Structure**:

```tsx
<div className="border border-neutral-700 bg-neutral-900/60 rounded-xl p-4 text-neutral-300 hover:border-orange-500 hover:shadow-[0_0_12px_rgba(249,115,22,0.6)] transition-all duration-200">
  {/* Card content */}
</div>
```

**Required Features**:

- Base styling: `border-neutral-700`, `bg-neutral-900/60`, `rounded-xl`, `p-4`, `text-neutral-300`
- Hover effects: `hover:border-orange-500`, `hover:shadow-[0_0_12px_rgba(249,115,22,0.6)]`
- Smooth transitions: `transition-all duration-200`
- Orange glow effect on hover

### 4. Restore Button

**Required Implementation**:

```tsx
<button
  onClick={async () => {
    if (!confirm("Restore this [entity]? They'll be moved back to active [entities].")) return;
    try {
      await unarchiveFunction(item.id);
      showToast({ title: "[Entity] restored", type: "success" });
      await loadFunction();
    } catch (error: any) {
      showToast({
        title: "Restore failed",
        description: error?.message || "Failed to restore [entity]",
        type: "error",
      });
    }
  }}
  className="mt-3 px-3 py-2 border border-pink-500 text-pink-400 rounded-md hover:bg-pink-500 hover:text-white transition"
>
  Restore [Entity]
</button>
```

**Required Features**:

- Pink/magenta color scheme: `border-pink-500`, `text-pink-400`
- Hover effects: `hover:bg-pink-500`, `hover:text-white`
- Confirmation dialog before restore action
- Toast notifications for success/error states
- Reload data after successful restore

## Color Scheme Standards

### Archive View (viewArchived = true)

- **Toggle Button**: Magenta outline variant
- **Tooltip**: Magenta border (`border-[#EC4899]`), magenta text (`text-[#EC4899]`), magenta glow (`shadow-[0_0_10px_rgba(236,72,153,0.7)]`)
- **Cards**: Orange hover effects (`hover:border-orange-500`, orange glow)
- **Restore Button**: Pink/magenta styling

### Normal View (viewArchived = false)

- **Toggle Button**: Orange outline variant
- **Tooltip**: Orange border (`border-orange-400`), orange text (`text-orange-400`), orange glow (`shadow-[0_0_6px_#fb923c]`)

## State Management

**Required State**:

```tsx
const [viewArchived, setViewArchived] = useState(false);
```

**Required Data Loading**:

- Separate functions for loading active and archived items
- Conditional rendering based on `viewArchived` state
- Empty state handling for both active and archived views

## Implementation Checklist

When implementing archive functionality on any page, ensure:

- [ ] Toggle button with correct icons and variants
- [ ] Tooltip with Portal wrapper and proper styling
- [ ] Action buttons disabled in archive view
- [ ] Archive cards with orange hover effects
- [ ] Restore button with pink styling and confirmation
- [ ] Toast notifications for restore actions
- [ ] Proper state management
- [ ] Empty state handling
- [ ] Consistent color scheme throughout

## Notes

- This specification is **LOCKED** and must not be modified
- All future archive implementations must follow this exact pattern
- Any deviations from this specification are not permitted
- The color scheme and hover effects are standardized and must be maintained

## Reference Implementation

The definitive reference implementation can be found in:
`src/app/organization/users/page.tsx` (lines 520-720)

This file serves as the canonical example of proper archive page implementation.
