# OPSLY REBRAND — Addendum: Full Page Theming

**Companion to:** `OPSLY_REBRAND_BRIEF.md`
**Visual reference:** `opsly-stockly-full-theme.html`

---

## Key Corrections From v3.0 Brief

### 1. Sidebar and Main Content Share the SAME Background

The sidebar and main content area should use the **same** module-tinted background colour — they're one unified space, NOT two different surfaces.

```
Dark theme:
  Sidebar bg  = module sidebar tint (e.g. #0d1414 for Stockly)
  Main bg     = SAME (#0d1414)
  Divider     = 1px solid rgba(module-light, 0.10)  ← the OPPOSITE colour separates them
```

```
Light theme:
  Sidebar bg  = module sidebar tint light (e.g. #edf3f3 for Stockly)
  Main bg     = SAME (#edf3f3)
  Divider     = 1px solid rgba(module-dark, 0.10)  ← the OPPOSITE colour separates them
```

The divider line between sidebar and main content uses the **opposite** colour from the pair at low opacity. This creates a subtle but visible separation without breaking the unified feel.

### 2. ALL Icons Within a Module Use ONE Colour

**CRITICAL RULE: No mixed icon colours within a module.**

Every icon on every card, button, stat, nav link, and section header within a module uses that module's colour. No green for "New Order", blue for "Receive Delivery", red for "Record Waste" etc.

```
Dark theme:  ALL icons = module light colour (e.g. #789A99 for Stockly)
Light theme: ALL icons = module dark colour  (e.g. #4e7d7c for Stockly)
```

The ONLY exceptions to single-colour icons are **semantic status indicators**:

