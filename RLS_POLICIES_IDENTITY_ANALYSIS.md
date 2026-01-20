# RLS Policies Identity Standardization Analysis

**Date:** February 12, 2025  
**Status:** Analysis of RLS policies using `auth.uid()`

---

## Executive Summary

From your RLS policies audit results, I found:

### ✅ Policies Using Correct Pattern (profiles.id = auth.uid())
**Count:** ~80% of policies  
**Status:** ✅ CORRECT - These will work after migration

### ⚠️ Policies Using Potentially Problematic Pattern (user_id = auth.uid())
**Count:** ~20% of policies  
**Status:** ⚠️ NEEDS REVIEW - These tables likely still have `user_id` columns

---

## Policies That Need Review

### 1. **assistant_conversations** 
**Policies:**
- `assistant_conv_insert`: `user_id = auth.uid()`
- `assistant_conv_select`: `user_id = auth.uid()`

**Issue:** Table likely has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 2. **dashboard_preferences**
**Policies:**
- `Users can delete their own dashboard preferences`: `auth.uid() = user_id`
- `Users can insert their own dashboard preferences`: `auth.uid() = user_id`
- `Users can update their own dashboard preferences`: `auth.uid() = user_id`
- `Users can view their own dashboard preferences`: `auth.uid() = user_id`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 3. **push_subscriptions**
**Policies:**
- `push_subscriptions_delete_own`: `user_id = auth.uid()`
- `push_subscriptions_insert_own`: `auth.uid() = user_id`
- `push_subscriptions_select_own`: `auth.uid() = user_id`
- `push_subscriptions_update_own`: `auth.uid() = user_id`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 4. **message_reactions**
**Policies:**
- `message_reactions_delete_own`: `user_id = auth.uid()`
- `message_reactions_insert_participant`: `user_id = auth.uid()`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 5. **messaging_channel_members**
**Policies:**
- `Users can update own membership`: `user_id = auth.uid()`
- `Users can view channel members`: `user_id = auth.uid()`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 6. **messaging_channels**
**Policies:**
- `Users can create channels in their company`: `created_by = auth.uid()`
- Uses `created_by` instead of `created_by_profile_id`  
**Action:** Check if this is intentional or needs fixing

---

### 7. **messaging_message_reads**
**Policies:**
- `Users can mark messages read`: `user_id = auth.uid()`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 8. **messaging_message_tags**
**Policies:**
- `Channel members can tag messages`: `tagged_by = auth.uid()`
- `Users can remove their own tags`: `tagged_by = auth.uid()`

**Issue:** Uses `tagged_by` instead of `tagged_by_profile_id`  
**Action:** Check if this is intentional or needs fixing

---

### 9. **messaging_messages**
**Policies:**
- `Members can post messages`: `sender_id = auth.uid()`
- `Users can edit own messages`: `sender_id = auth.uid()`

**Issue:** Table has `sender_id` column that should be `sender_profile_id`  
**Action:** Check if table needs migration

---

### 10. **typing_indicators**
**Policies:**
- `typing_indicators_upsert_own`: `user_id = auth.uid()`
- References `messaging_channel_members.user_id` in condition

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 11. **training_bookings**
**Policies:**
- All policies reference `training_bookings.user_id`
- Compare with `profiles.id` but table has `user_id` column

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 12. **training_records**
**Policies:**
- All policies reference `training_records.user_id`
- One policy: `tenant_select_training_records` uses `p.id = training_records.user_id`

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

### 13. **user_certificates**
**Policies:**
- `Owner/manager/user can modify own certificates`: Uses `user_certificates.user_id`
- Compare with `profiles.id` but table has `user_id` column

**Issue:** Table has `user_id` column that should be `profile_id`  
**Action:** Check if table needs migration

---

## Policies Using Mixed Patterns (Both auth.uid() and profiles.id)

### 14. **companies**
**Policies:**
- `companies_insert_own`: `user_id = auth.uid()` OR `created_by = auth.uid()`
- `companies_update_company`: Uses `user_id`, `created_by`, and helper functions

**Issue:** Table may have both `user_id` and `created_by` columns  
**Action:** Check table schema - may need both columns updated

---

## Policies That Are CORRECT ✅

These policies correctly use `profiles.id = auth.uid()`:
- ✅ Most of the application policies (80%+)
- ✅ `staff_attendance` - Uses `profile_id = auth.uid()` ✅
- ✅ `messages` - Uses `sender_profile_id = auth.uid()` ✅
- ✅ `conversation_participants` - Uses `profile_id = auth.uid()` ✅
- ✅ `message_reads` - Uses `profile_id = auth.uid()` ✅
- ✅ `notifications` - Uses `profile_id = auth.uid()` ✅
- ✅ `leave_balances`, `leave_requests` - Uses `profile_id IN (SELECT profiles.id...)` ✅
- ✅ Most Stockly policies - Use `profiles.company_id` ✅

---

## Recommended Action Plan

### Step 1: Verify Current Database State
Run Query 1 from `day1-identity-audit.sql` to see:
- Which tables still have `user_id` columns
- Which tables have `profile_id` columns
- Which need migration

### Step 2: Identify Tables Needing Migration
Based on RLS policies, these tables likely need migration:
1. `assistant_conversations` - `user_id` → `profile_id`
2. `dashboard_preferences` - `user_id` → `profile_id`
3. `push_subscriptions` - `user_id` → `profile_id`
4. `message_reactions` - `user_id` → `profile_id`
5. `messaging_channel_members` - `user_id` → `profile_id`
6. `messaging_message_reads` - `user_id` → `profile_id`
7. `messaging_messages` - `sender_id` → `sender_profile_id`
8. `typing_indicators` - `user_id` → `profile_id`
9. `training_bookings` - `user_id` → `profile_id`
10. `training_records` - `user_id` → `profile_id`
11. `user_certificates` - `user_id` → `profile_id`

### Step 3: Update RLS Policies After Migration
After migrating columns, update RLS policies to:
- Change `user_id = auth.uid()` → `profile_id = auth.uid()` 
- Change `sender_id = auth.uid()` → `sender_profile_id = auth.uid()`
- Change `created_by = auth.uid()` → `created_by_profile_id = auth.uid()` (if appropriate)
- Change `tagged_by = auth.uid()` → `tagged_by_profile_id = auth.uid()` (if appropriate)

---

## Next Steps

1. **Run the full audit** (`day1-identity-audit.sql`) to get complete picture
2. **Check Query 1 results** - See which tables have `user_id` columns
3. **Check Query 3 results** - See which foreign keys point to `auth.users`
4. **Update migration script** - Add any missing tables to `20250212000001_identity_standardization.sql`
5. **Update RLS policies** - After migration, update policies for migrated tables

---

**Status:** Analysis Complete - Need to verify actual database state with full audit
