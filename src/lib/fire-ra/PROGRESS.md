# Fire Risk Assessment — Implementation Progress

## Phase A: Foundation (Types, Constants, Utilities, Migration)

- **Status**: Complete
- **Files created**:
  - `src/types/fire-ra.ts` — all interfaces and types
  - `src/lib/fire-ra/constants.ts` — screening questions, sections, items, risk scales
  - `src/lib/fire-ra/utils.ts` — tier calculation, factories, risk computation, completion tracking
  - `supabase/migrations/20260303140000_add_fire_ra_support.sql` — composite index
- **Deviations**: Used `Date.now()` + `Math.random()` for IDs instead of uuid (matching codebase pattern)
- **Notes**: uuid package not installed; codebase uses inline ID generation

## Phase B: Core UI (Screening + Assessment Form)

- **Status**: Complete
- **Build**: Passes (`npx next build --webpack`)
- **Files created**:
  - `src/components/fire-ra/FireRAScreening.tsx` — 7-question screening wizard with tier determination
  - `src/components/fire-ra/FireRARiskRating.tsx` — Likelihood x Severity dropdowns with risk badge
  - `src/components/fire-ra/FireRAItemCard.tsx` — Expandable assessment item with AI assist buttons
  - `src/components/fire-ra/FireRASectionNav.tsx` — Section sidebar with completion indicators
  - `src/components/fire-ra/FireRASectionPanel.tsx` — Section content with items, custom item add, notes
  - `src/components/fire-ra/FireRASummary.tsx` — Auto-calculated summary, action plan, sign-off
  - `src/app/dashboard/risk-assessments/fire-ra/page.tsx` — Main page (screening flow + assessment form + save)
- **Files modified**:
  - `src/app/dashboard/risk-assessments/page.tsx` — Added 'fire' filter, Fire RA badge, edit routing, risk badge support
- **Deviations**: AI assist buttons are wired but show placeholder toast (actual AI wired in Phase C)
- **Notes**: Section 1 (General Info) rendered inline; Section 12 (Summary) rendered via FireRASummary component

## Phase C: AI Integration

- **Status**: Complete
- **Build**: Passes
- **Files created**:
  - `src/lib/fire-ra/ai-prompts.ts` — system/user prompts with premises context, 3 modes (generate/improve/suggest_actions)
  - `src/app/api/assistant/fire-ra-assist/route.ts` — POST endpoint, Anthropic SDK, Sonnet->Haiku fallback, 401/429 handling
  - `src/hooks/useFireRAAI.ts` — React hook wrapping API, per-field loading state, toast errors
- **Files modified**:
  - `src/app/dashboard/risk-assessments/fire-ra/page.tsx` — wired useFireRAAI hook, AI suggestions auto-apply to items with ai_generated flags
- **Notes**: AI suggestions auto-populate the field and set `*AiGenerated: true`; user can edit freely (flag clears on manual edit in FireRAItemCard)

## Phase D: Task Generation

- **Status**: Complete
- **Build**: Passes
- **Files created**:
  - `src/lib/fire-ra/task-generation.ts` — previewTasks (with fuzzy matching), generateTasks (insert to checklist_tasks), applyTaskLinks
  - `src/components/fire-ra/FireRATaskReviewModal.tsx` — grouped by priority, select/deselect, link-to-existing toggle
  - `src/lib/fire-ra/review-reminders.ts` — OA notifications on publish, review date reminders
- **Files modified**:
  - `src/app/dashboard/risk-assessments/fire-ra/page.tsx` — task modal integration on save (Published/Under Review status triggers modal)
- **Notes**: Tasks are only offered for generation when status is Published or Under Review. Draft saves skip task generation.

## Phase E: PDF Export & Polish

- **Status**: Complete
- **Build**: Passes (`npx next build --webpack`)
- **Files created**:
  - `src/lib/fire-ra/export-pdf.ts` — jsPDF + jspdf-autotable PDF export (cover page, screening summary, sections 2-11 as tables, action plan summary, sign-off page, specialist tier advisory banners)
- **Files modified**:
  - `src/app/dashboard/risk-assessments/fire-ra/page.tsx` — Added "Export PDF" button to sticky save bar, imported export function
  - `src/app/dashboard/risk-assessments/view/[id]/page.tsx` — Fire RA rendering: tier badge, screening details, premises info, overall risk with completion bar, expandable sections with items/findings/controls/actions, sign-off, Edit + PDF download buttons
  - `src/app/dashboard/sops/ra-templates/page.tsx` — Added Fire RA template card (Fire icon, orange theme, links to /dashboard/risk-assessments/fire-ra)
- **Deviations**: None
- **Notes**: PDF exports from both the form page (sticky bar) and the view page (action buttons). View page sections are collapsible accordion-style for readability.

## Phase F: Checklist Refactor (Premises-Specific Checklists)

- **Status**: Complete
- **Build**: Passes (`npx next build --webpack`)
- **Files created**:
  - `src/lib/fire-ra/checklist-options.ts` — Master checklist data for all 53 items x 8 premises types, with `getChecklistOptions()` and `createChecklistFieldData()` helpers
  - `src/components/fire-ra/FireRAChecklistField.tsx` — Reusable checkbox list component (checked/unchecked grouping, custom item add, AI sparkle button, notes)
- **Files modified**:
  - `src/types/fire-ra.ts` — Added `ChecklistOption`, `ChecklistFieldData` interfaces; added optional `findingChecklist`, `existingControlsChecklist`, `actionRequiredChecklist` to `FireRAItem`; added `suggestedChecklist` to `FireRAAIAssistResponse`
  - `src/lib/fire-ra/utils.ts` — Added `flattenChecklist()` helper
  - `src/components/fire-ra/FireRAItemCard.tsx` — Replaced textareas with `FireRAChecklistField` components; lazy-init checklists on expand; dual-sync (checklist + flattened string); added `premisesType` prop
  - `src/components/fire-ra/FireRASectionPanel.tsx` — Added `premisesType` prop, passes to each ItemCard
  - `src/app/dashboard/risk-assessments/fire-ra/page.tsx` — Passes `premisesType` to SectionPanel; updated AI handler to merge `suggestedChecklist` items; added `flattenChecklist` import
  - `src/lib/fire-ra/ai-prompts.ts` — Updated prompts to request JSON array format for checklist suggestions
  - `src/app/api/assistant/fire-ra-assist/route.ts` — Parses AI response as JSON array, returns `suggestedChecklist` alongside text
  - `src/app/dashboard/risk-assessments/view/[id]/page.tsx` — Renders checklist data as checked item lists with checkmarks, falls back to plain text
  - `src/lib/fire-ra/export-pdf.ts` — Formats checklist data with checkmark symbols in PDF cells
- **Backward compat**: Old saved assessments with string-only fields still work (checklist lazily initialized on edit, text preserved in notes field)
- **Notes**: All 8 premises types have premises-specific options. AI now returns structured JSON arrays which merge as new checklist items.
