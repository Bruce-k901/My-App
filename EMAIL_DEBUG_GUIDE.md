# Email Debugging Guide

## Issue

When creating/updating users, invitation emails are not being sent.

## Root Causes

### 1. **SMTP Not Configured (Most Common)**

- SMTP settings are commented out in `supabase/config.toml`
- Supabase needs SMTP configured to send emails in production
- For local dev, Inbucket (email testing server) should catch emails

### 2. **Email Rate Limit**

- Default rate limit: **2 emails per hour** (line 149 in `config.toml`)
- If you've sent 2 emails in the last hour, new emails will be blocked
- Check: `auth.rate_limit.email_sent = 2`

### 3. **User Already Exists in Auth**

- If user already exists, `inviteUserByEmail` fails
- Code now sends recovery email instead (password reset link)
- Check terminal logs for: `✅ [CREATE-USER] Recovery email sent`

## Debugging Steps

### Step 1: Check Terminal Logs

Look for these log messages:

**Success:**

```
✅ [CREATE-USER] Invitation email sent to lee@e-a-g.co
💡 [CREATE-USER] Check Inbucket at http://localhost:54324 for local dev emails
```

**Or for existing users:**

```
✅ [CREATE-USER] Recovery email sent to existing user lee@e-a-g.co
💡 [CREATE-USER] Check Inbucket at http://localhost:54324 for local dev emails
```

**Error - Rate Limit:**

```
❌ [CREATE-USER] inviteUserByEmail failed: rate limit exceeded
🚨 [CREATE-USER] Email configuration/rate limit issue detected
💡 Rate limit: Only 2 emails/hour allowed
```

**Error - SMTP Not Configured:**

```
❌ [CREATE-USER] inviteUserByEmail failed: SMTP not configured
🚨 [CREATE-USER] Email configuration issue detected
💡 Check Supabase Dashboard → Authentication → Email Templates → SMTP Settings
```

### Step 2: Check Inbucket (Local Dev)

1. Open http://localhost:54324
2. Look for emails sent to `lee@e-a-g.co`
3. If emails appear here, SMTP is working but not configured for production

### Step 3: Check Supabase Dashboard

1. Go to **Authentication → Email Templates**
2. Check **SMTP Settings** section
3. If SMTP is not configured, emails won't send in production

### Step 4: Check Rate Limits

1. Check `supabase/config.toml` line 149: `email_sent = 2`
2. If you've sent 2+ emails in the last hour, wait or increase limit
3. For testing, temporarily increase: `email_sent = 100`

## Fixes Applied

### 1. Recovery Email for Existing Users

- When updating an existing profile (like Shelly's), the code now:
  1. Tries to invite (fails if user exists)
  2. Finds existing auth user
  3. Sends recovery/password reset email instead
  4. Logs success/failure with helpful messages

### 2. Better Error Logging

- Added detailed error messages for:
  - SMTP configuration issues
  - Rate limit issues
  - Email sending failures
- Includes helpful links to check Inbucket and Supabase Dashboard

## Solutions

### For Local Development

1. **Check Inbucket**: http://localhost:54324
2. **Increase rate limit** in `config.toml`:
   ```toml
   [auth.rate_limit]
   email_sent = 100  # Increase from 2 to 100 for testing
   ```
3. **Restart Supabase**: `supabase stop && supabase start`

### For Production

1. **Configure SMTP** in Supabase Dashboard:
   - Go to **Authentication → Email Templates**
   - Click **SMTP Settings**
   - Add your SMTP credentials (SendGrid, AWS SES, etc.)
2. **Or use Supabase's built-in email** (limited)

## Testing

After fixes, when you create/update Shelly:

1. Check terminal for: `✅ Recovery email sent to existing user`
2. Check Inbucket: http://localhost:54324
3. Look for email to `lee@e-a-g.co`
4. Email should contain password reset link

## Next Steps

1. **Check terminal logs** when creating Shelly - look for email-related messages
2. **Check Inbucket** at http://localhost:54324
3. **Report what you see** - this will help identify the exact issue









