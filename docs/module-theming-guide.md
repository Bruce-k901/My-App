# Module Theming Guide

Reference for converting any module's pages from hard-coded colours to the Opsly theme system. Based on the complete Teamly (People) module conversion.

---

## Overview

Every page in a module needs to use **theme utility classes** and **module-aware colours** instead of hard-coded values. This ensures pages look correct in both light and dark themes, and automatically adopt the correct module accent colour (e.g. Teamly pink, Stockly teal, Checkly gold).

The dashboard layout applies a `.module-teamly` (or `.module-stockly`, etc.) class to the wrapper, which sets `--module-fg` and `--module-fg-dark` CSS variables. All module-coloured elements should reference `module-fg` so they adapt automatically.

---

## Step 1: Identify All Files in the Module

Run a glob to find every page and component:

```
src/app/dashboard/people/**/*.tsx
src/components/reviews/**/*.tsx
src/components/people/**/*.tsx
```

For other modules, adjust the paths:

- **Stockly**: `src/app/dashboard/stockly/**/*.tsx`, `src/components/stockly/**/*.tsx`
- **Checkly**: `src/app/dashboard/checklists/**/*.tsx`, `src/components/checklists/**/*.tsx`
- **Planly**: `src/app/dashboard/planly/**/*.tsx`, `src/components/planly/**/*.tsx`
- **Assetly**: `src/app/dashboard/assets/**/*.tsx`, `src/components/assets/**/*.tsx`

---

## Step 2: Search for Hard-Coded Patterns

Use these grep searches across the module's files to find problems. Run all of them — different files use different anti-patterns.

### Background colours

```
bg-white
bg-\[#1A1D26\]
bg-\[#0D0F14\]
bg-\[rgb\(var\(--surface
bg-gray-50
bg-gray-100
bg-gray-200
bg-neutral-800
bg-neutral-900
bg-slate-
```

### Text colours

```
text-white(?!/|[0-9])    # text-white used as primary text (not opacity)
text-gray-
text-neutral-
text-slate-
```

### Border colours

```
border-white/
border-gray-
border-neutral-
border-slate-
```

### Hard-coded brand/accent colours

```
#D37E91              # Teamly pink used as generic accent
text-blue-
bg-blue-
border-blue-
text-purple-
text-indigo-
focus:border-blue
focus:ring-blue
```

### Dark-only status colours (missing light variant)

```
text-green-400(?!.*dark:)   # green without light mode pair
text-red-400(?!.*dark:)
text-amber-400(?!.*dark:)
text-orange-400(?!.*dark:)
```

### Opacity-based dark theme patterns

```
bg-white/\[0\.0       # bg-white/[0.02], bg-white/[0.03], bg-white/[0.05]
border-white/\[0\.0    # border-white/[0.06], border-white/[0.1]
hover:bg-white/
hover:border-white/
divide-white/
```

### Layout anti-patterns

```
min-h-screen          # Remove from page content (layout handles this)
max-w-7xl             # Remove if layout already constrains width
```

---

## Step 3: Apply Replacements

### Master Replacement Table

#### Backgrounds

| Old Pattern                                       | New Pattern                             | Notes                                                     |
| ------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `bg-white/[0.03]`                                 | `bg-theme-surface`                      | Main card/container background                            |
| `bg-white/[0.05]`                                 | `bg-theme-button` or `bg-theme-surface` | Use `button` for small elements, `surface` for containers |
| `bg-white/[0.02]`                                 | `bg-theme-hover`                        | Hover states, subtle backgrounds                          |
| `bg-white dark:bg-[#1A1D26]`                      | `bg-theme-surface`                      | Light/dark pair → single class                            |
| `bg-white dark:bg-[rgb(var(--surface-elevated))]` | `bg-theme-surface`                      | Same                                                      |
| `bg-gray-50 dark:bg-white/[0.02]`                 | `bg-theme-button`                       | Light/dark pair                                           |
| `bg-gray-100 dark:bg-white/[0.05]`                | `bg-theme-button`                       | Light/dark pair                                           |
| `bg-gray-100 dark:bg-gray-800`                    | `bg-theme-button`                       | Light/dark pair                                           |
| `bg-gray-200 dark:bg-neutral-800`                 | `bg-theme-button`                       | Light/dark pair                                           |
| `bg-[#0D0F14]`                                    | `bg-theme-surface` or remove            | Page-level dark bg                                        |

