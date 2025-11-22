# Vercel Environment Variable Troubleshooting

## Issue: Environment Variable Not Available in Preview/Production

### Symptoms

- Variable shows in Vercel dashboard
- Diagnostic endpoint shows `HasKey=false`
- API routes fail with "environment variable not found"

### Common Causes

1. **Variable Added After Deployment**
   - Environment variables are baked into the build at deployment time
   - If you add a variable after deployment, existing deployments won't have it
   - **Solution**: Redeploy after adding environment variables

2. **Wrong Environment Selected**
   - Variable might only be set for Production, but you're testing on Preview
   - **Solution**: Check all three environments (Production, Preview, Development) in Vercel

3. **Variable Name Typo**
   - Case-sensitive: `SUPABASE_SERVICE_ROLE_KEY` ≠ `supabase_service_role_key`
   - Extra spaces or characters
   - **Solution**: Copy-paste the exact variable name

4. **Value Issues**
   - Extra quotes around the value
   - Leading/trailing spaces
   - Truncated value (didn't copy the full key)
   - **Solution**: Copy the entire key, no quotes, no spaces

### Verification Steps

1. **Check Variable in Vercel Dashboard**
   - Settings → Environment Variables
   - Verify name is exactly `SUPABASE_SERVICE_ROLE_KEY`
   - Verify value starts with `eyJ...` (not `sb_publishable_...`)
   - Verify all three environments are checked

2. **Use Diagnostic Endpoint**
   - Visit: `https://your-app.vercel.app/api/debug/env-check`
   - Check the output:
     - `hasServiceKey1`: Should be `true`
     - `serviceKey1Type`: Should be `JWT (CORRECT)`
     - `environment`: Shows which environment is running

3. **Redeploy After Changes**
   - Always redeploy after adding/modifying environment variables
   - Or push a new commit to trigger automatic deployment

### Quick Fix Checklist

- [ ] Variable name is exactly `SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)
- [ ] Value is the full service role key (starts with `eyJ...`)
- [ ] All three environments are checked (Production, Preview, Development)
- [ ] Redeployed after adding/modifying the variable
- [ ] Diagnostic endpoint shows `hasServiceKey1: true`
- [ ] Diagnostic endpoint shows `serviceKey1Type: JWT (CORRECT)`

### Testing

After fixing, test by:

1. Visit `/api/debug/env-check` - should show key exists
2. Try completing a task - should work without service role key error
