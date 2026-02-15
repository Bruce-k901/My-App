# Refactoring Guide: Breaking the Debugging Loop

This guide helps you refactor safely without creating cascading breakages.

## 🎯 The Problem

You're experiencing circular debugging because:

- Multiple generations of code exist simultaneously
- Changes break other parts of the system
- No clear "working state" to revert to
- No tests to catch regressions

## ✅ The Solution: Feature Freeze Strategy

### Step 1: Create a Stable Baseline (30 minutes)

```bash
# Create a recovery point
git tag stable-baseline-$(date +%Y%m%d)
git push origin --tags

# Create a refactor branch
git checkout -b refactor/consolidation main
```

**Why:** You can always return to this point if things break.

### Step 2: Answer the 5 Key Questions (30 minutes)

Based on your audit, decide:

1. **Route Structure:** `/dashboard/*` ✅ (chosen in ADR-001)
2. **Sites Page:** `/dashboard/sites` ✅ (most complete)
3. **Sidebar:** `MainSidebar` ✅ (chosen in ADR-002)
4. **Delete Playgrounds:** YES - all 5 of them
5. **Delete Debug Pages:** YES - already removed

### Step 3: Use Feature Flags for Safe Rollouts

Instead of changing code directly, use feature flags:

```typescript
// Before: Direct change
export default function SitesPage() {
  return <NewSitesComponent />;
}

// After: Feature flag
import { FEATURE_FLAGS } from '@/lib/featureFlags';

export default function SitesPage() {
  if (FEATURE_FLAGS.USE_NEW_SITES_PAGE) {
    return <NewSitesComponent />;
  }
  return <OldSitesComponent />;
}
```

**Why:** You can deploy both versions and switch between them without code changes.

### Step 4: Consolidate Routes (Week 1)

#### Day 1-2: Add Redirects (Low Risk)

```typescript
// src/app/organization/sites/page.tsx
import { redirect } from "next/navigation";

export default function OrganizationSitesPage() {
  redirect("/dashboard/sites");
}
```

**Why:** Old routes still work, but point to new routes.

#### Day 3-4: Update Internal Links (Medium Risk)

Search for all references to old routes:

```bash
grep -r "/organization/sites" src/
grep -r "/dashboard/organization" src/
```

Update them to use `/dashboard/*` routes.

#### Day 5: Test Everything

Run the critical paths test:

```bash
npm run test tests/critical-paths.test.ts
```

### Step 5: Remove Duplicate Pages (Week 2)

Only after redirects are working and tested:

1. Choose the best implementation (usually `/dashboard/*` version)
2. Delete duplicate pages
3. Update all references
4. Test again

### Step 6: Clean Up (Week 3)

1. Remove redirect pages (after confirming no usage)
2. Remove playground pages
3. Update documentation
4. Celebrate! 🎉

## 🛡️ Safety Mechanisms

### 1. Integration Tests

Before refactoring, run:

```bash
npm run test tests/critical-paths.test.ts
```

After refactoring, run again to catch regressions.

### 2. Feature Flags

Use feature flags to toggle between old/new implementations:

```bash
# .env.local
NEXT_PUBLIC_USE_NEW_SITES_PAGE=true
```

### 3. Deprecation Warnings

Add console warnings to deprecated routes:

```typescript
export default function DeprecatedPage() {
  if (process.env.NODE_ENV === "development") {
    console.warn("This route is deprecated. Use /dashboard/sites instead.");
  }
  redirect("/dashboard/sites");
}
```

### 4. Git Tags

Tag stable points:

```bash
git tag before-refactor-20251120
git tag after-route-consolidation-20251125
```

## 📋 Refactoring Checklist

### Before Starting

- [ ] Create git tag for recovery point
- [ ] Create refactor branch
- [ ] Run integration tests (baseline)
- [ ] Document current working state
- [ ] Answer the 5 key questions

### During Refactoring

- [ ] Use feature flags for changes
- [ ] Add redirects before removing pages
- [ ] Update tests as you go
- [ ] Commit frequently with clear messages
- [ ] Test after each major change

### After Refactoring

- [ ] Run integration tests
- [ ] Check for broken links
- [ ] Update documentation
- [ ] Remove old code (after grace period)
- [ ] Merge to main

## 🚨 Red Flags (Stop and Revert)

If you see these, stop and revert:

1. **Multiple pages break at once** - You've changed something too fundamental
2. **Circular redirects** - Check redirect chains
3. **Tests fail** - Fix tests before continuing
4. **Users report issues** - Revert and use feature flags instead

## 💡 Best Practices

### 1. One Change at a Time

Don't refactor routes, sidebar, and components all at once. Do one, test, then move on.

### 2. Small Commits

Commit after each logical change:

```bash
git commit -m "feat: add redirect from /organization/sites to /dashboard/sites"
```

### 3. Test Frequently

Run tests after each change:

```bash
npm run test
npm run dev  # Manual testing
```

### 4. Document Decisions

Create ADRs for architectural decisions (see `docs/decisions/`).

### 5. Use Deprecation Periods

Don't delete old code immediately. Add redirects, wait 2 weeks, then remove.

## 📚 Related Documents

- `docs/CURRENT_ARCHITECTURE.md` - Current working state
- `docs/decisions/ADR-001-route-structure.md` - Route structure decision
- `docs/decisions/ADR-002-sidebar-system.md` - Sidebar decision
- `tests/critical-paths.test.ts` - Integration tests

## 🆘 Getting Help

If you're stuck:

1. Check `docs/CURRENT_ARCHITECTURE.md` for what should work
2. Run integration tests to see what's broken
3. Use feature flags to roll back changes
4. Revert to last git tag if needed

Remember: **Slow and steady wins the race.** Better to take 3 weeks and do it right than rush and break everything.
