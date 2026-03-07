# Vercel Deployment Checklist

## Debug Code Added ✅

Added environment variable debugging to `src/app/login/page.tsx`:

```typescript
console.log("🔍 ENV CHECK:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  keyType: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 15),
  env: process.env.NODE_ENV,
});
```

---

## Step-by-Step Deployment Process

### 1. ✅ Commit Changes

```bash
git add .
git commit -m "Fix infinite loading loops and add debug logging"
git push origin main
```

### 2. Wait for Vercel Build

- Go to your Vercel dashboard
- Watch the build process
- Wait for deployment to complete

### 3. Check Environment Variables in Vercel

**Before testing, verify env vars are set:**

1. Go to Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Check these variables exist:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Verify they're checked for **all environments**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### 4. Test Debug Output

After deployment completes:

1. Open your Vercel site URL
2. Navigate to `/login` page
3. Open browser console (F12)
4. Look for the `🔍 ENV CHECK:` log

**Expected Output (Working)**:

```javascript
🔍 ENV CHECK: {
  url: "https://xxxxx.supabase.co",
  hasKey: true,
  keyType: "eyJhbGciOiJIUz...",
  env: "production"
}
```

**If Not Working**:

```javascript
🔍 ENV CHECK: {
  url: undefined,
  hasKey: false,
  keyType: "undefined...",
  env: "production"
}
```

### 5. If Environment Variables Are Missing

**Add them in Vercel:**

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Add **Variable**: `NEXT_PUBLIC_SUPABASE_URL`
4. Add **Value**: Your Supabase project URL (from Supabase dashboard)
5. Check all environments: Production, Preview, Development
6. Click **Save**

7. Repeat for second variable:
   - **Variable**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon key
   - Check all environments
   - Click **Save**

8. **IMPORTANT**: After adding variables, you MUST redeploy:
   - Go to **Deployments** tab
   - Find the latest deployment
   - Click the three dots (⋮)
   - Click **Redeploy**

### 6. Test Login Flow

After redeploying with environment variables:

1. Go to `/login` page
2. Check console for `🔍 ENV CHECK:` log
3. Verify environment variables are loading
4. Try logging in with valid credentials
5. Should redirect to `/dashboard`

---

## Common Issues & Solutions

### Issue: Environment Variables Not Loading

**Symptoms**: `hasKey: false` in console log

**Solutions**:

1. Check variable names are EXACT (case-sensitive)
2. Ensure all environments are checked
3. Redeploy after adding variables
4. Check for typos or extra spaces in values

### Issue: "Invalid API Key" Error

**Symptoms**: Login fails with API key error

**Solutions**:

1. Verify Supabase project URL is correct
2. Verify anon key is correct (not service role key)
3. Check Supabase dashboard for API restrictions
4. Ensure variables are added to Production environment

### Issue: Deployment Fails

**Symptoms**: Build fails on Vercel

**Solutions**:

1. Check build logs for specific errors
2. Verify `next.config.ts` is valid
3. Check for TypeScript errors
4. Ensure all dependencies are in `package.json`

---

## Local Testing

You can also test the debug output locally:

1. Make sure `.env.local` exists in project root
2. Run `npm run dev`
3. Navigate to `http://localhost:3001/login`
4. Open browser console
5. Check for `🔍 ENV CHECK:` log

**Local Output Should Show**:

```javascript
🔍 ENV CHECK: {
  url: "https://xxxxx.supabase.co",
  hasKey: true,
  keyType: "eyJhbGciOiJIUz...",
  env: "development"
}
```

---

## Next Steps After Deployment

Once environment variables are confirmed working:

1. ✅ Test login flow
2. ✅ Test SOP templates
3. ✅ Verify no infinite loading loops
4. ✅ Check all pages load correctly
5. ✅ Remove debug logging (optional)

---

## Summary

**Current Status**:

- ✅ Debug code added to login page
- ✅ Infinite loading loops fixed
- ✅ Ready for deployment

**Action Required**:

1. Commit and push changes
2. Check Vercel build completes
3. Verify environment variables in Vercel dashboard
4. Test debug output in browser console
5. If variables missing, add them and redeploy

**Files Modified**:

- `src/app/login/page.tsx` - Added debug logging
- `src/app/dashboard/sops/food-template/page.tsx` - Fixed loading loop
- `src/app/dashboard/sops/drinks-template/page.tsx` - Fixed loading loop
- `src/app/dashboard/sops/cleaning-template/page.tsx` - Fixed loading loop
