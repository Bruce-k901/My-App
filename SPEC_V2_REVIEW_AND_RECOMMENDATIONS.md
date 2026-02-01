# Spec V2 Review: Findings & Recommendations

## Overall Assessment: ✅ **Much Better, But Needs Minor Fixes**

The v2 spec is significantly improved and aligns well with the codebase. However, there are a few critical discrepancies that need to be addressed before implementation.

---

## ✅ **What's Working Well**

1. **Uses `checklist_tasks`** - Correctly identifies the main task table
2. **Uses `task_data` JSONB** - Smart approach for flexible expiry task metadata
3. **References actual tables** - `sop_entries`, `risk_assessments`, `messaging_messages`, `planly_calendar_events`, `notifications`
4. **Integration patterns** - Clear examples for Msgly and Calendar integration
5. **Archive Hub approach** - Unified view from multiple sources is elegant

---

## ⚠️ **Critical Issues to Fix**

### 1. **Training Records Schema Mismatch** 🔴

**Issue**: Spec v2 shows `training_records` uses `training_type` enum, but actual schema uses `course_id` foreign key.

**Spec v2 shows** (lines 142-151):

```typescript
training_records:
  profile_id UUID
  training_type training_type_enum  // ❌ WRONG
  provider TEXT
  completed_date DATE
  expiry_date DATE
  certificate_url TEXT
```

**Actual schema** (from migration `20250305000002_create_training_records.sql`):

```sql
training_records:
  id UUID PRIMARY KEY
  company_id UUID NOT NULL
  profile_id UUID NOT NULL
  course_id UUID NOT NULL  // ✅ Uses foreign key, not enum
  status TEXT ('not_started', 'in_progress', 'completed', 'expired', 'failed')
  completed_at TIMESTAMPTZ
  score_percentage INTEGER
  passed BOOLEAN
  certificate_number TEXT
  certificate_url TEXT
  issued_date DATE
  expiry_date DATE
  provider TEXT
  ...
```

**However**, TypeScript types show `training_type` enum exists. This suggests:

- There might be TWO different `training_records` tables, OR
- The schema was changed from enum to foreign key, OR
- The TypeScript types are outdated

**Recommendation**:

1. **Verify actual schema** - Run `\d training_records` in Supabase SQL editor
2. **If using `course_id`** (likely):
   - Update spec to use `course_id` instead of `training_type`
   - Update trigger logic to match by `course_id` + `profile_id`
   - Remove enum extension section (3.1) or clarify it's for a different table
3. **If using `training_type` enum**:
   - Update migration to match spec
   - Update trigger to use enum values

**Impact**: HIGH - This affects the entire training certificate workflow

---

### 2. **Missing `training_course_completions` Table** 🔴

**Issue**: Spec v2 trigger (line 1248-1351) references `training_course_completions` table, but this table doesn't exist in the codebase.

**Spec shows**:

```sql
CREATE TRIGGER on_training_completion
AFTER INSERT ON training_course_completions  // ❌ Table doesn't exist
FOR EACH ROW
EXECUTE FUNCTION handle_training_completion();
```

**Actual system**: Course completion is tracked via:

- `training_records` table (status changes to 'completed')
- `complete_training()` RPC function
- Direct updates to `training_records` when course is passed

**Recommendation**:

1. **Option A (Recommended)**: Trigger on `training_records` UPDATE when `status` changes to 'completed' AND `passed = true`

   ```sql
   CREATE TRIGGER on_training_completion
   AFTER UPDATE ON training_records
   FOR EACH ROW
   WHEN (NEW.status = 'completed' AND NEW.passed = true AND OLD.status != 'completed')
   EXECUTE FUNCTION handle_training_completion();
   ```

2. **Option B**: Create `training_course_completions` table as a completion log/audit table
   - Insert into this table when course is completed
   - Trigger on INSERT to this table

**Impact**: HIGH - Auto-completion won't work without this fix

---

### 3. **SOP Archive Fields** 🟡

**Issue**: Spec assumes `sop_entries` has `archived_at` and `archived_by`, but these might not exist.

**Spec shows** (line 702):

```sql
-- Updates old row: archived_from_sop_id, archived_at, archived_by, status = 'archived'
```

**Actual schema** (from migrations):

- ✅ `archived_from_sop_id` exists (confirmed in `20250322000003_prep_item_recipe_system.sql`)
- ❓ `archived_at` - Need to verify
- ❓ `archived_by` - Need to verify
- ✅ `status` exists (can be set to 'Archived')

**Recommendation**:

1. **Check if fields exist**: Run `\d sop_entries` in Supabase
2. **If missing**: Add to migration:
   ```sql
   ALTER TABLE sop_entries
   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
   ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);
   ```

**Impact**: MEDIUM - Archive tracking won't work properly

---

### 4. **Training Record Field Names** 🟡

**Issue**: Spec uses `completed_date` but actual schema uses `completed_at` (TIMESTAMPTZ).

**Spec shows** (line 148):

```
completed_date DATE
```

