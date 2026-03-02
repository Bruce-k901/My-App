# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright to verify refactoring steps and catch breaking changes quickly.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. **Create `.env.test` file**:
   ```bash
   cp .env.test.example .env.test
   # Then edit .env.test with your actual test credentials
   ```

3. **Configure test environment**:
   - Use a **staging/test database** (not production!)
   - Set `NEXT_PUBLIC_SUPABASE_URL` to your test Supabase project
   - Set `SUPABASE_SERVICE_ROLE_KEY` for test data seeding
   - Create a test user or use existing one
   - Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run with UI mode (recommended for debugging):
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Run foundation tests only:
```bash
npm run test:e2e:foundation
```

### Run specific test file:
```bash
npx playwright test tests/e2e/foundation/identity.spec.ts
```

### Debug a test:
```bash
npm run test:e2e:debug
```

### View test report:
```bash
npm run test:e2e:report
```

## Test Structure

```
tests/e2e/
├── setup/
│   ├── auth.setup.ts          # Authentication helper (runs before tests)
│   └── test-data.setup.ts     # Test data seeding (runs before tests)
├── foundation/
│   ├── identity.spec.ts       # Day 1: Identity standardization tests
│   ├── module-refs.spec.ts    # Day 2: Module references tests
│   └── attendance.spec.ts     # Day 3: Attendance architecture tests
├── ui/                        # UI-specific tests (Days 4-5)
└── workflows/                 # Cross-module workflow tests
```

## Test Categories

### Foundation Tests
Tests that verify database schema and architecture changes:
- **identity.spec.ts**: Verifies `profile_id` usage instead of `user_id`
- **module-refs.spec.ts**: Tests module reference system
- **attendance.spec.ts**: Tests attendance architecture changes

### Setup Files
These run automatically before tests:
- **auth.setup.ts**: Logs in and saves authentication state
- **test-data.setup.ts**: Seeds test data (company, site, user, etc.)

## Environment Variables

Required in `.env.test`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

TEST_COMPANY_ID=00000000-0000-0000-0000-000000000001
TEST_SITE_ID=00000000-0000-0000-0000-000000000002

PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Daily Workflow

### Day 1: Identity Standardization
```bash
npm run test:e2e:foundation -- identity.spec.ts
```

### Day 2: Module References
```bash
npm run test:e2e:foundation -- module-refs.spec.ts
```

### Day 3: Attendance
```bash
npm run test:e2e:foundation -- attendance.spec.ts
```

### Full Foundation Suite
```bash
npm run test:e2e:foundation
```

## Tips

1. **Run tests frequently**: After each refactoring step, run relevant tests
2. **Use UI mode for debugging**: `npm run test:e2e:ui` shows step-by-step execution
3. **Check test reports**: `npm run test:e2e:report` shows detailed results
4. **Screenshots on failure**: Automatically saved to `test-results/`
5. **Videos on retry**: Saved for failed tests that are retried

## Troubleshooting

### Tests fail with "not authenticated"
- Check that `auth.setup.ts` runs successfully
- Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are correct
- Check that test user exists in test database

### Tests fail with "table does not exist"
- Expected during refactoring - tests are written to handle this
- Tests will pass once tables/functions are created

### Tests timeout
- Increase timeout in `playwright.config.ts` if needed
- Check that dev server is running on `http://localhost:3000`
- Verify network connectivity to Supabase

### Authentication state not saved
- Check that `tests/e2e/.auth/user.json` is created
- Verify `.auth` directory is writable
- Run setup manually: `npx playwright test tests/e2e/setup/auth.setup.ts`

