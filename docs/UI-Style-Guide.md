# Checkly UI Style Guide

**Last updated:** 2025-10-09  
**Purpose:** Ensure consistent look and feel across all UI components in the Checkly app and marketing pages.

---

## Headings

| Element | Size                           | Weight | Color   | Usage               |
| ------- | ------------------------------ | ------ | ------- | ------------------- |
| h1      | 2.25rem (text-4xl md:text-5xl) | 700    | #FFFFFF | Page or form titles |
| h2      | 1.5rem (text-2xl)              | 600    | #FFFFFF | Section titles      |
| h3      | 1.25rem (text-xl)              | 500    | #FFFFFF | Subtitles or cards  |

**Rules**

- Use pure white for all headings.
- Maintain 1.5rem spacing below headings.
- No gradients or opacity changes unless used globally in hero banners.

---

## Typography

- **Font family:** Inter, system-ui
- **Body text:** 1rem, `#FFFFFFCC`
- **Labels:** 0.875rem, `#FFFFFF99`
- **Baseline spacing:** 16px (1rem) between vertical elements.

---

## Inputs

| State   | Border    | Background | Focus Ring              | Notes                      |
| ------- | --------- | ---------- | ----------------------- | -------------------------- |
| Default | #FFFFFF20 | #FFFFFF05  | None                    | Subtle, visible contrast   |
| Hover   | #FFFFFF35 | #FFFFFF08  | None                    | Slight brightness increase |
| Focus   | #EC4899   | #FFFFFF0A  | ring-2 ring-pink-500/40 | Brand accent               |

**Attributes**

- Font size: 0.95rem
- Placeholder: #FFFFFF60
- Border radius: 0.5rem
- Height: 44px
- Transition: 150ms ease-in-out
- Component file: `/src/components/ui/Input.tsx`

---

## Buttons

### Primary (Glass)

bg-white/[0.06]
border border-white/[0.1]
text-white
hover:bg-white/[0.12]
hover:border-white/[0.25]
backdrop-blur-md

### Secondary (Ghost)

bg-transparent
border border-white/[0.1]
text-white
hover:bg-white/[0.05]

### Destructive

