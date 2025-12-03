# Quick Start: Debug Strategy Implementation

This guide helps you implement the debug strategy **today** to stop the fix-break cycle.

## 🚀 Step 1: Apply Authoritative RLS Policies (5 minutes)

**Problem**: Multiple conflicting RLS policy files causing unpredictable behavior.

**Solution**: Use the single source of truth.

```bash
# Apply the authoritative RLS policies
psql -h your-db-host -U postgres -d your-db-name -f supabase/sql/rls_policies_authoritative.sql
```

Or if using Supabase CLI:

```bash
supabase db reset  # Only if you're okay resetting local DB
# Then apply the authoritative policies
```

**Verify it worked:**

```bash
# Check that policies are applied
npx tsx scripts/check-database-state.ts
```

---

## 🧪 Step 2: Run Existing Tests (2 minutes)

**Before making ANY changes**, run tests to establish baseline:

```bash
npm run test
```

**If tests fail**, fix them first. Don't add new features until tests pass.

---

## 🔧 Step 3: Use Onboarding Service (10 minutes)

**Problem**: Multiple entry points for company creation causing inconsistencies.

**Solution**: Use the new onboarding service.

### Update your signup flow to use the service:

```typescript
// In your signup page or API route
import { completeOnboarding } from "@/lib/services/onboarding";

// After user signs up:
const result = await completeOnboarding({
  userId: user.id,
  email: user.email,
  firstName: formData.firstName,
  lastName: formData.lastName,
  companyName: formData.companyName,
  industry: formData.industry,
  // ... other fields
});

if (!result.success) {
  // Handle error
  console.error("Onboarding failed:", result.error);
}
```

**Benefits:**

- Single source of truth
- Atomic operation
- Easier to test
- Easier to debug

---

## ✅ Step 4: Create Your First Test (5 minutes)

**Before fixing a bug**, write a test that fails:

```typescript
// tests/critical-paths/your-bug.test.ts
import { describe, test, expect } from "vitest";

describe("Your Bug Fix", () => {
  test("should do the correct thing", async () => {
    // Write test that currently FAILS
    // Then fix the bug
    // Then verify test PASSES
  });
});
```

**Run the test:**

```bash
npm run test tests/critical-paths/your-bug.test.ts
```

---

## 🔍 Step 5: Check Database State (2 minutes)

**Before and after** any database changes:

```bash
npx tsx scripts/check-database-state.ts
```

This catches:

- Orphaned records
- Missing foreign keys
- Inconsistent data

---

## 📋 Daily Workflow

### Morning (Before Starting Work)

1. ✅ Run tests: `npm run test`
2. ✅ Check database state: `npx tsx scripts/check-database-state.ts`
3. ✅ Review what you're about to change

### Before Making Changes

1. ✅ Write a test for the bug (if fixing a bug)
2. ✅ Understand the architecture impact
3. ✅ Check for similar code patterns

### After Making Changes

1. ✅ Run all tests: `npm run test`
2. ✅ Test manually in browser
3. ✅ Check console for errors
4. ✅ Run database state checker

### Before Committing

1. ✅ All tests pass
2. ✅ Build succeeds: `npm run build`
3. ✅ Code is documented
4. ✅ Commit message is clear

---

## 🚨 Emergency Fix Protocol

If something is broken **right now**:

1. **Don't panic** - Take a deep breath
2. **Reproduce locally** - Can you reproduce it?
3. **Check recent changes** - What changed recently? (`git log`)
4. **Check tests** - Do tests catch this? (If not, add one!)
5. **Make minimal fix** - Fix only what's broken
6. **Test thoroughly** - Run all tests
7. **Deploy** - Deploy fix
8. **Add test** - Add test to prevent regression
9. **Document** - Document what broke and why

---

## 🎯 Priority Actions (This Week)

### Day 1: Foundation

- [ ] Apply authoritative RLS policies
- [ ] Run database state checker
- [ ] Fix any issues found

### Day 2: Testing

- [ ] Run all existing tests
- [ ] Fix any failing tests
- [ ] Write test for current bug you're fixing

### Day 3: Onboarding

- [ ] Update signup flow to use onboarding service
- [ ] Test complete onboarding flow
- [ ] Verify RLS works after onboarding

### Day 4: Documentation

- [ ] Document any new patterns you discover
- [ ] Update DEBUG_STRATEGY.md with learnings
- [ ] Share with team (if applicable)

### Day 5: Automation

- [ ] Set up pre-commit hook to run tests
- [ ] Set up CI/CD to run tests on PR
- [ ] Celebrate! 🎉

---

## 💡 Key Principles

1. **Test First** - Write tests before fixing bugs
2. **One Source of Truth** - Don't duplicate logic
3. **Minimal Changes** - Fix only what's broken
4. **Document Everything** - Future you will thank you
5. **Automate Everything** - Don't rely on manual checks

---

## 📚 Files Created

1. **`DEBUG_STRATEGY.md`** - Complete strategy document
2. **`supabase/sql/rls_policies_authoritative.sql`** - Single source of truth for RLS
3. **`src/lib/services/onboarding.ts`** - Onboarding service
4. **`scripts/check-database-state.ts`** - Database state checker
5. **`tests/integration/onboarding.test.ts`** - Onboarding tests

---

## 🆘 Getting Help

If you're stuck:

1. Check `DEBUG_STRATEGY.md` for detailed explanations
2. Run `npx tsx scripts/check-database-state.ts` to find data issues
3. Check test files for examples
4. Review architecture docs in `DEBUG_STRATEGY.md`

---

## ✅ Success Criteria

You'll know the strategy is working when:

- ✅ Tests catch bugs before you commit
- ✅ Database state checker finds issues early
- ✅ Onboarding works consistently
- ✅ RLS policies don't conflict
- ✅ You're not breaking things when fixing other things

---

**Remember**: The goal is to stop the fix-break cycle. Every change should be:

- ✅ Tested
- ✅ Documented
- ✅ Isolated
- ✅ Verified

Good luck! 🚀
