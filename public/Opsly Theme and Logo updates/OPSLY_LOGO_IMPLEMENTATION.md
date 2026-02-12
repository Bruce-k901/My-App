# OPSLY LOGO IMPLEMENTATION — Claude Code Instructions

## Overview

The Opsly logo is a **bar mark** (6 coloured bars with connection arcs/dots) plus a text label. There are 3 logo types:

1. **Full logo** — bar mark + "opsly" or module name as text
2. **Mark** — bar mark only with arcs and connection dots (sidebar header, loading screens)
3. **Simple mark** — bars only, no arcs/dots (very small sizes like 24px)

Each comes in **dark** and **light** theme variants (text colour swaps, arc opacity adjusts).

---

## Step 1: Copy SVG Files

Copy all files from the `opsly-logos/` folder to `public/logos/` in the project:

```bash
mkdir -p public/logos
cp opsly-logos/*.svg public/logos/
```

This gives you 16 files:

```
public/logos/
├── opsly-logo-dark.svg        # "opsly" text in #E8E8E8 (dark bg)
├── opsly-logo-light.svg       # "opsly" text in #2C3E50 (light bg)
├── opsly-mark.svg             # bars + arcs, no text
├── opsly-mark-simple.svg      # bars only, no arcs
├── checkly-logo-dark.svg      # "checkly" text in #F1E194
├── checkly-logo-light.svg     # "checkly" text in #5B0E14
├── stockly-logo-dark.svg      # "stockly" text in #789A99
├── stockly-logo-light.svg     # "stockly" text in #4e7d7c
├── teamly-logo-dark.svg       # "teamly" text in #D37E91
├── teamly-logo-light.svg      # "teamly" text in #b0607a
├── planly-logo-dark.svg       # "planly" text in #ACC8A2
├── planly-logo-light.svg      # "planly" text in #1A2517
├── assetly-logo-dark.svg      # "assetly" text in #F3E7D9
├── assetly-logo-light.svg     # "assetly" text in #544349
├── msgly-logo-dark.svg        # "msgly" text in #CBDDE9
└── msgly-logo-light.svg       # "msgly" text in #2872A1
```

---

## Step 2: Create the OpslyLogo Component

**File:** `src/components/ui/OpslyLogo.tsx`

This component handles all logo rendering with theme awareness. It should:

- Accept a `variant` prop: `'full'` | `'mark'` | `'simple'`
- Accept a `module` prop: `'opsly'` | `'checkly'` | `'stockly'` | `'teamly'` | `'planly'` | `'assetly'` | `'msgly'`
- Auto-detect dark/light theme and render the correct SVG variant
- Accept standard sizing props (`width`, `height`, `className`)

```tsx
"use client";

import Image from "next/image";
import { useTheme } from "next-themes"; // or however your theme is detected

type ModuleName = "opsly" | "checkly" | "stockly" | "teamly" | "planly" | "assetly" | "msgly";
type LogoVariant = "full" | "mark" | "simple";

interface OpslyLogoProps {
  module?: ModuleName;
  variant?: LogoVariant;
  width?: number;
  height?: number;
  className?: string;
}

export function OpslyLogo({
  module = "opsly",
  variant = "full",
  width,
  height,
  className,
}: OpslyLogoProps) {
  // Detect theme — adapt this to however your app detects dark/light
  // If you use a class on <html>, you can check for that instead
  const isDark =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true; // default to dark

  const theme = isDark ? "dark" : "light";

  // Determine the correct SVG file
  let src: string;

  if (variant === "mark") {
    src = "/logos/opsly-mark.svg";
  } else if (variant === "simple") {
    src = "/logos/opsly-mark-simple.svg";
  } else {
    // Full logo — module name + theme
    src = `/logos/${module}-logo-${theme}.svg`;
  }

  // Default dimensions based on variant
  const defaultWidth = variant === "full" ? 200 : variant === "mark" ? 60 : 40;
  const defaultHeight = variant === "full" ? 80 : variant === "mark" ? 40 : 26;

  return (
    <Image
      src={src}
      alt={`${module} logo`}
      width={width ?? defaultWidth}
      height={height ?? defaultHeight}
      className={className}
      priority // logos should load immediately
    />
  );
}
```

> **Note:** If your app doesn't use `next-themes` or a class-based dark mode toggle, adapt the `isDark` detection to match your setup. The key is: dark theme → load `*-dark.svg`, light theme → load `*-light.svg`.

---

## Step 3: Where to Use Each Variant

### Top Header — Opsly Mark (small)

The bar mark sits in the top-left corner of the header. Use the `simple` variant at small sizes (where arcs/dots would be invisible), or `mark` at medium sizes.

```tsx
// In Header.tsx or TopBar.tsx
<OpslyLogo variant="simple" width={32} height={22} />
// OR for slightly larger header:
<OpslyLogo variant="mark" width={48} height={32} />
```

### Login / Auth Pages — Full Opsly Logo

```tsx
// Centred on login page
<OpslyLogo module="opsly" variant="full" width={280} height={110} />
```

### Sidebar Header — Module Logo

When inside a module, the sidebar header should show that module's logo. This is the full logo with the module name in its colour.

