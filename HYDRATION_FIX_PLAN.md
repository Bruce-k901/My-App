# Comprehensive Hydration Fix Plan

## Problem

Hydration mismatches occur when server-rendered HTML doesn't match client-rendered HTML. This causes:

- React hydration errors
- Layout shifts
- State loss (e.g., sidebar items disappearing)
- Poor user experience

## Root Causes Identified

1. **Page Reloads**: `window.location.reload()` causes full page reloads, losing state
2. **Hydration Guards**: Inconsistent use of `isMounted`/`hasHydrated` patterns
3. **Template Literals in className**: Dynamic className generation causes mismatches
4. **Conditional Rendering**: Different structures on server vs client

## Fix Strategy

### Phase 1: Replace Page Reloads ✅

- [x] `src/components/organisation/BusinessDetailsTab.tsx` - Fixed
- [x] `src/app/dashboard/business/page.tsx` - Fixed
- [ ] `src/app/layout.tsx` - Chunk error handler (keep for now - needed for error recovery)

### Phase 2: Fix Hydration Guards

- [x] `src/app/dashboard/layout.tsx` - Fixed (client-only rendering)
- [x] `src/app/dashboard/business/page.tsx` - Fixed (removed guard)
- [ ] `src/app/dashboard/todays_tasks/page.tsx` - Needs fix (uses isMounted for date)

### Phase 3: Fix Template Literals in className

- [x] `src/components/layouts/NewMainSidebar.tsx` - SidebarDirectLink fixed
- [ ] `src/components/layouts/NewMainSidebar.tsx` - Other template literals (7 instances)
- [ ] `src/components/layouts/DashboardHeader.tsx` - Template literals (5 instances)

### Phase 4: Standardize Page Patterns

All dashboard pages should:

1. Use `OrgContentWrapper` for consistent structure
2. Never use `isMounted`/`hasHydrated` guards (layout handles it)
3. Use `router.refresh()` instead of `window.location.reload()`
4. Always render same structure on server and client

## Standard Dashboard Page Pattern

```typescript
"use client";

import { useAppContext } from "@/context/AppContext";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const router = useRouter();
  const { companyId, loading } = useAppContext();

  // No hydration guards - layout handles it
  // No isMounted - always render same structure

  if (loading) {
    return (
      <OrgContentWrapper title="My Page">
        <div>Loading...</div>
      </OrgContentWrapper>
    );
  }

  return (
    <OrgContentWrapper title="My Page">
      {/* Page content */}
    </OrgContentWrapper>
  );
}
```

## Testing Checklist

After fixes, test:

- [ ] Save business details - no hydration error
- [ ] Navigate between all sidebar pages - no hydration errors
- [ ] Onboarding remains visible after navigation
- [ ] All pages render below header (not under it)
- [ ] No console hydration warnings
