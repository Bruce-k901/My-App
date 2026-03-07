# 📧 Email System Testing & Troubleshooting Guide

## 🔍 Current Issue

**Symptom:** Emails are not being received  
**Log shows:** `Some emails failed to send via Resend { sent: 0, failed: 1 }`  
**Root Cause:** Using `onboarding@resend.dev` (test address) which only delivers to verified emails

---

## 🧪 Quick Test Options

### Option A: Use the Test Page (Easiest)

1. Open your browser to: `http://localhost:3000/TEST_EMAIL.html`
2. Enter **your email address** (the one verified in Resend)
3. Click "Send Test Email"
4. Check your inbox!

### Option B: Use cURL

```powershell
curl -X POST http://localhost:3000/api/test-email `
  -H "Content-Type: application/json" `
  -d '{"to":"your.email@example.com"}'
```

### Option C: Check Console Logs

Watch your terminal for detailed error messages:

```
❌ Resend API error for candidate@email.com:
  status: 403
  response: {"message": "Email not verified"}
```

---

## ✅ Fix Options (Choose One)

### 🏃 Quick Fix (5 minutes)

**Verify your test emails in Resend:**

1. Go to: https://resend.com/emails
2. Log in with your Resend account
3. Go to **Settings** → **Domains** → click your domain
4. Add your test email to **"Verified Emails"**
5. Check your email for verification link
6. Click to verify
7. Test again - emails will now arrive! ✅

### 🏢 Production Fix (Recommended)

**Use your own domain:**

1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourcompany.com`)
4. Add the DNS records shown:
   - **MX** record
   - **TXT** record (SPF)
   - **DKIM** record
5. Wait for verification (DNS propagation: 5-30 minutes)
6. Update `.env.local`:
   ```env
   RESEND_FROM=noreply@yourcompany.com
   # or use a specific address:
   RESEND_FROM=recruitment@yourcompany.com
   RESEND_FROM=jobs@yourcompany.com
   ```
7. Restart dev server:
   ```powershell
   # Ctrl+C to stop, then:
   npm run dev
   ```

### 🧪 Development Mode (No Real Emails)

**Just test the workflow:**

1. Edit `.env.local`:
   ```env
   # Comment out the API key to disable actual sending:
   # RESEND_API_KEY=re_WJ7qExM5_EbMPVSbp8Tgw1tDprPtmdzM5
   RESEND_FROM=onboarding@resend.dev
   ```
2. Restart server
3. Emails will be logged to console instead:
   ```
   📧 (email skipped) Missing RESEND_API_KEY...
   Email would be: {
     to: ['candidate@example.com'],
     subject: 'Interview Invitation...',
     ...
   }
   ```

---

## 🔧 Detailed Error Logging

I've added enhanced logging to help debug. Check your terminal for:

### ✅ Success:

```
✅ Email sent successfully to candidate@email.com
POST /api/send-email 200 in 1434ms
{ success: true, message: 'Email sent', sent: 1, failed: 0 }
```

### ❌ Failure:

```
❌ Resend API error for candidate@email.com:
  status: 403
  response: {"message": "Email address not verified"}
  from: onboarding@resend.dev
  to: candidate@email.com
Some emails failed to send via Resend { sent: 0, failed: 1 }
```

---

## 📋 Checklist

- [ ] Email logs show failures in terminal
- [ ] Verified your test email in Resend (Quick Fix)
- [ ] OR Added your domain to Resend (Production Fix)
- [ ] Updated `RESEND_FROM` in `.env.local`
- [ ] Restarted dev server
- [ ] Tested with `TEST_EMAIL.html` page
- [ ] Received test email in inbox
- [ ] Tested recruitment flow (apply → schedule interview)
- [ ] Received recruitment emails

---

## 🎯 All Emails Being Sent

Your system automatically sends emails for:

1. **Application Submitted** → Confirmation to candidate
2. **Interview Scheduled** → Invitation with date/time/location
3. **Trial Shift Scheduled** → Invitation with details
4. **Application Rejected** → Professional rejection notice
5. **Offer Sent** → Offer letter with acceptance link

---

## 🆘 Still Not Working?

### Check These:

1. **API Key Valid?**
   - Log into https://resend.com/api-keys
   - Make sure key is not expired/deleted
   - Copy a fresh key if needed

2. **Email Format?**
   - Must be valid email format
   - No special characters in local part
   - Domain must exist

3. **Rate Limits?**
   - Resend free tier: 100 emails/day
   - Check: https://resend.com/overview

4. **Spam Folder?**
   - Check spam/junk folders
   - Add sender to contacts

5. **DNS Propagation?**
   - For custom domains, wait 5-30 minutes
   - Check: https://dnschecker.org

---

## 🚀 Recommended Setup

**For Development:**

```env
RESEND_API_KEY=re_YOUR_KEY_HERE
RESEND_FROM=onboarding@resend.dev
```

→ Verify test emails in Resend dashboard

**For Production:**

```env
RESEND_API_KEY=re_YOUR_KEY_HERE
RESEND_FROM=noreply@yourcompany.com
```

→ Add domain to Resend with proper DNS

---

Need more help? Check the Resend docs: https://resend.com/docs
