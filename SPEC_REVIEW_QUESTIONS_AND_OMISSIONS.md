# Spec Review: Questions and Omissions

## Critical Integration Issues

### 1. **Tasks Table Structure Mismatch** ⚠️ CRITICAL

**Issue**: Spec references `tasks` table, but codebase has multiple task systems:

- `tasks` (legacy, simple structure with `name`, `status`, `due_date`)
- `checklist_tasks` (main task system used in Today's Tasks page)
- `task_instances` (scheduled task instances)
- `task_templates` (task blueprints)

**Questions**:

- Which table should expiry tasks use? The spec shows `tasks` but Today's Tasks uses `checklist_tasks`
- Should expiry tasks integrate with existing `checklist_tasks` or create separate entries?
- How do expiry tasks appear in Today's Tasks page filtering logic?
- The spec shows `task_type` field but `checklist_tasks` doesn't have this - should we add it?

**Recommendation**: Clarify integration with existing task system. Consider:

- Adding `task_type` to `checklist_tasks` or using `task_data` JSONB field
- Ensuring expiry tasks appear in Today's Tasks page with proper filtering

---

### 2. **Training Records Schema Mismatch** ⚠️ CRITICAL

**Issue**: Spec references fields that don't exist in actual `training_records` table:

**Spec assumes**:

- `certificate_name` (doesn't exist)
- `certificate_type` (doesn't exist)
- `certificate_type_id` (doesn't exist)
- `issuing_body` (doesn't exist)

**Actual schema has**:

- `course_id` (references `training_courses`)
- `status` (not_started, in_progress, completed, expired, failed)
- `certificate_number`, `certificate_url`
- `issued_date`, `expiry_date`
- `provider` (training provider)

**Questions**:

- Should we use `course_id` to determine certificate type?
- How do we identify which certificates need renewal? (via `expiry_date` + `status = 'completed'`?)
- The spec mentions "certificate_type_id" in `expiry_task_assignments` - what should this reference?
- Should we add `certificate_name` and `certificate_type` fields to `training_records`?

**Recommendation**: Either:

1. Add missing fields to `training_records`, OR
2. Update spec to use existing schema (derive certificate info from `course_id`)

---

### 3. **SOP/RA Table Structure** ⚠️

**Issue**: Spec assumes `standard_operating_procedures` table exists, but codebase shows:

- `sop_entries` table (in some migrations)
- `risk_assessments` table exists but structure differs

**Actual `risk_assessments` has**:

- `assessment_data` (JSONB) - not a simple `content` field
- `next_review_date` (not `review_date`)
- `review_date` exists but is different from `next_review_date`
- No `content` field - content is in `assessment_data` JSONB

**Questions**:

- Does `standard_operating_procedures` table exist? Need to verify schema
- For RAs, how do we edit `assessment_data` JSONB? The spec shows rich text editing
- Should we add `content` field to RAs for simpler editing, or work with JSONB?

---

### 4. **Msgly Integration** ⚠️

**Issue**: Spec mentions "Msgly Messaging API" but codebase shows:

- Internal messaging system using `messaging_messages` table
- No external "Msgly" service

**Questions**:

- Is Msgly an internal system name for the messaging feature?
- Should we use existing `messaging_messages` table?
- What's the API structure for sending automated messages?
- The spec shows `msgly_message_id` in `expiry_task_assignments` - should this reference `messaging_messages.id`?

**Recommendation**: Clarify if Msgly = internal messaging system or external service

---

### 5. **Calendar Integration** ⚠️

**Issue**: Spec mentions "Calendar API call" but codebase shows:

- `planly_calendar_events` table (internal calendar)
- Calendar stored in `profile_settings` with JSONB structure
- No external calendar API

**Questions**:

- Should we use `planly_calendar_events` table?
- Or use the `profile_settings` calendar system?
- The spec shows `calendar_event_id` in `expiry_task_assignments` - which table should this reference?

---

## Missing Specifications

### 6. **Task Assignment Logic** ❓

**Missing**:

- How are tasks assigned to managers? Spec says "line manager or site manager" but:
  - What if staff has no line manager?
  - What if site has no manager?
  - What if multiple managers exist?
- Should tasks be assignable to multiple people?
- What happens if assigned manager is on leave?

**Recommendation**: Add fallback assignment logic

---

### 7. **Today's Tasks Page Integration** ❓

**Missing**:

- How do expiry tasks appear in Today's Tasks page?
- Should they show in the same feed as regular tasks?
- How do they integrate with existing filtering (site, daypart, status)?
- Should they have different visual styling?
- The page currently filters by `status IN ('pending', 'in_progress')` - will expiry tasks use same statuses?

**Recommendation**: Specify integration with existing Today's Tasks UI

---

### 8. **Error Handling & Validation** ❓

**Missing**:

- What happens if course assignment fails?
- What if Msgly message send fails?
- What if calendar event creation fails?
- Validation rules for:
  - Expiry dates (can't be in past?)
  - File uploads (size limits, format validation)
  - Course dates (must be before expiry?)
- Retry logic for failed operations
- Partial failure handling (e.g., course assigned but message failed)

**Recommendation**: Add error handling strategy section

---

### 9. **Permissions & Authorization** ❓

**Missing**:

- Who can view expiry tasks? (only assigned manager or all managers?)
- Who can complete tasks? (only assigned manager or any manager?)
- Can staff members see their own expiry tasks?
- What permissions are needed to:
  - Assign courses
  - Upload documents
  - Review SOPs/RAs
  - Access Archive Hub
- RLS policies are specified but not comprehensive permission model

**Recommendation**: Add permissions matrix

---

### 10. **Notification System** ❓

**Missing**:

- Spec mentions notifications but doesn't detail:
  - What notification system to use? (`notifications` table? `planly_notifications`?)
  - Notification types and templates
  - When notifications are sent (immediate? batched?)
  - Notification preferences (can users opt out?)
- The trigger code shows `INSERT INTO notifications` but table structure not specified

**Recommendation**: Specify notification system structure

---

### 11. **Course Completion Detection** ❓

**Missing**:

- Spec mentions trigger on `training_course_completions` insert
- But codebase shows `training_records` table tracks completions
- Which table/event triggers the auto-complete?
- What if course is completed but score is below passing threshold?
- What if course is completed but not verified?

**Questions**:

- Should we trigger on `training_records.status = 'completed'`?
- Or is there a separate `training_course_completions` table?
- How do we match course completion to expiry task? (by `course_id` + `profile_id`?)

---

### 12. **File Storage & Upload** ❓

**Missing**:

- Where are replacement documents stored? (Supabase Storage bucket?)
- File size limits
- File type restrictions (spec shows PDF, DOCX, JPG, PNG - are these the only allowed?)
- Virus scanning?
- Storage path structure
- How are archived files stored? (same bucket with different path?)

**Recommendation**: Specify storage strategy

---

### 13. **Version History & Rollback** ❓

**Missing**:

- Can users view version history from Archive Hub?
- Can users restore previous versions?
- What happens if someone tries to restore an archived version?
- How are version numbers assigned? (sequential? timestamp-based?)

**Recommendation**: Clarify version management capabilities

---

### 14. **Retention Period Enforcement** ❓

**Missing**:

- How is retention period enforced? (automated cleanup job?)
- Who can permanently delete documents? (only admins?)
- What happens when retention period expires? (auto-delete or manual review?)
- Notification before permanent deletion?
- The spec shows `retention_until` but no cleanup process

**Recommendation**: Add retention enforcement strategy

---

### 15. **Daily Task Generator Integration** ❓

**Missing**:

- Spec shows `generate_expiry_tasks()` function
- But codebase has existing daily task generation cron (`generate-daily-tasks` function)
- Should expiry task generation integrate with existing cron?
- Or run as separate scheduled job?
- What's the schedule? (daily at what time?)

**Recommendation**: Specify cron integration

---

### 16. **External Course Follow-up** ❓

**Missing**:

- Spec mentions follow-up reminder but doesn't detail:
  - How is reminder delivered? (notification? new task?)
  - What if manager doesn't respond to follow-up?
  - Can follow-up date be changed after booking?
  - What if external course is cancelled?

**Recommendation**: Add follow-up workflow details

---

### 17. **Archive Hub Permissions** ❓

**Missing**:

- Who can access Archive Hub? (all users? managers only?)
- Can users delete archived documents? (only if past retention?)
- Export permissions - who can export?
- Can archived documents be restored?

---

### 18. **Data Migration** ❓

**Missing**:

- How to handle existing certificates that are expiring?
- Should we backfill expiry tasks for certificates expiring in next 30 days?
- What about existing SOPs/RAs that need review?
- Migration strategy for existing documents

**Recommendation**: Add migration plan

---

### 19. **Rich Text Editor** ❓

**Missing**:

- Spec mentions TipTap but doesn't specify:
  - Which rich text editor library to use?
  - What formatting options are available?
  - How is content stored? (HTML? Markdown? JSON?)
  - Can users paste from Word/Google Docs? (formatting preservation?)

**Recommendation**: Specify editor choice and storage format

---

### 20. **Task Cancellation** ❓

**Missing**:

- What if certificate is no longer required?
- What if staff member leaves company?
- What if document is no longer relevant?
- How to cancel/close expiry tasks?
- The spec shows `status = 'cancelled'` but no cancellation flow

**Recommendation**: Add cancellation workflow

---

### 21. **Multi-Site Considerations** ❓

**Missing**:

- How do expiry tasks work for multi-site companies?
- If staff works at multiple sites, which site gets the task?
- Can tasks be site-specific or company-wide?
- Archive Hub - show all sites or filter by site?

---

### 22. **Bulk Operations** ❓

**Missing**:

- Can managers bulk-assign courses to multiple staff?
- Can managers bulk-review SOPs?
- Bulk upload replacement documents?
- Bulk archive operations?

---

### 23. **Reporting & Analytics** ❓

**Missing**:

- Are there reports for expiry task completion rates?
- Analytics on certificate renewal patterns?
- Compliance reports showing upcoming expiries?
- Archive usage statistics?

---

### 24. **API Rate Limiting** ❓

**Missing**:

- Are there rate limits on API endpoints?
- What happens if too many requests?
- Should we implement request throttling?

---

### 25. **Testing Strategy** ❓

**Missing**:

- The spec has a testing checklist but missing:
  - Unit test requirements
  - Integration test requirements
  - E2E test scenarios
  - Performance testing (what if 1000 certificates expire same day?)
  - Load testing for Archive Hub

---

## Technical Clarifications Needed

### 26. **Database Triggers** ❓

**Questions**:

- The auto-complete trigger references `training_course_completions` table - does this exist?
- Should trigger be idempotent? (what if triggered multiple times?)
- What if trigger fails? (transaction rollback? error logging?)

---

### 27. **State Machine Implementation** ❓

**Questions**:

- Should state machine be enforced at database level? (CHECK constraints?)
- Or application level only?
- What prevents invalid state transitions?
- Should we add state transition audit log?

---

### 28. **Real-time Updates** ❓

**Questions**:

- Should Today's Tasks page update in real-time when tasks are completed?
- Should panels/modals use Supabase real-time subscriptions?
- How to handle concurrent edits? (optimistic locking?)

---

### 29. **Search Functionality** ❓

**Questions**:

- Archive Hub search - what fields are searchable?
- Full-text search? (PostgreSQL full-text search? Elasticsearch?)
- Search performance for large archives?

---

### 30. **Export Format** ❓

**Questions**:

- What format for compliance export? (PDF? CSV? ZIP of files?)
- What data is included in export?
- Can exports be scheduled?

---

## Summary of Critical Issues

1. **Tasks table integration** - Need to clarify which table and how to integrate
2. **Training records schema** - Fields don't match actual schema
3. **SOP/RA structure** - Need to verify table existence and content storage
4. **Msgly/Calendar** - Clarify if internal systems or external APIs
5. **Today's Tasks integration** - How do expiry tasks appear in existing UI

## Recommended Next Steps

1. **Schema Audit**: Verify all referenced tables exist and match spec
2. **Integration Plan**: Document how expiry tasks integrate with existing task system
3. **API Design**: Clarify internal vs external service integrations
4. **Error Handling**: Add comprehensive error handling strategy
5. **Permissions**: Define complete permissions matrix
6. **Migration Plan**: Document data migration strategy