bg-[#EF4444]/90
text-white
hover:bg-[#EF4444]

**Attributes**

- Height: 44px
- Border radius: 0.6rem
- Padding: 0 1.5rem
- Font weight: 500
- Transition: 150ms ease
- Active: scale-95
- Component file: `/src/components/ui/Button.tsx`

---

## Cards & Containers

- Background: `bg-white/[0.05]`
- Border: `border border-white/[0.1]`
- Corner radius: 1rem
- Shadow: `0 4px 40px rgba(0,0,0,0.4)`
- Padding: 2rem top/bottom, 1.5rem sides

## Universal Glow Behaviour

All interactive boxes and buttons share a unified glow system.

- Hover: `shadow-[0_0_10px_rgba(236,72,153,0.25)]`
- Focus (inputs): `shadow-[0_0_14px_rgba(236,72,153,0.4)]`
- Active (buttons): `scale-95` with maintained glow

This rule applies globally to:

- Buttons (header, auth, dashboard)
- Input fields (signup, signin, setup)
- Card surfaces (auth modals, dashboard info blocks)

---

## Example: Signup Page Structure

````tsx
<main className="flex flex-col items-center justify-center min-h-screen px-4">
  <div className="w-full max-w-md bg-white/[0.05] border border-white/[0.1] rounded-2xl p-8 backdrop-blur-lg shadow-xl">
    <h1 className="text-4xl font-bold text-white mb-6 text-center">Create Your Account</h1>

    <form className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" />
        <Input label="Last Name" />
      </div>
      <Input label="Company Name" />
      <Input label="Admin Email" type="email" />
      <Input label="Password" type="password" />
      <Button variant="primary" className="w-full">Sign Up</Button>
    </form>
  </div>
</main>

Implementation Rules

All forms (signup, login, setup, dashboard modals) must use these shared UI components.

Do not override bg, border, or focus colours inline; update the base component if changes are needed.

All new components must import utilities from /src/components/ui/.

Keep this file updated whenever a UI token (color, radius, shadow, spacing) changes.

Maintenance

Link this doc in /src/components/ui/README.md.

Include a “UI consistency check” tickbox in PR templates.

Review visual alignment in staging before merging UI PRs.


---

### **Step 3: Reference in Codebase**

Create a `README.md` inside `/src/components/ui/` that links to it:

```markdown
# UI Components

Shared visual components for Checkly (Buttons, Inputs, Cards, etc).

Refer to the full design spec:
[/docs/UI-Style-Guide.md](../../docs/UI-Style-Guide.md)
````

Step 4: Version Control

Commit and push:

```
git add docs/UI-Style-Guide.md src/components/ui/README.md
git commit -m "chore: add Checkly UI Style Guide"
git push
```

---

## Sidebar Navigation

- Default: `text-white/80`
- Hover: `text-white`, `bg-white/[0.08]`, `shadow-[0_0_10px_rgba(236,72,153,0.25)]`
- Active: `text-white`, `bg-white/[0.12]`, `border-l-2 border-pink-500` (left border color `#EC4899`)
- Icon color: `#EC4899` (magenta)

Guidelines

- Determine active state with `pathname.startsWith(item.href)`.
- Use padding `px-6 py-3` for touch-friendly targets.
- Maintain `rounded-md` corners throughout.

## Sidebar Toggle

- Icon: `ChevronLeft` / `ChevronRight` from lucide-react
- Default: `text-white/60`
- Hover: `text-white` + `bg-white/[0.08]`
- Transition: 150ms ease-in-out
- Collapsed width: 5rem (`w-20`)
- Expanded width: 16rem (`w-64`)
- State persistence: localStorage key `sidebar-collapsed`

## Dashboard Header Logo

- Fixed top-left element, outside sidebar.
- Height: `h-20` (80px)
- Width: `w-20` (80px) small screens, `md:w-24` (96px) medium+.
- Background: `bg-white/[0.05]`
- Border-bottom: `border-white/[0.1]`
- Hover: `hover:opacity-90` with `transition-opacity` ~150ms.
- Not affected by sidebar collapse/expand animation.

## Dashboard Header

- Height: 72px (`h-[72px]`)
- Background: `bg-white/[0.05]` with `backdrop-blur-lg`
- Border-bottom: `border-white/[0.1]`
- Layout: Flex between logo (left), actions (middle), logout (right)
- Logo: Company if available, else `/logo/checkly.svg`
- Buttons: Glass style (`bg-white/[0.06]`, `border-white/[0.1]`, hover glow via `hover:bg-white/[0.12]`)
- Icons: `lucide-react` (pink accent `#EC4899`)
- Persistent across all dashboard routes
- Persistent across all dashboard routes

## Dashboard Home Layout

- Sections appear in this order:
  1. WelcomeHeader
  2. EmergencyBreakdowns
  3. IncidentLog
  4. MetricsGrid
  5. AlertsFeed
- Section spacing: `gap-6`, max-width `1280px`, centered
- Card defaults: `bg-white/[0.03]`, `rounded-2xl`, `p-5`
- Hover glow: `shadow-[0_0_15px_rgba(236,72,153,0.2)]`
- Critical cards (alerts, breakdowns): red accent `#ef4444`
- Header font sizes: `text-2xl` for section headings, `text-base` muted for subtext

### Dashboard Content Layout

- Max width: 1280px (centered)
- Horizontal padding:
  - mobile: 24px
  - tablet: 32px
  - desktop: 48px
- Section spacing: 24px
- Card styling:
  - Background: #0b0d13 / 80%
  - Border: white/[0.06]
  - Radius: 16px
  - Padding: 20px
  - Shadow: rgba(236,72,153,0.05)

## Floating Quick Actions

- Fixed top-right, 2rem from header bottom, 2rem from right edge.
- Primary button: circular, 48px, bg-transparent, text-[#EC4899], border border-[#EC4899].
- Hover: shadow-[0_0_12px_rgba(236,72,153,0.7)] (magenta glow).
- Expanded state: reveals vertical list of actions.
- Transition: 300ms ease-out with translate and opacity fade.

## Button UX Language

**Standard Button Style:**

- Background: `bg-transparent`
- Text: `text-[#EC4899]` (magenta)
- Border: `border border-[#EC4899]` (magenta)
- Hover: `hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]` (magenta glow)
- Transition: `transition-all duration-200 ease-in-out`

**DO NOT USE:** Pink backgrounds (`bg-pink-500`) or solid pink buttons. All accent buttons should use magenta text with magenta border and glow on hover.

## Sidebar Label Typography

- Font: Inter / 600
- Size: 0.95rem (`text-[0.95rem]`)
- Tracking: 0.025em (`tracking-wide`)
- Active color: white (100%) with pink glow (`0 0 6px rgba(236,72,153,0.5)`)

## EHO Readiness Components

- Section background: white/[0.03]
- Border: white/[0.06]
- Radius: 16px
- Padding: 20px
- Heading: text-lg, semibold
- Status tags:
  - Valid → green-400
  - Due → yellow-400
  - Expired → red-400
- Icons: pink-400 (20 px)
- Hover color: white (100%) with soft glow
- If collapsed (icons only), apply these font tokens to tooltip label content.

## Floating Menu Responsive Rules

- Desktop (≥1024px): Full text labels visible beside icons.
- Tablet / Mobile (<1024px):
  - Buttons become circular (40×40 px).
  - Tooltip appears on hover or long-press with label text.
- Tooltip Tokens:
  - Background: `#14161c / 95%`
  - Text: `white / 90%`
  - Border: `white / [0.08]`
  - Glow: `0 0 14px rgba(236,72,153,0.25)`
- Transition: fade + scale, `0.15s`
- Each action button:
  - Rounded-full, bg-white/[0.06], border-white/[0.1]
  - Hover glow: bg-white/[0.12]
  - Icon: text-pink-400, 16px
  - Text: white/80 → white on hover

## Dashboard Layout Refinements

### Sidebar

- Fixed 80px width (icon-only).
- Tooltip labels appear on hover (0.15s delay).
- Active item: `bg-white/[0.12]`.
- Hover: `bg-white/[0.08]`.
- Icon color: `#EC4899`.

---

### Sidebar Active & Hover Tokens

- Active icon:
  - Color: #EC4899
  - Background: white/[0.12]
  - Shadow: 0 0 12px rgba(236,72,153,0.35)
- Hover icon:
  - Color: #EC4899
  - Background: white/[0.06]
  - Shadow: 0 0 10px rgba(236,72,153,0.25)
- Transition: all 0.2s ease

### Tooltip Tokens

- Background: #14161c / 95%
- Blur: backdrop-blur-sm
- Border: white/[0.08]
- Text: white/90
- Shadow: 0 0 14px rgba(236,72,153,0.25)
- Animation: fade + scale (Framer Motion)

## Sidebar (Hover Tooltips)

- Width: 80px fixed
- Background: #0B0D13
- Border-right: white/[0.1]
- Icons: Lucide-react, 20–24px
- Icon default: text-white/70
- Icon hover: text-pink-400
- Active: bg-white/[0.12], text-pink-400
- Tooltip:
  - Background: #111
  - Text: white/90
  - Border: white/[0.08]
  - Shadow: subtle glow
  - Transition: opacity 0.2s ease
  - Appears to right of icon on hover

### Behaviour Summary

| Action                | Behaviour                                       |
| --------------------- | ----------------------------------------------- |
| Hover an icon         | Tooltip fades in instantly beside it            |
| Leave hover           | Tooltip fades out                               |
| Click active page     | Icon gets pink and slightly brighter background |
| No collapse or expand | Sidebar always stable and slim                  |

### Main Content

- Max width: `1600px`.
- Padding: `24px–40px` responsive.
- Centered using `mx-auto`.

### Scrollbars

- Hidden globally unless overflow.
- `no-scrollbar` class hides via `::-webkit-scrollbar { display: none }` and modern browser equivalents.

### Top Section

- Two-column grid:
  - Left: ShiftHandoverNotes
  - Right: AlertsFeed
- Min height for both: `260px`.
- Gap: `1.5rem`.

## Dashboard Polishing Effects

- Fade-in entry: apply `fade-in-soft` to sections for subtle entrance.
- Blinking indicator: use `blink-dot` next to titles to denote live activity.
- Hover glow: apply `hover-glow` on list items or cards for a soft lift on hover.
- Textarea glow: use `textarea-hover-glow` on inputs that benefit from extra focus.

Usage examples

- Alerts Feed: `section` uses `fade-in-soft`; list items use `hover-glow`.
- Incident Log: title shows `blink-dot` when open/under-review incidents exist; section uses `fade-in-soft`.

Design intent

- All effects are lightweight, CSS-only, and tuned for dark UI.
- Transitions are subtle to avoid distraction while improving affordance.

---

## Tooltip Component

- **File:** `src/components/ui/tooltip/Tooltip.tsx`
- **Usage:** `<Tooltip label="My text">...</Tooltip>`
- **Variants:**
  - side = "top" | "bottom" | "left" | "right"
  - delay = ms before appearing (default 150)
- **Visual Tokens:**
  - Background: #111
  - Text: white/90
  - Border: white/[0.08]
  - Shadow: rgba(236,72,153,0.25)
  - Animation: fade + scale, 0.15s
- **Behaviour:**
  - Appears after hover delay
  - Disappears immediately on leave
  - Never affects layout or z-index stacking
