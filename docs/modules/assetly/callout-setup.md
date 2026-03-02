# Callout System Setup Instructions

## Database Migration Required

The CalloutModal component is ready to use, but you need to run the database migration to create the callouts table and RPC functions.

### Step 1: Run the Migration

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- supabase/migrations/20250123000001_create_callout_system.sql
```

Or run the migration file directly if you have Supabase CLI:

```bash
supabase db push
```

### Step 2: Verify Migration

After running the migration, verify that:

1. **Callouts table exists** with all required columns
2. **RLS policies are enabled** for security
3. **RPC functions are available**:
   - `create_callout()`
   - `close_callout()`
   - `reopen_callout()`
   - `get_asset_callouts()`

### Step 3: Test the System

1. **Open an asset card** in the assets page
2. **Click the wrench icon** to open the CalloutModal
3. **Create a new callout** using the "New Fault" tab
4. **Verify the callout appears** in the "Active Ticket" tab

## Fallback Behavior

The CalloutModal includes fallback logic that works even without the migration:

- **Direct queries** instead of RPC functions
- **Manual data transformation** for display
- **Basic CRUD operations** using standard Supabase queries

This ensures the modal works immediately, but for full functionality (including proper security and validation), run the migration.

## Features Available

### ✅ Working Now (with fallback):

- Create new callouts
- View callout history
- Basic form validation
- Mobile-responsive design

### ✅ Full Features (after migration):

- Proper RLS security
- Role-based permissions
- Timeline tracking
- Advanced validation
- Contractor notifications

## Troubleshooting

If you encounter errors:

1. **Check console logs** for specific error messages
2. **Verify database connection** in Supabase dashboard
3. **Ensure user has proper permissions** for the company
4. **Run the migration** if RPC functions are missing

The system is designed to be resilient and will work with basic functionality even without the full migration.
