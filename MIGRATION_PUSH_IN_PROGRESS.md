# Migration Push Status

## Progress
- ✅ Fixed duplicate migration timestamps (11 files renamed)
- ✅ Fixed migration `20250131000012_add_waste_tracking_rls.sql` (made idempotent)
- ✅ Fixed migration `20250212000001_identity_standardization.sql` (added column existence checks)
- ✅ Fixed migration `20250220000002_add_pinned_to_messaging_channels.sql` (handles both user_id/profile_id)
- ⚠️ Migration `20250220000027_create_staff_attendance.sql` needs more fixes

## Remaining Issue

The migration `20250220000027_create_staff_attendance.sql` has many references to `user_id` that need to be made conditional to handle tables that use `profile_id` instead.

### Quick Fix Option

Since the table might already exist with `profile_id`, you can:

1. **Skip this migration** if the table already exists and works:
   ```sql
   -- Mark as applied without running
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('20250220000027', 'create_staff_attendance')
   ON CONFLICT (version) DO NOTHING;
   ```

2. **Or continue fixing** all `user_id` references in the file to check for both `profile_id` and `user_id`.

## Next Steps

Run the remaining migrations after fixing or skipping `20250220000027`:

```bash
supabase db push --include-all
```