- Success/complete states: green (#10B981)
- Warning/alert states: amber (#F59E0B)
- Error/overdue states: red (#EF4444)

These are status colours, not decorative — they convey meaning. Everything else is the module colour.

### 3. Hover State = Opposite Theme Colour

When hovering over cards, buttons, nav links, and rows:

```
Dark theme hover:
  Background → rgba(module-light, 0.08)
  Border     → module-light at full opacity (or higher alpha, e.g. 0.18)
  Arrow/chevron icons → module-light colour
  Text       → brighten to full white

Light theme hover:
  Background → rgba(module-dark, 0.06)
  Border     → module-dark at higher alpha
  Arrow/chevron icons → module-dark colour
  Text       → darken to full black
```

The hover highlight uses the **same** colour as the module colour but at a **higher opacity** than the resting state. This creates a cohesive glow rather than an arbitrary colour shift.

---

## Updated Element Specifications

### Action Cards (e.g. New Order, Receive Delivery)

```
LAYOUT (must be uniform across all cards):
┌─────────────────────────┐
│  ┌──────┐               │
│  │ ICON │               │
│  └──────┘               │
│                         │
│  Title              →   │
│  Description            │
└─────────────────────────┘

- Icon: top-left, inside a rounded square container
- Title: below icon, left-aligned, semibold
- Description: below title, smaller, muted
- Arrow: bottom-right corner, always visible but muted → highlights on hover
```

**Styling:**

| Property       | Resting                        | Hover                     |
| -------------- | ------------------------------ | ------------------------- |
| Background     | `rgba(module, 0.04)`           | `rgba(module, 0.08)`      |
| Border         | `1px solid rgba(module, 0.10)` | `1px solid module-colour` |
| Icon container | `rgba(module, 0.10)` bg        | unchanged                 |
| Icon colour    | `module-colour`                | `module-colour`           |
| Title          | `var(--text-primary)`          | `var(--text-primary)`     |
| Description    | `var(--text-tertiary)`         | `var(--text-tertiary)`    |
| Arrow          | `var(--text-tertiary)`         | `module-colour`           |
| Transform      | none                           | `translateY(-1px)`        |

Where `module-colour` = light colour in dark theme, dark colour in light theme.

### Stat Cards

```
LAYOUT:
┌─────────────────────────┐
│  ⓘ  Label               │
│  £216,325                │
└─────────────────────────┘

- Small icon + label text on one line (muted)
- Large value below (in module colour)
```

| Property     | Value                          |
| ------------ | ------------------------------ |
| Background   | `rgba(module, 0.04)`           |
| Border       | `1px solid rgba(module, 0.10)` |
| Label icon   | `module-colour`, 14px          |
| Label text   | `var(--text-tertiary)`         |
| Value        | `module-colour`, bold, 1.35rem |
| Hover bg     | `rgba(module, 0.08)`           |
| Hover border | `rgba(module, 0.18)`           |

### Quick Link Rows

```
LAYOUT:
┌──────────────────────────────┐
│  ⓘ  Label                →  │
└──────────────────────────────┘

- Icon left, label, arrow right
- All on one line
```

| Property   | Resting                        | Hover                 |
| ---------- | ------------------------------ | --------------------- |
| Border     | `1px solid rgba(module, 0.10)` | `rgba(module, 0.18)`  |
| Background | transparent                    | `rgba(module, 0.08)`  |
| Icon       | `module-colour`                | `module-colour`       |
| Text       | `var(--text-secondary)`        | `var(--text-primary)` |
| Arrow      | `var(--text-tertiary)`         | `module-colour`       |

### Header Module Bar Tabs

| Property         | Inactive                       | Active                      |
| ---------------- | ------------------------------ | --------------------------- |
| Text             | `var(--text-tertiary)`         | `module-colour`             |
| Font weight      | 500                            | 600                         |
| Bottom border    | transparent                    | `2.5px solid module-colour` |
| Background       | transparent                    | `rgba(module, 0.06)`        |
| Hover (inactive) | text → `var(--text-secondary)` | —                           |

### Search Bars

| Property     | Value                          |
| ------------ | ------------------------------ |
| Background   | `rgba(module, 0.04)`           |
| Border       | `1px solid rgba(module, 0.10)` |
| Placeholder  | `var(--text-tertiary)`         |
| Search icon  | `module-colour`                |
| Focus border | `rgba(module, 0.25)`           |
| Hover border | `rgba(module, 0.20)`           |

### Alert Rows

| Property    | Value                                             |
| ----------- | ------------------------------------------------- |
| Dot         | `module-colour`, 8px                              |
| Alert icon  | `module-colour`                                   |
| Title       | `var(--text-primary)`                             |
| Description | `var(--text-tertiary)`                            |
| Arrow       | `var(--text-tertiary)` → `module-colour` on hover |
| Hover bg    | `rgba(module, 0.08)`                              |

---

## Opacity Reference (Quick Cheat Sheet)

Use these consistent opacity levels across ALL modules:

| Purpose                                 | Opacity |
| --------------------------------------- | ------- |
| Surface background (cards, search bars) | `0.04`  |
| Borders (resting)                       | `0.10`  |
| Icon containers                         | `0.10`  |
| Hover backgrounds                       | `0.08`  |
| Active nav / selected state             | `0.12`  |
| Hover borders                           | `0.18`  |
| Primary button background               | `0.15`  |
| Section labels                          | `0.40`  |
| Sidebar border (divider)                | `0.10`  |
| Focus ring                              | `0.25`  |

These are percentages of the module colour. So for Stockly dark theme:

- Card background = `rgba(120, 154, 153, 0.04)`
- Card border = `rgba(120, 154, 153, 0.10)`
- Hover = `rgba(120, 154, 153, 0.08)`
- etc.

---

## Full Module Colour Application Summary

Everything on page when inside Stockly (dark theme):

| Element                  | Colour                                              |
| ------------------------ | --------------------------------------------------- |
| Sidebar background       | `#0d1414`                                           |
| Main background          | `#0d1414`                                           |
| Sidebar/main divider     | `rgba(120,154,153, 0.10)`                           |
| Module bar bottom border | `rgba(120,154,153, 0.10)`                           |
| Header bottom border     | `rgba(120,154,153, 0.08)`                           |
| Active module tab        | `#789A99` text + border                             |
| Active sidebar nav       | `#789A99` text + icon, `rgba(120,154,153, 0.12)` bg |
| Section labels           | `rgba(120,154,153, 0.40)`                           |
| ALL card/button icons    | `#789A99`                                           |
| ALL stat values          | `#789A99`                                           |
| ALL card backgrounds     | `rgba(120,154,153, 0.04)`                           |
| ALL card borders         | `rgba(120,154,153, 0.10)`                           |
| ALL hover states         | `rgba(120,154,153, 0.08)` bg                        |
| ALL arrows on hover      | `#789A99`                                           |
| Search bar icon          | `#789A99`                                           |
| Alert dot                | `#789A99`                                           |
| Page title icon          | `#789A99`                                           |
| Logo text in sidebar     | `#789A99`                                           |
| User avatar              | `#789A99` bg                                        |

Replace `#789A99` / `120,154,153` with the appropriate module colour for Checkly, Teamly, Planly, Assetly, or Msgly — the pattern is identical.

---

## Checklist

- [ ] Sidebar and main content use same module-tinted background
- [ ] Divider between sidebar/main uses opposite colour at 0.10 opacity
- [ ] Header/module bar borders use module colour
- [ ] Active module tab shows module colour text + border + tinted bg
- [ ] ALL icons within a module use ONE colour (no mixed colours)
- [ ] Only exception: semantic status colours (green/amber/red) for actual status
- [ ] Hover states use module colour at higher opacity
- [ ] Arrow/chevron icons change to module colour on hover
- [ ] Card layouts are uniform (icon top-left, title below, description below, arrow bottom-right)
- [ ] Stat values render in module colour
- [ ] Search bar icons use module colour
- [ ] Focus/active states use module colour at 0.25 opacity
- [ ] Tested: switch between all 6 modules to verify each transforms correctly
