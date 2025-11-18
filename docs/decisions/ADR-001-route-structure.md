# ADR-001: Use /dashboard/\* as Primary Route Structure

## Status

**Accepted** - November 2025

## Context

We have 4 conflicting route structures causing maintenance issues:

1. `/dashboard/*` - Legacy system (some working, some broken)
2. `/organization/*` - Newer system (most functional)
3. `/dashboard/organization/*` - Hybrid system (mix of redirects and pages)
4. Top-level routes - Mixed system

This creates confusion about which route to use, duplicate functionality, and circular redirects.

## Decision

Standardize on `/dashboard/*` as the primary route structure for all authenticated application pages.

### Rationale

- `/dashboard/*` is already the most widely used structure
- MainSidebar already links to `/dashboard/*` routes
- Most working pages are already under `/dashboard/*`
- Easier migration path (redirect old routes rather than rebuild)

## Consequences

### Positive

- ✅ Simpler routing logic
- ✅ Consistent URL structure
- ✅ Easier to understand for developers
- ✅ Better long-term maintainability
- ✅ Matches existing sidebar navigation

### Negative

- ⚠️ Need to migrate `/organization/*` links to `/dashboard/*`
- ⚠️ Need to update any bookmarks or external links
- ⚠️ Some pages may need to be consolidated

## Migration Plan

### Phase 1: Redirect Old Routes (Week 1)

- Add redirects from `/organization/*` to `/dashboard/*`
- Keep old routes working temporarily for backward compatibility
- Update internal links gradually

### Phase 2: Consolidate Pages (Week 2)

- Choose best implementation for duplicate pages (Sites, Users, etc.)
- Remove duplicate pages
- Update all references

### Phase 3: Clean Up (Week 3)

- Remove redirect pages
- Update documentation
- Update tests

## Notes

- This decision can be revisited if `/organization/*` proves to be significantly better
- Feature flags can be used to test migration safely
- All redirects should log usage to identify when old routes can be removed
