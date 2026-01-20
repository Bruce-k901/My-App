# How to Apply the RLS Fix (Optional)

Since we've already fixed all the code to use API routes (which bypass RLS), this SQL fix is **optional**. However, if you want to apply it for extra safety:

## Option 1: Via Supabase Studio (Recommended)

1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to **SQL Editor**
3. Copy the contents of `supabase/sql/fix_companies_rls.sql`
4. Paste and click **Run**

## Option 2: Via psql (if table exists)

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/sql/fix_companies_rls.sql
```

## Option 3: Create as Migration

```bash
# Create a new migration
supabase migration new fix_companies_rls

# Copy the SQL content to the new migration file
# Then apply it
supabase db reset
```

## Note

**This fix is OPTIONAL** because:

- ✅ All client-side code now uses API routes
- ✅ API routes use admin client (bypasses RLS)
- ✅ No more direct queries = no more permission errors

The RLS fix is just an extra safety net in case any direct queries are added in the future.