#### Text

| Old Pattern                           | New Pattern                  | Notes                          |
| ------------------------------------- | ---------------------------- | ------------------------------ |
| `text-white` (as primary text)        | `text-theme-primary`         | Main headings, primary content |
| `text-white/60` or `text-neutral-400` | `text-theme-secondary`       | Secondary descriptions         |
| `text-white/40` or `text-neutral-500` | `text-theme-tertiary`        | Tertiary/muted text            |
| `text-gray-600 dark:text-gray-400`    | `text-theme-secondary`       | Light/dark pair                |
| `text-gray-500 dark:text-gray-500`    | `text-theme-tertiary`        | Muted text                     |
| `text-gray-900 dark:text-white`       | `text-theme-primary`         | Light/dark pair                |
| `placeholder-neutral-500`             | `placeholder-theme-tertiary` | Input placeholders             |
| `placeholder-neutral-600`             | `placeholder-theme-tertiary` | Input placeholders             |
| `hover:text-white`                    | `hover:text-theme-primary`   | Hover states                   |

#### Borders

| Old Pattern                                | New Pattern                | Notes               |
| ------------------------------------------ | -------------------------- | ------------------- |
| `border-white/[0.06]`                      | `border-theme`             | Standard border     |
| `border-white/[0.1]`                       | `border-theme-hover`       | Emphasized border   |
| `hover:border-white/[0.1]`                 | `hover:border-theme-hover` | Hover border        |
| `border-gray-200 dark:border-white/[0.06]` | `border-theme`             | Light/dark pair     |
| `border-gray-300 dark:border-gray-700`     | `border-theme`             | Light/dark pair     |
| `divide-gray-200 dark:divide-white/10`     | `divide-theme`             | Table/list dividers |
| `divide-white/[0.06]`                      | `divide-theme`             | Dividers            |

#### Module Accent Colours

| Old Pattern                                        | New Pattern                           | Notes                          |
| -------------------------------------------------- | ------------------------------------- | ------------------------------ |
| `text-[#D37E91]`                                   | `text-module-fg`                      | Any hard-coded module colour   |
| `border-[#D37E91]`                                 | `border-module-fg`                    | Module accent border           |
| `bg-[#D37E91]/20`                                  | `bg-module-fg/20`                     | Module accent background       |
| `bg-[#D37E91]`                                     | `bg-module-fg`                        | Solid module accent            |
| `focus:border-[#D37E91]`                           | `focus:border-module-fg`              | Focus states                   |
| `focus:ring-[#D37E91]`                             | `focus:ring-module-fg`                | Focus rings                    |
| `focus:border-blue-500 dark:focus:border-blue-400` | `focus:border-module-fg`              | Blue used as accent            |
| `bg-blue-600 dark:bg-blue-500` (CTA)               | `bg-module-fg`                        | Primary action buttons         |
| `bg-blue-500/10 border-blue-500/30`                | `bg-module-fg/10 border-module-fg/30` | Info callouts using blue       |
| `text-blue-400` (as accent)                        | `text-module-fg`                      | Blue used as module accent     |
| `hover:shadow-[0_0_12px_rgba(211,126,145,0.7)]`    | `hover:shadow-module-glow`            | Glow effect                    |
| `bg-gradient-to-br from-[#D37E91] to-blue-500`     | `bg-module-fg`                        | Gradient → solid module colour |
| `accent-[#D37E91]` (checkboxes)                    | `accent-module-fg`                    | Checkbox accent                |

#### Buttons & Interactive Elements

| Old Pattern                                                      | New Pattern                                                                         | Notes                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Active tab: `bg-[#D37E91]/20 text-[#D37E91] border-[#D37E91]/30` | `bg-transparent border border-module-fg text-module-fg`                             | Selected tab/filter                                                              |
| Inactive tab: `bg-white/[0.03] text-white/40`                    | `bg-theme-surface border border-theme text-theme-tertiary hover:text-theme-primary` | Unselected tab                                                                   |
| Primary button: `bg-blue-600 text-white`                         | `bg-module-fg text-white`                                                           | Use `bg-transparent border border-module-fg text-module-fg` for outlined variant |
| Hover background: `hover:bg-white/[0.02]`                        | `hover:bg-theme-hover`                                                              | Row/card hover                                                                   |

