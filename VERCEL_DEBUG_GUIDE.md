# Vercel Environment Variables Debug Guide

## 🔍 Debug Page Created

A debug page has been created at: `src/app/debug-env/page.tsx`

## 📋 How to Use

### Step 1: Deploy to Vercel

```bash
git add .
git commit -m "Add debug page for environment variables"
git push origin main
```

### Step 2: Access Debug Page

Once deployed:
1. Go to your Vercel site URL
2. Navigate to: `https://your-site.vercel.app/debug-env`
3. Click the "Check Environment Variables" button
4. Open browser console (F12) to see detailed output

### Step 3: Check Results

The page will show:
- ✅ If environment variables are loaded
- ✅ What values are present
- ✅ Which Supabase env keys exist
- ❌ If variables are missing or incorrect

---

## 🎯 What to Look For

### ✅ Correct Output (Working):
```
Environment: production
URL exists: Yes ✓
Key exists: Yes ✓
Key length: 129 characters
Key starts with: eyJhbGciOiJIUz...
Supabase Environment Keys Found: 
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### ❌ Incorrect Output (Not Working):
```
Environment: production
URL exists: No ✗
Key exists: No ✗
Supabase Environment Keys Found: None found
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Variables Not Set

**Symptoms**: All values show "No" or "None found"

**Fix**:
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add these variables:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase project URL
   - Environments: Check all (Production, Preview, Development)
   - Click Save
   
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon key
   - Environments: Check all
   - Click Save

4. **IMPORTANT**: Redeploy after adding variables
   - Go to Deployments tab
   - Click the three dots (⋮) on latest deployment
   - Click "Redeploy"

### Issue 2: Wrong Variable Names

**Symptoms**: URL/key exists but wrong values

**Fix**:
- Ensure exact spelling: `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
- Ensure exact spelling: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `ANON_KEY`)
- Case-sensitive!

### Issue 3: Wrong Environment Selected

**Symptoms**: Variables work locally but not on Vercel

**Fix**:
- When adding variables, check ALL environments:
  - ✅ Production
  - ✅ Preview
  - ✅ Development

### Issue 4: Didn't Redeploy

**Symptoms**: Added variables but still seeing old values

**Fix**:
- After adding/updating variables, you MUST redeploy
- Go to Deployments → Latest → Redeploy

---

## 📝 Debug Output Explained

The debug page shows:

| Field | What It Means |
|-------|---------------|
| **Environment** | Current environment (production, preview, development) |
| **URL exists** | Whether `NEXT_PUBLIC_SUPABASE_URL` is set |
| **Key exists** | Whether `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set |
| **Key length** | Should be ~129 characters for anon key |
| **Key starts with** | Should start with `eyJhbGciOiJIUz` (JWT token) |
| **Key ends with** | Last 10 characters of the key |
| **Supabase Keys Found** | List of all env keys containing "SUPABASE" |

---

## 🚨 Emergency Fixes

### If Environment Variables Are Missing:

1. **Check Vercel Dashboard**:
   - Settings → Environment Variables
   - Verify variables exist
   - Check spelling is correct

2. **Get Your Supabase Credentials**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy Project URL and anon key

3. **Add to Vercel**:
   - Use exact names as shown above
   - Check all environments
   - Save

4. **Redeploy**:
   - Deployments → Latest → Redeploy

5. **Test Again**:
   - Go to `/debug-env` page
   - Click the button
   - Check console output

---

## ✅ Success Criteria

You'll know it's working when:

1. Debug page shows:
   - ✅ URL exists: Yes
   - ✅ Key exists: Yes
   - ✅ Key length: ~129 characters
   - ✅ Starts with: `eyJhbGciOiJIUz`

2. Login page console shows:
   ```
   🔍 ENV CHECK: {
     url: "https://xxxxx.supabase.co",
     hasKey: true,
     keyType: "eyJhbGciOiJIUz...",
     env: "production"
   }
   ```

3. You can log in successfully

---

## 🗑️ After Debugging

**IMPORTANT**: Once you've fixed the issue, delete the debug page:

```bash
rm src/app/debug-env/page.tsx
git add .
git commit -m "Remove debug page"
git push origin main
```

This prevents exposing environment variable information to the public.

---

## 📞 Still Having Issues?

If the debug page shows variables exist but the app still doesn't work:

1. Check Supabase project is active
2. Verify RLS policies are not blocking requests
3. Check network tab for specific API errors
4. Verify the Supabase URL and key are correct (not expired)

---

## Summary

**Debug Page**: `/debug-env`
**Check**: Environment variables loading
**Expected**: Both URL and Key should show "Yes ✓"
**Action**: Add variables in Vercel dashboard if missing, then redeploy