**Actual schema**:

```
completed_at TIMESTAMPTZ
```

**Recommendation**: Update spec to use `completed_at` consistently

**Impact**: LOW - Easy fix, just naming inconsistency

---

### 5. **Trigger Function References** 🟡

**Issue**: Trigger function references fields that might not match actual schema.

**Spec trigger** (line 1271):

```sql
v_new_expiry := NEW.completed_at::DATE + INTERVAL '3 years';
```

But if triggering on `training_records` UPDATE, should use:

```sql
v_new_expiry := NEW.completed_at::DATE + INTERVAL '3 years';
-- OR if using issued_date:
v_new_expiry := NEW.issued_date + INTERVAL '3 years';
```

Also, trigger references:

- `NEW.user_id` - Should be `NEW.profile_id`
- `NEW.course_name` - Doesn't exist, need to JOIN `training_courses`
- `NEW.certificate_url` - Exists
- `NEW.score` - Should be `NEW.score_percentage`

**Recommendation**: Update trigger to match actual `training_records` schema

**Impact**: HIGH - Trigger won't work correctly

---

## 📋 **Minor Improvements**

### 6. **Today's Tasks Integration** 💡

**Suggestion**: Add section on how expiry tasks appear in Today's Tasks filtering.

The spec doesn't explicitly state:

- How expiry tasks are filtered (by `task_data->>'task_type'`?)
- Whether they appear alongside regular tasks
- If they need special handling in the UI

**Recommendation**: Add brief section:

```markdown
### Today's Tasks Integration

Expiry tasks appear in Today's Tasks page alongside regular tasks. They can be identified by:

- `task_data->>'task_type' IN ('training_certificate_expiry', 'sop_review', 'ra_review', 'document_expiry')`
- Visual indicator (badge/icon) on task card
- Clicking task opens appropriate panel/modal
```

---

### 7. **Error Handling** 💡

**Suggestion**: Add error handling strategy for:

- Failed message sends
- Failed calendar event creation
- Failed file uploads
- Partial failures (e.g., course assigned but message failed)

**Recommendation**: Add section on rollback/retry logic

---

### 8. **Training Type vs Course ID** 💡

**Clarification needed**: The spec mentions extending `training_type_enum` (section 3.1), but if using `course_id`, this isn't needed.

**Recommendation**:

- If using `course_id`: Remove section 3.1 or clarify it's for a different purpose
- If using `training_type`: Update all references to use enum values

---

## ✅ **What's Already Correct**

1. ✅ `checklist_tasks` table structure matches
2. ✅ `sop_entries` versioning fields exist (`parent_id`, `version_number`, `archived_from_sop_id`)
3. ✅ `risk_assessments` has `next_review_date` and `review_date`
4. ✅ `messaging_messages` structure matches
5. ✅ `planly_calendar_events` structure matches
6. ✅ `notifications` structure matches
7. ✅ Archive Hub unified query approach is sound

---

## 🎯 **Recommended Action Plan**

### Before Implementation:

1. **Verify Training Records Schema** (15 min)

   ```sql
   -- Run in Supabase SQL editor
   \d training_records
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'training_records';
   ```

2. **Check SOP Archive Fields** (5 min)

   ```sql
   \d sop_entries
   ```

3. **Decide on Completion Trigger** (30 min)
   - Option A: Trigger on `training_records` UPDATE
   - Option B: Create `training_course_completions` table

4. **Update Spec v2** with corrections:
   - Fix `training_records` schema references
   - Fix trigger function
   - Add missing archive fields if needed
   - Update field names (`completed_date` → `completed_at`)

### During Implementation:

1. Start with Phase A (Foundation) - verify all migrations work
2. Test trigger logic with sample data before building UI
3. Build UI components incrementally, testing each workflow

---

## 📊 **Summary**

| Issue                                 | Severity      | Status       | Fix Required                             |
| ------------------------------------- | ------------- | ------------ | ---------------------------------------- |
| Training records schema mismatch      | 🔴 HIGH       | Needs fix    | Update spec to use `course_id`           |
| Missing `training_course_completions` | 🔴 HIGH       | Needs fix    | Update trigger to use `training_records` |
| SOP archive fields                    | 🟡 MEDIUM     | Verify       | Add if missing                           |
| Field name inconsistencies            | 🟡 LOW        | Needs fix    | Update spec                              |
| Trigger function references           | 🔴 HIGH       | Needs fix    | Match actual schema                      |
| Today's Tasks integration             | 💡 SUGGESTION | Nice to have | Add documentation                        |

**Overall**: Spec is 85% ready. Fix the 5 critical issues above and it's ready for implementation.

---

## 🚀 **Next Steps**

1. **Verify actual schemas** in Supabase (run the SQL queries above)
2. **Update spec v2** with corrections
3. **Create v2.1** with fixes
4. **Review v2.1** - should be ready to implement

Would you like me to:

- Create the corrected spec v2.1?
- Help verify the actual schemas?
- Create a migration plan based on the verified schemas?