```tsx
// In ChecklySidebar.tsx (or your unified sidebar component)
<OpslyLogo module="checkly" variant="full" width={160} height={64} />

// Dynamic based on current module:
<OpslyLogo module={currentModule} variant="full" width={160} height={64} />
```

### Loading / Splash Screen — Animated Mark

```tsx
// Large centred mark with a subtle pulse animation
<div className="animate-pulse">
  <OpslyLogo variant="mark" width={120} height={80} />
</div>
```

### Favicon / PWA — Already handled

The favicon files in `public/` use the bar mark. No component needed.

---

## Step 4: Find and Replace Old Logo References

Search for any existing logo references and replace them:

```bash
# Find old logo references
grep -rn "logo\|Logo\|checkly-logo\|brand" src/ --include='*.tsx' --include='*.ts' | grep -i "svg\|img\|Image\|src="

# Common patterns to look for:
# - <Image src="/logo.svg" ... />
# - <img src="/checkly-logo.png" ... />
# - import Logo from '@/assets/logo.svg'
# - Any hardcoded SVG logo markup inline in components
```

Replace all instances with the `<OpslyLogo>` component using the appropriate props.

---

## Step 5: Remove Old Logo Files

After migrating all references, remove any old logo/brand files:

```bash
# Check what old files exist
ls public/logo* public/brand* public/*.svg 2>/dev/null
ls src/assets/logo* src/assets/brand* 2>/dev/null

# Remove them (adjust paths as needed)
# rm public/old-logo.svg public/checkly-logo.png etc.
```

---

## SVG Source Reference

If you need to generate additional logo variants or embed the SVG inline, here are the building blocks:

### Bar Mark (shared by all logos)

```svg
<!-- 6 bars representing the 6 modules -->
<rect x="0"   y="10"  width="24" height="110" rx="12" fill="#1B2624"/>
<rect x="34"  y="30"  width="24" height="90"  rx="12" fill="#8B2E3E"/>
<rect x="68"  y="15"  width="24" height="105" rx="12" fill="#D9868C"/>
<rect x="102" y="25"  width="24" height="95"  rx="12" fill="#5D8AA8"/>
<rect x="136" y="10"  width="24" height="110" rx="12" fill="#87B0D6"/>
<rect x="170" y="20"  width="24" height="100" rx="12" fill="#9AC297"/>
```

### Connection Arcs (mark + full logos only)

```svg
<!-- Top arc -->
<path d="M 0 60 A 95 30 0 0 0 190 60" fill="none" stroke="#BDC3C7" stroke-width="4" opacity="0.3"/>
<!-- Bottom arc -->
<path d="M 0 60 A 95 30 0 0 1 190 60" fill="none" stroke="#BDC3C7" stroke-width="4" opacity="0.4"/>
```

### Connection Dots and Lines

```svg
<!-- Dots -->
<circle cx="12"  cy="40" r="4" fill="#BDC3C7" opacity="0.7"/>
<circle cx="46"  cy="75" r="4" fill="#BDC3C7" opacity="0.7"/>
<circle cx="114" cy="55" r="4" fill="#BDC3C7" opacity="0.7"/>
<circle cx="182" cy="70" r="4" fill="#BDC3C7" opacity="0.7"/>

<!-- Lines connecting dots -->
<polyline points="12,40 25,40 25,75 46,75" stroke="#BDC3C7" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4"/>
<polyline points="114,55 140,55 140,70 182,70" stroke="#BDC3C7" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4"/>
```

### Text Label Colours

| Logo        | Dark Theme Text | Light Theme Text |
| ----------- | --------------- | ---------------- |
| **opsly**   | `#E8E8E8`       | `#2C3E50`        |
| **checkly** | `#F1E194`       | `#5B0E14`        |
| **stockly** | `#789A99`       | `#4e7d7c`        |
| **teamly**  | `#D37E91`       | `#b0607a`        |
| **planly**  | `#ACC8A2`       | `#1A2517`        |
| **assetly** | `#F3E7D9`       | `#544349`        |
| **msgly**   | `#CBDDE9`       | `#2872A1`        |

### Text Element (font spec)

```svg
<text x="240" y="155"
  font-family="Helvetica Neue,Helvetica,Arial,sans-serif"
  font-size="95"
  font-weight="500"
  fill="[colour]">[name]</text>
```

### Full Logo Dimensions

| Variant                 | viewBox       | Default Size                     |
| ----------------------- | ------------- | -------------------------------- |
| Full logo (opsly)       | `0 0 600 250` | 600×250                          |
| Full logo (modules)     | `0 0 650 250` | 650×250 (wider for longer names) |
| Mark (with arcs)        | `0 0 200 130` | 200×130                          |
| Simple mark (bars only) | `0 0 200 130` | 200×130                          |

---

## Checklist

- [ ] SVG files copied to `public/logos/`
- [ ] `OpslyLogo` component created
- [ ] Header updated to use `OpslyLogo variant="simple"` or `"mark"`
- [ ] Login/auth pages updated to use full Opsly logo
- [ ] Each module sidebar header uses `OpslyLogo module={currentModule}`
- [ ] Old logo files removed
- [ ] Old logo imports/references removed
- [ ] Tested in dark and light themes
- [ ] Tested at small sizes (header) and large sizes (login page)
