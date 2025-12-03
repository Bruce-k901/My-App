# Comprehensive Debug Strategy & Testing Plan

## 🎯 Goal

Stop the fix-break-fix cycle by establishing:

1. **Systematic testing** before and after every change
2. **Clear architecture documentation** to prevent conflicts
3. **Regression prevention** through automated checks
4. **Isolated fix process** that doesn't break other features

---

## 📋 Table of Contents

1. [Current Problems Identified](#current-problems-identified)
2. [Testing Strategy](#testing-strategy)
3. [Architecture Documentation](#architecture-documentation)
4. [Fix Process Workflow](#fix-process-workflow)
5. [Critical Path Tests](#critical-path-tests)
6. [RLS Policy Consolidation](#rls-policy-consolidation)
7. [Onboarding Flow Fix](#onboarding-flow-fix)

---

## 🔍 Current Problems Identified

### 1. **RLS Policy Conflicts**

- **Issue**: Multiple SQL files trying to fix the same RLS policies (`fix_companies_rls.sql`, `rls_fix.sql`, `rls_emergency_fix.sql`, `security_enhancements.sql`, `companies.sql`)
- **Impact**: Policies conflict, causing unpredictable access issues
- **Solution**: Consolidate into ONE authoritative source

### 2. **Circular Dependency in Onboarding**

- **Issue**: Companies need profiles, profiles need companies (chicken-and-egg)
- **Impact**: Onboarding fails or creates inconsistent state
- **Solution**: Define clear creation order and temporary permissions

### 3. **Multiple Company Creation Entry Points**

- **Issue**: Companies can be created via:
  - `/signup` page (direct)
  - `/api/company/create` (API route)
  - `CompanySetupWizard` component
- **Impact**: Inconsistent data, different validation, hard to debug
- **Solution**: Single source of truth for company creation

### 4. **No Regression Testing**

- **Issue**: Fixing one thing breaks another because no tests run
- **Impact**: Endless fix-break cycle
- **Solution**: Automated test suite for critical paths

### 5. **Architecture Not Documented**

- **Issue**: No clear documentation of data flow, dependencies, and relationships
- **Impact**: Changes made without understanding full impact
- **Solution**: Document architecture and relationships

---

## 🧪 Testing Strategy

### Phase 1: Critical Path Tests (Immediate)

Create tests for the most critical user journeys that MUST work:

```typescript
// tests/critical-paths.test.ts (expand existing)
```

**Critical Paths to Test:**

1. ✅ User signup → Company creation → Profile creation → Dashboard access
2. ✅ Existing user login → Dashboard loads → Can view sites
3. ✅ Company admin → Create site → Site appears in list
4. ✅ User → Complete task → Task marked complete
5. ✅ User → View assets → Assets load correctly
6. ✅ User → Create incident → Incident saved

### Phase 2: Integration Tests

Test complete flows end-to-end:

```typescript
// tests/integration/onboarding.test.ts
// tests/integration/rls-policies.test.ts
// tests/integration/data-consistency.test.ts
```

### Phase 3: Unit Tests for Critical Functions

Test individual functions that are frequently broken:

```typescript
// tests/unit/company-creation.test.ts
// tests/unit/profile-creation.test.ts
// tests/unit/rls-helpers.test.ts
```

### Running Tests

**Before ANY code change:**

```bash
npm run test
```

**After ANY code change:**

```bash
npm run test
```

**Before committing:**

```bash
npm run test && npm run build
```

---

## 🏗️ Architecture Documentation

### Data Model Relationships

```
User (auth.users)
  ↓
Profile (profiles)
  ├─→ company_id → Company (companies)
  └─→ site_id → Site (sites)
       └─→ company_id → Company (companies)
```

**Critical Rules:**

1. **Profile MUST have company_id** (after onboarding)
2. **Company can exist without profile** (temporarily during signup)
3. **Site MUST have company_id**
4. **All RLS policies check via profile.company_id**

### Onboarding Flow (Current - BROKEN)

```
1. User signs up → auth.users created
2. Company created via API → companies.created_by = user_id
3. Profile created → profiles.company_id = company.id
4. ❌ PROBLEM: Profile creation might fail if RLS blocks company access
```

### Onboarding Flow (Fixed - PROPOSED)

```
1. User signs up → auth.users created
2. Company created via Admin API (bypasses RLS) → companies.created_by = user_id, user_id = user_id
3. Profile created → profiles.company_id = company.id
4. ✅ RLS allows access because company.user_id = auth.uid()
```

### RLS Policy Hierarchy

**Principle**: All access flows through `profiles.company_id`

```
User → Profile → Company → Sites/Assets/Tasks/etc
```

**Exception**: During onboarding, allow access if:

- `company.user_id = auth.uid()` OR
- `company.created_by = auth.uid()`

---

## 🔧 Fix Process Workflow

### Step 1: Identify the Problem

- [ ] Reproduce the issue
- [ ] Document exact steps to reproduce
- [ ] Identify which component/API/database is involved

### Step 2: Write a Test (BEFORE Fixing)

- [ ] Write a test that FAILS for the current bug
- [ ] Run test to confirm it fails
- [ ] This test will prevent regression later

### Step 3: Understand the Impact

- [ ] Check architecture docs for dependencies
- [ ] Search codebase for similar patterns
- [ ] Identify what else might break

### Step 4: Make the Fix

- [ ] Make minimal change to fix the issue
- [ ] Don't refactor unrelated code
- [ ] Add comments explaining WHY the fix works

### Step 5: Verify the Fix

- [ ] Run the new test - should PASS
- [ ] Run ALL tests - should all PASS
- [ ] Test manually in browser
- [ ] Check for console errors

### Step 6: Document the Change

- [ ] Update architecture docs if needed
- [ ] Add comment in code explaining the fix
- [ ] Update this document if it's a new pattern

### Step 7: Commit

- [ ] Commit with clear message: `fix: description of what was broken`
- [ ] Include test in commit
- [ ] Don't mix multiple fixes in one commit

---

## 🎯 Critical Path Tests

### Test 1: Complete Onboarding Flow

```typescript
// tests/critical-paths/onboarding.test.ts
describe("Onboarding Flow", () => {
  test("New user can sign up and complete onboarding", async () => {
    // 1. Sign up
    // 2. Create company
    // 3. Create profile
    // 4. Access dashboard
    // 5. Verify all data is linked correctly
  });
});
```

### Test 2: RLS Policies Work Correctly

```typescript
// tests/critical-paths/rls-policies.test.ts
describe("RLS Policies", () => {
  test("User can access their own company", async () => {
    // Verify SELECT policy works
  });

  test("User cannot access other companies", async () => {
    // Verify security
  });

  test("User can create company during signup", async () => {
    // Verify INSERT policy works during onboarding
  });
});
```

### Test 3: Data Consistency

```typescript
// tests/critical-paths/data-consistency.test.ts
describe("Data Consistency", () => {
  test("Profile always has company_id after onboarding", async () => {
    // Verify no orphaned profiles
  });

  test("Sites always have company_id", async () => {
    // Verify no orphaned sites
  });
});
```

---

## 🔐 RLS Policy Consolidation

### Current State: CHAOS

- `supabase/sql/companies.sql` - Original policies
- `supabase/sql/fix_companies_rls.sql` - Attempted fix
- `supabase/sql/rls_fix.sql` - Another attempted fix
- `supabase/sql/rls_emergency_fix.sql` - Emergency fix
- `supabase/sql/security_enhancements.sql` - More policies

### Target State: ONE SOURCE OF TRUTH

**File**: `supabase/sql/rls_policies_authoritative.sql`

This file will contain ALL RLS policies in the correct order, with clear comments explaining each policy.

**Rules:**

1. **NEVER** create a new RLS fix file
2. **ALWAYS** update `rls_policies_authoritative.sql`
3. **ALWAYS** test policies after changes
4. **ALWAYS** document why each policy exists

### Policy Creation Order

1. Drop all existing policies (clean slate)
2. Create profiles policies (foundation)
3. Create companies policies (depends on profiles)
4. Create sites policies (depends on companies)
5. Create assets/tasks/etc policies (depends on companies)

---

## 🚀 Onboarding Flow Fix

### Problem

Multiple entry points, circular dependencies, RLS blocking access.

### Solution: Single Onboarding Service

Create a single service that handles the entire onboarding flow atomically:

```typescript
// src/lib/services/onboarding.ts
export async function completeOnboarding(data: OnboardingData) {
  // 1. Use admin client to bypass RLS
  // 2. Create company
  // 3. Create profile (linked to company)
  // 4. Create default site (optional)
  // 5. Return success
}
```

**Benefits:**

- Single source of truth
- Atomic operation (all or nothing)
- Easier to test
- Easier to debug

---

## 📊 Monitoring & Debugging Tools

### 1. Database State Checker

Create a script to verify database state is consistent:

```typescript
// scripts/check-database-state.ts
// Checks:
// - All profiles have company_id
// - All sites have company_id
// - No orphaned records
// - RLS policies are correct
```

### 2. RLS Policy Tester

Create a script to test RLS policies:

```typescript
// scripts/test-rls-policies.ts
// Tests:
// - User can access own data
// - User cannot access other data
// - Onboarding flow works
```

### 3. Onboarding Flow Tester

Create a script to test complete onboarding:

```typescript
// scripts/test-onboarding.ts
// Tests:
// - Signup → Company → Profile → Dashboard
// - Verifies all data is linked correctly
```

---

## ✅ Daily Checklist

Before starting work:

- [ ] Run all tests (`npm run test`)
- [ ] Check for any failing tests
- [ ] Review what you're about to change

Before making changes:

- [ ] Write a test for the bug (if it's a bug fix)
- [ ] Understand the architecture impact
- [ ] Check for similar code patterns

After making changes:

- [ ] Run all tests (`npm run test`)
- [ ] Test manually in browser
- [ ] Check console for errors
- [ ] Verify no regressions

Before committing:

- [ ] All tests pass
- [ ] Build succeeds (`npm run build`)
- [ ] Code is documented
- [ ] Commit message is clear

---

## 🚨 Emergency Fix Protocol

If something is broken in production:

1. **Don't panic** - Take a deep breath
2. **Reproduce locally** - Can you reproduce it?
3. **Check recent changes** - What changed recently?
4. **Check tests** - Do tests catch this?
5. **Make minimal fix** - Fix only what's broken
6. **Test thoroughly** - Run all tests
7. **Deploy** - Deploy fix
8. **Add test** - Add test to prevent regression
9. **Document** - Document what broke and why

---

## 📝 Next Steps (Priority Order)

### Week 1: Foundation

1. ✅ Create this debug strategy document
2. [ ] Consolidate RLS policies into one file
3. [ ] Create onboarding service (single source of truth)
4. [ ] Write critical path tests

### Week 2: Testing

5. [ ] Expand test suite with integration tests
6. [ ] Set up test database
7. [ ] Create database state checker script
8. [ ] Create RLS policy tester script

### Week 3: Documentation

9. [ ] Document complete architecture
10. [ ] Document all API endpoints
11. [ ] Document all database relationships
12. [ ] Create troubleshooting guide

### Week 4: Automation

13. [ ] Set up pre-commit hooks (run tests)
14. [ ] Set up CI/CD (run tests on PR)
15. [ ] Create monitoring dashboard
16. [ ] Set up error tracking

---

## 🎓 Learning Resources

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Database Design Patterns](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

## 💡 Key Principles

1. **Test First** - Write tests before fixing bugs
2. **One Source of Truth** - Don't duplicate logic
3. **Minimal Changes** - Fix only what's broken
4. **Document Everything** - Future you will thank you
5. **Automate Everything** - Don't rely on manual checks
6. **Fail Fast** - Catch errors early
7. **Isolate Changes** - One fix per commit

---

**Remember**: The goal is to stop the fix-break cycle. Every change should be:

- ✅ Tested
- ✅ Documented
- ✅ Isolated
- ✅ Verified
