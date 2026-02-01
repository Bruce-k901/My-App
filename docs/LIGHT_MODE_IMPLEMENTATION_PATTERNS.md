# Light Mode Implementation Patterns

This document outlines the patterns and utilities for implementing light mode across the application. Following these patterns ensures consistent theming and automatic light/dark mode support.

## Overview

The application uses CSS variables (`--text-primary`, `--surface`, etc.) combined with Tailwind's `dark:` prefix to support both light and dark themes. The theme toggle adds/removes the `dark` class on the root element.

## CSS Variables

All theme colors are defined in `src/app/globals.css`:

### Dark Mode (default)
```css
:root {
  --background: 10 10 10;
  --text-primary: 255 255 255;
  --text-secondary: 255 255 255 / 0.8;
  --text-tertiary: 255 255 255 / 0.6;
  --surface: 26 26 26;
  --surface-elevated: 42 42 42;
  --border: 255 255 255 / 0.06;
  --border-hover: 255 255 255 / 0.12;
}
```

### Light Mode
```css
.light {
  --background: 250 250 247; /* Warm light gray #FAFAF7 */
  --text-primary: 17 17 19; /* Dark gray #111113 */
  --text-secondary: 55 55 55; /* Medium gray #373737 */
  --text-tertiary: 82 82 82; /* Gray #525252 */
  --surface: 255 255 255; /* White */
  --surface-elevated: 255 255 255; /* White */
  --border: 0 0 0 / 0.12; /* Dark border */
  --border-hover: 0 0 0 / 0.18; /* Darker border */
}
```

## Pattern 1: CSS Variable Classes (Recommended)

### Text Colors
```tsx
// Primary text
className="text-[rgb(var(--text-primary))] dark:text-white"

// Secondary text  
className="text-[rgb(var(--text-secondary))] dark:text-white/60"

// Tertiary text
className="text-[rgb(var(--text-tertiary))] dark:text-white/40"
```

### Backgrounds
```tsx
// Card backgrounds
className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03]"

// Surface backgrounds
className="bg-[rgb(var(--surface))] dark:bg-white/[0.05]"

// Main background
className="bg-[rgb(var(--background))] dark:bg-[#0a0a0a]"
```

### Borders
```tsx
// Standard borders
className="border border-[rgb(var(--border))] dark:border-white/[0.06]"

// Hover borders
className="border border-[rgb(var(--border-hover))] dark:border-white/[0.1]"
```

### Button/Surface Backgrounds
```tsx
// Subtle button backgrounds
className="bg-black/[0.03] dark:bg-white/[0.03]"
className="bg-black/[0.05] dark:bg-white/[0.05]"
className="bg-black/[0.08] dark:bg-white/[0.08]"
```

## Pattern 2: Utility Classes (Alternative)

CSS utility classes are available in `globals.css` for common patterns:

```tsx
// Text
className="text-theme-primary"      // Primary text color
className="text-theme-secondary"    // Secondary text color
className="text-theme-tertiary"     // Tertiary text color

// Backgrounds
className="bg-theme-surface"         // Surface background
className="bg-theme-surface-elevated" // Elevated/card background

// Borders
className="border-theme"              // Standard border
className="border-theme-hover"        // Hover border

// Buttons
className="bg-theme-button"           // Button background
className="bg-theme-button-hover"     // Button hover background
```

## Color Replacement Patterns

### Replace These Patterns

| Old (Dark Only) | New (Theme-Aware) |
|----------------|-------------------|
| `text-white` | `text-[rgb(var(--text-primary))] dark:text-white` |
| `text-white/60` | `text-[rgb(var(--text-secondary))] dark:text-white/60` |
| `text-white/40` | `text-[rgb(var(--text-tertiary))] dark:text-white/40` |
| `bg-white/[0.03]` | `bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03]` |
| `bg-white/[0.05]` | `bg-[rgb(var(--surface))] dark:bg-white/[0.05]` |
| `border-white/[0.06]` | `border-[rgb(var(--border))] dark:border-white/[0.06]` |
| `border-white/[0.1]` | `border-[rgb(var(--border-hover))] dark:border-white/[0.1]` |

### Colored Text (Accent Colors)

| Old | New (Light Mode Compatible) |
|-----|----------------------------|
| `text-pink-400` | `text-pink-600 dark:text-pink-400` (darker in light mode) |
| `text-[#EC4899]` | Keep as-is (works in both modes) |

## Component Update Priority

### Priority 1: Shared UI Components (High Impact) ✅ COMPLETE
Update these first - they cascade to all pages:
- ✅ `src/components/ui/Card.tsx` - Done
- ✅ `src/components/ui/Button.tsx` - Done
- ✅ `src/components/ui/Input.tsx` - Done
- ✅ `src/components/ui/GlassCard.tsx` - Done
- ✅ `src/components/ui/Select.tsx` - Done
- ✅ `src/components/ui/Textarea.tsx` - Done
- ⏳ `src/components/ui/Checkbox.tsx` - Pending (update when needed)

