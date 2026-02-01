# Invite Email Debugging Guide

## Issue

Invite emails have stopped working for new user invitations.

## Changes Made

### 1. Enhanced Error Logging

Added comprehensive logging to all invite-related endpoints:

- `/api/invite` - Main invite endpoint
- `/api/users/resend-invite` - Resend invite endpoint
- `/api/users/create` - User creation endpoint

**What's logged:**

- ✅ Successful invite attempts with user IDs
- ❌ Failed invite attempts with detailed error information
- 🚨 Email configuration errors (SMTP issues)
- 🔥 Unhandled exceptions with stack traces

### 2. Better Error Detection

The code now specifically detects email configuration errors and returns helpful error messages:

- Detects SMTP/email server configuration issues
- Returns `email_config_error` code for easier debugging
- Provides detailed error messages to help identify the root cause

### 3. Diagnostic Endpoint

Created `/api/invite/diagnose` endpoint to check:

- Environment variable configuration
- Supabase admin client initialization
- Auth connection status
- Provides recommendations for fixing issues

## How to Debug

### Step 1: Check Server Logs

When you try to invite a user, check your server logs (terminal/console where `npm run dev` is running). You should now see detailed logs like:

```
📧 [INVITE] Attempting to invite user: user@example.com
📧 [INVITE] Calling inviteUserByEmail for user@example.com with redirectTo: https://yourapp.com/setup-account
❌ [INVITE] inviteUserByEmail failed for user@example.com: { message: "...", status: ..., name: "..." }
```

### Step 2: Use Diagnostic Endpoint

Visit: `http://localhost:3000/api/invite/diagnose` (or your production URL)

This will show:

- Environment variable status
- Supabase connection status
- Recommendations for fixing issues

### Step 3: Check Supabase Dashboard

#### For Production (Supabase Cloud):

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Settings** → **Email**
4. Check:
   - ✅ **SMTP Settings** - Is SMTP configured? (Required for production)
   - ✅ **Email Templates** - Are invite templates configured?
   - ✅ **Rate Limits** - Are you hitting email rate limits?
   - ✅ **Email Provider** - Check if using Supabase's built-in email or custom SMTP

#### For Local Development:

1. Check `supabase/config.toml` - SMTP is commented out (lines 188-196)
2. For local dev, emails are captured by Inbucket (email testing server)
3. View emails at: http://localhost:54324 (Inbucket web interface)

### Step 4: Common Issues & Fixes

#### Issue: "Email service is not configured"

**Fix:** Configure SMTP in Supabase Dashboard:

1. Go to Authentication → Settings → Email
2. Enable SMTP
3. Configure your SMTP server (SendGrid, AWS SES, etc.)
   - Host: `smtp.sendgrid.net` (for SendGrid)
   - Port: `587`
   - User: `apikey`
   - Password: Your SendGrid API key

#### Issue: Rate Limits

**Fix:** Check Supabase Dashboard → Logs → Auth for rate limit errors

#### Issue: Email Templates Not Configured

**Fix:** Configure email templates in Supabase Dashboard → Authentication → Email Templates

#### Issue: Environment Variables Missing

**Fix:** Ensure these are set:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (for production redirects)

## Testing

### Test Invite Flow:

1. Try inviting a new user
2. Check server logs for detailed error messages
3. Check Supabase Dashboard → Logs → Auth for email sending attempts
4. If using local dev, check Inbucket at http://localhost:54324

### Test Diagnostic Endpoint:

```bash
curl http://localhost:3000/api/invite/diagnose
```

## Next Steps

1. **Check the logs** - Try inviting a user and check what errors appear
2. **Run diagnostic** - Visit `/api/invite/diagnose` to see configuration status
3. **Check Supabase Dashboard** - Verify SMTP/email configuration
4. **Review error messages** - The enhanced logging will show specific error details

## Files Modified

- `src/app/api/invite/route.ts` - Added comprehensive logging
- `src/app/api/users/resend-invite/route.ts` - Added comprehensive logging
- `src/app/api/users/create/route.ts` - Added comprehensive logging
- `src/app/api/invite/diagnose/route.ts` - New diagnostic endpoint
