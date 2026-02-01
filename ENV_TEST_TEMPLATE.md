# Test Environment Configuration Template

Copy this content to create your `.env.test` file:

```bash
# Test Environment Variables
# IMPORTANT: Copy this to .env.test (which is gitignored)

# Test database (use staging or test database - NOT PRODUCTION!)
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Test user credentials (user must exist in test database)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Test company/site IDs (create these in staging or use existing ones)
TEST_COMPANY_ID=00000000-0000-0000-0000-000000000001
TEST_SITE_ID=00000000-0000-0000-0000-000000000002

# Base URL for Playwright tests
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Setup Instructions

1. **Create `.env.test` file** in the project root:
   ```bash
   # Copy the template above into .env.test
   ```

2. **Get your Supabase test credentials**:
   - Go to your Supabase Dashboard
   - Select your **test/staging project** (NOT production!)
   - Go to Settings → API
   - Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Create test user** (or use existing):
   - The `test-data.setup.ts` will create a test user automatically
   - Or create manually in Supabase Auth dashboard
   - Use the credentials in `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`

4. **Set test company/site IDs**:
   - These will be created automatically by `test-data.setup.ts`
   - Or use existing IDs from your test database

## Important Notes

- **NEVER** commit `.env.test` to git (it's already in `.gitignore`)
- **ALWAYS** use a **test/staging database**, never production
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep it secure
- Test user should have admin access for testing all features