### Priority 2: Layout Components (High Visibility)
- ✅ `src/components/layout/Header.tsx` - Done
- ✅ `src/components/layout/ModuleBar.tsx` - Done
- ✅ `src/components/layout/ContextSwitcher.tsx` - Done
- ✅ `src/components/layout/SiteFilter.tsx` - Done
- ✅ `src/components/layout/ProfileDropdown.tsx` - Done
- ✅ `src/components/layout/SearchBar.tsx` - Done
- ✅ `src/components/layout/MessageButton.tsx` - Done
- ✅ `src/components/layout/ThemeToggle.tsx` - Done

### Priority 3: Dashboard Components (Already Done)
- ✅ `src/components/dashboard/WelcomeHeader.tsx`
- ✅ `src/components/dashboard/ComplianceMetricsWidget.tsx`
- ✅ `src/components/dashboard/AssetOverview.tsx`
- ✅ `src/components/dashboard/MetricsGrid.tsx`
- ✅ `src/components/dashboard/AlertsFeed.tsx`

### Priority 4: Module-Specific Pages (As Needed)
Update module pages gradually when users report issues or when making changes to those pages.

## Step-by-Step Component Update Process

### Step 1: Find Hardcoded Colors
Search for these patterns:
```bash
grep -r "text-white\|bg-white/\[0\." path/to/component
```

### Step 2: Replace with Theme-Aware Classes
Use the patterns above to replace:
- `text-white` → `text-[rgb(var(--text-primary))] dark:text-white`
- `bg-white/[0.03]` → `bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03]`
- etc.

### Step 3: Test Both Themes
1. Toggle to light mode and verify readability
2. Toggle to dark mode and verify nothing broke
3. Check contrast ratios (WCAG AA minimum)

### Step 4: Use Shared Components When Possible
Instead of creating custom styled divs, use:
- `<Card>` instead of custom card divs
- `<Button>` instead of custom buttons
- `<Input>` instead of custom inputs

## Common Patterns by Element Type

### Cards/Containers
```tsx
// Standard card
<div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
  <h3 className="text-[rgb(var(--text-primary))] dark:text-white">Title</h3>
  <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">Description</p>
</div>
```

### Buttons
```tsx
// Use the Button component
<Button variant="primary">Click Me</Button>

// Or custom button
<button className="bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.1] text-theme-primary dark:text-white hover:bg-theme-button-hover dark:hover:bg-white/[0.08]">
  Click Me
</button>
```

### Input Fields
```tsx
// Use the Input component
<Input placeholder="Enter text" />

// Or custom input
<input className="bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.12] text-theme-primary dark:text-white placeholder:text-theme-tertiary dark:placeholder:text-white/40" />
```

### Tables
```tsx
<table className="w-full">
  <thead className="border-b border-theme dark:border-white/[0.1]">
    <tr>
      <th className="text-theme-secondary dark:text-white/60">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-theme dark:border-white/[0.05]">
      <td className="text-theme-primary dark:text-white/80">Data</td>
    </tr>
  </tbody>
</table>
```

## Colored Elements (Alerts, Status, etc.)

For colored backgrounds (alerts, badges, etc.), use theme-aware colors:

```tsx
// Red/Alerts
className="bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300"

// Yellow/Warnings
className="bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300"

// Green/Success
className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300"

// Blue/Info
className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300"
```

## Testing Checklist

When updating a component:
- [ ] Text is readable in light mode (dark text on light background)
- [ ] Text is readable in dark mode (light text on dark background)
- [ ] Borders are visible in both modes
- [ ] Buttons have appropriate hover states in both modes
- [ ] Colored elements (alerts, badges) are vibrant in both modes
- [ ] No hydration mismatches (check console)
- [ ] Accessibility: contrast ratios meet WCAG AA standards

## Quick Reference: Common Replacements

```tsx
// ❌ Don't do this (dark only)
<div className="bg-white/[0.03] text-white border-white/[0.06]">

// ✅ Do this (theme-aware)
<div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] text-[rgb(var(--text-primary))] dark:text-white border border-[rgb(var(--border))] dark:border-white/[0.06]">

// ✅ Or use utility classes
<div className="bg-theme-surface-elevated text-theme-primary border-theme">
```

## Module-Specific Colors

Module pages can use their accent colors, but ensure text is readable:

- **Checkly**: `#EC4899` (Magenta) - use `text-pink-600 dark:text-pink-400`
- **Stockly**: `#10B981` (Emerald) - use `text-emerald-700 dark:text-emerald-400`
- **Teamly**: `#2563EB` (Blue) - use `text-blue-700 dark:text-blue-400`
- **Assetly**: `#0284C7` (Sky Blue) - use `text-sky-700 dark:text-sky-400`
- **Planly**: `#14B8A6` (Teal) - use `text-teal-700 dark:text-teal-400`

## Notes

- Always test both themes after changes
- Prefer CSS variables over hardcoded colors
- Use shared UI components when possible
- Document any module-specific color decisions
- Keep warm light grays for backgrounds (not pure white)
- Use darker text colors in light mode for better contrast
