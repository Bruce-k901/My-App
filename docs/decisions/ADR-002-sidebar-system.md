# ADR-002: Use MainSidebar as Primary Navigation

## Status

**Accepted** - November 2025

## Context

We have 3 different sidebar systems:

1. `MainSidebar.tsx` - Active, used by HeaderLayout (17 items, grouped by sections)
2. `NewMainSidebar.tsx` - Alternative implementation (hover popups)
3. `ContextualSidebar.tsx` - Contextual sidebar for specific pages
4. `LeftSidebar.tsx` - Legacy sidebar (not actively used)

This creates confusion about which sidebar to use and inconsistent navigation patterns.

## Decision

Use `MainSidebar.tsx` as the primary navigation system for all dashboard pages.

### Rationale

- Already integrated with HeaderLayout
- Most complete implementation (17 navigation items)
- Grouped by sections (Organization, Tasks, SOPs, Assets, Checklists)
- Role-based filtering support
- Modern design with hover-to-expand functionality

## Consequences

### Positive

- ✅ Consistent navigation across all pages
- ✅ Single source of truth for navigation items
- ✅ Easier to maintain and update
- ✅ Better user experience (consistent UI)

### Negative

- ⚠️ Need to remove or deprecate other sidebar implementations
- ⚠️ May need to enhance MainSidebar if it lacks features from others

## Migration Plan

### Phase 1: Document Current State (Week 1)

- Document all navigation items in MainSidebar
- Identify any missing features from other sidebars
- Create migration checklist

### Phase 2: Enhance MainSidebar (Week 2)

- Add any missing features from other sidebars
- Ensure all routes are properly linked
- Test navigation thoroughly

### Phase 3: Remove Old Sidebars (Week 3)

- Mark old sidebars as deprecated
- Remove unused sidebar components
- Update any pages still using old sidebars

## Notes

- ContextualSidebar can be kept for specific use cases if needed
- NewMainSidebar can be kept as a reference for future enhancements
- All sidebar changes should be tested with role-based filtering