---

## Step 4: Handle Status Colours Correctly

Status colours are **semantic** — they must NOT be converted to `module-fg`. But they must work in both themes.

### Rule: Always pair light and dark variants

| Status           | Correct Pattern                        |
| ---------------- | -------------------------------------- |
| Success/Complete | `text-green-600 dark:text-green-400`   |
| Error/Danger     | `text-red-600 dark:text-red-400`       |
| Warning/Due soon | `text-amber-600 dark:text-amber-400`   |
| High priority    | `text-orange-600 dark:text-orange-400` |
| Info             | `text-blue-600 dark:text-blue-400`     |

### Status badges (with backgrounds)

```
// Success badge
bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30

// Error badge
bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30

// Warning badge
bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30
```

### Common mistake: Dark-only status colours

If you see `text-green-400` without a `dark:` prefix, it means it was written for dark mode only. Fix:

```
// BAD - only works in dark theme
text-green-400

// GOOD - works in both themes
text-green-600 dark:text-green-400
```

---

## Step 5: Handle Contextual/Semantic Colours

Some colours are intentionally different from the module colour to convey meaning. These stay semantic but become theme-aware:

| Meaning            | Pattern                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| Employee           | `text-blue-600 dark:text-blue-400` (keep blue, don't convert to module-fg)            |
| Manager            | `text-purple-600 dark:text-purple-400` (keep purple)                                  |
| Recurring badge    | `bg-module-fg/20 text-module-fg border border-module-fg/30` (this IS module-coloured) |
| Delete/destructive | `text-red-600 dark:text-red-400 hover:bg-red-500/10`                                  |

### How to decide: module-fg vs semantic colour?

- **Is it the module's accent/brand colour?** → `module-fg`
- **Does it convey a universal meaning (success, error, warning)?** → Semantic colour with light/dark pair
- **Is it a role indicator (employee=blue, manager=purple)?** → Keep semantic but make theme-aware
- **Is it blue being used as a generic accent?** → `module-fg` (blue was often the default before theming)

---

## Step 6: Fix Input Elements

Inputs have their own set of patterns:

```tsx
// BAD
<input className="bg-white dark:bg-[#1A1D26] border border-gray-300 dark:border-white/[0.06] text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 placeholder-gray-500" />

// GOOD
<input className="bg-theme-surface border border-theme text-theme-primary focus:border-module-fg placeholder-theme-tertiary" />
```

For select elements:

```tsx
// BAD
<select className="bg-white dark:bg-[#1A1D26] border-gray-300 dark:border-white/[0.06] focus:border-blue-500">

// GOOD
<select className="bg-theme-surface border-theme focus:border-module-fg text-theme-primary">
```

---

## Step 7: Fix Loading Spinners

```tsx
// BAD
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />

// GOOD
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
```

---

## Step 8: Remove Layout Wrappers

Many pages had their own layout wrappers that conflict with the dashboard layout:

```tsx
// REMOVE these - the dashboard layout handles them
<div className="min-h-screen bg-[#0D0F14] p-6">
  <div className="max-w-7xl mx-auto">

// KEEP just the content
<div className="space-y-6">
```

---

## Step 9: Verify

After completing all replacements in a file, run grep to verify no hard-coded patterns remain:

```bash
# Check for remaining hard-coded colours in a specific file
grep -n "bg-white\|bg-\[#\|text-white\b\|border-white/\|#D37E91\|bg-blue-\|text-blue-\|border-blue-\|bg-gray-\|text-gray-\|border-gray-\|placeholder-neutral\|min-h-screen" path/to/file.tsx
```

For a full module sweep:

```bash
# Sweep entire module directory
grep -rn "bg-white\|bg-\[#\|border-white/\|#D37E91\|focus:border-blue\|placeholder-neutral" src/app/dashboard/people/
grep -rn "bg-white\|bg-\[#\|border-white/\|#D37E91\|focus:border-blue\|placeholder-neutral" src/components/reviews/
```

---

## Teamly Module: Files Fixed

For reference, here is every file that was fixed during the Teamly (People) module conversion:

### Review Components (`src/components/reviews/`)

1. `ReviewForm.tsx` — form fields, buttons, status badges, scoring UI
2. `ReviewFormQuestion.tsx` — question cards, rating inputs, text areas
3. `ReviewPortal.tsx` — full portal layout, navigation, employee/manager views
4. `ReviewComparisonView.tsx` — side-by-side comparison layout
5. `ReviewComparisonQuestion.tsx` — comparison question cards, score badges
6. `ScheduleForm.tsx` — scheduling form, date pickers, employee selectors
7. `TemplateEditor.tsx` — template builder, drag-and-drop sections
8. `TemplateLibrary.tsx` — template cards, category filters, search
9. `CreateTemplateForm.tsx` — creation wizard, form steps
10. `EditableTemplateForm.tsx` — inline editing, question management

### Review Pages (`src/app/dashboard/people/reviews/`)

11. `my-reviews/page.tsx` — review list, filter tabs, status badges
12. `1on1s/page.tsx` — meeting list, avatars, recurring badges, status
13. `goals/page.tsx` — goal cards, priority badges, progress bars, quick buttons
14. `team/page.tsx` — team review overview

### Payroll (`src/app/dashboard/people/payroll/`)

15. `rates/page.tsx` — rate cards, inputs, pay type badges, action buttons
    - **Also fixed a data bug**: `profiles.hourly_rate` is stored in **pence** — the page was treating it as pounds and multiplying by 100 again, causing £12/hr to display as £1200/hr

### Other sections fixed (in earlier sessions)

- Various pages across attendance, schedule, recruitment, settings, onboarding, training, leave, etc.

---

## Common Gotchas

### 1. Pence vs Pounds

`profiles.hourly_rate` is stored in **pence**. `profiles.annual_salary` is stored in **pounds**. Always check the unit convention before displaying or saving monetary values.

### 2. `replace_all` cascading

When using find-and-replace across a file, be careful with patterns like `text-white` that might match inside other classes (e.g. `text-white/60`). Use specific enough patterns to avoid unintended replacements.

### 3. Opacity values in module-fg

Module-fg supports Tailwind opacity modifiers: `bg-module-fg/10`, `bg-module-fg/20`, `border-module-fg/30`. These work because the CSS variable is defined in a format Tailwind can decompose.

### 4. Avatar backgrounds

Avatars that used gradients like `bg-gradient-to-br from-[#D37E91] to-blue-500` should become `bg-module-fg` (solid colour). The gradient looked nice in Teamly but would look wrong in other modules.

### 5. Don't convert the Brand CTA colour

`#D37E91` (Blush/Teamly light) is used for the **Ask AI button** and **user avatars** across the entire app — those are intentionally always `#D37E91` regardless of module. Only convert `#D37E91` when it's being used as a generic accent within module pages.

### 6. Table row striping

If tables use `odd:bg-white/[0.02]` or `even:bg-gray-50`, replace with `odd:bg-theme-hover` or remove striping in favour of `divide-theme` borders.

### 7. Modal overlays

Backdrop overlays like `bg-black/50` or `bg-black/60` are fine — these are universal and don't need theming.

---

## Quick Reference: Theme Classes

| Class                        | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `text-theme-primary`         | Main text (headings, content)        |
| `text-theme-secondary`       | Secondary text (descriptions)        |
| `text-theme-tertiary`        | Muted text (labels, hints)           |
| `bg-theme-surface`           | Card/container backgrounds           |
| `bg-theme-surface-elevated`  | Elevated surfaces (modals, popovers) |
| `bg-theme-button`            | Button/badge backgrounds             |
| `bg-theme-button-hover`      | Button hover state                   |
| `bg-theme-hover`             | Row/item hover background            |
| `bg-theme-muted`             | Subtle muted background              |
| `border-theme`               | Standard borders                     |
| `border-theme-hover`         | Emphasized/hover borders             |
| `divide-theme`               | Table/list dividers                  |
| `placeholder-theme-tertiary` | Input placeholder text               |
| `text-module-fg`             | Module accent text                   |
| `bg-module-fg`               | Module accent background (solid)     |
| `bg-module-fg/10`            | Module accent background (light)     |
| `border-module-fg`           | Module accent border                 |
| `border-module-fg/20`        | Module accent border (light)         |
| `hover:shadow-module-glow`   | Module accent glow on hover          |
| `accent-module-fg`           | Checkbox/radio accent                |
| `focus:border-module-fg`     | Input focus border                   |
