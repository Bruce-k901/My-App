# 📧 Email Setup Guide for Recruitment System

## Overview

The recruitment system uses **Resend** to send offer letters via email. Without proper configuration, emails will be logged to console but **not actually sent**.

---

## Current Email Flow

1. **Manager sends offer** → Candidate profile page → "Send Offer" modal
2. **API creates offer letter** → Generates secure token + URL
3. **Email API called** → `/api/recruitment/send-offer-email`
4. **Resend integration** → `/api/send-email` (Resend API)
5. **Candidate receives email** → Beautiful HTML email with "Accept Offer" button

---

## ✅ Step-by-Step Setup

### 1. Sign Up for Resend (Free Tier Available)

1. Go to **https://resend.com**
2. Sign up for a free account
3. Verify your email address
4. You get **100 emails/day** on the free tier (enough for testing)

### 2. Get Your API Key

1. Log into Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Name it: `peopley-recruitment` or similar
5. Copy the API key (starts with `re_...`)

### 3. Set Up Sender Email

You have **two options**:

#### Option A: Use Your Domain (Production)
1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `peoplely.io`)
3. Add DNS records (Resend provides these)
4. Wait for verification (~10 minutes)
5. Use sender: `noreply@peoplely.io` or `jobs@peoplely.io`

#### Option B: Use Resend's Test Domain (Testing)
1. Resend provides `onboarding@resend.dev` for testing
2. **Note:** Emails from this domain may go to spam
3. Only use for development/testing
4. Use sender: `onboarding@resend.dev`

### 4. Update Environment Variables

Edit your `.env.local` file and add:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM=noreply@yourdomain.com
# OR for testing:
# RESEND_FROM=onboarding@resend.dev

# Make sure these are set too:
NEXT_PUBLIC_APP_URL=http://localhost:3000
# OR for production:
# NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

### 5. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## 🧪 Testing the Email System

### Test 1: Check Environment Variables

Run this in your terminal:

```powershell
cd c:\Users\bruce\my-app
node -e "require('dotenv').config({path:'.env.local'}); console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing'); console.log('RESEND_FROM:', process.env.RESEND_FROM || '✗ Missing');"
```

**Expected output:**
```
RESEND_API_KEY: ✓ Set
RESEND_FROM: noreply@yourdomain.com
```

### Test 2: Send a Test Offer

1. **Create a new job** in the recruitment page
2. **Apply to the job** using a REAL email you can access (e.g., your personal Gmail)
3. **Progress candidate to "Offer"** stage
4. **Fill out offer details** in the modal
5. **Click "Send Offer"**
6. **Check your email inbox** (and spam folder!)

### Test 3: Check Console Logs

If email setup is **correct**, you'll see:
```
Email sent successfully via Resend
```

If email setup is **missing**, you'll see:
```
📧 (email skipped) Missing RESEND_API_KEY or RESEND_FROM
```

---

## 🔍 Troubleshooting

### Problem: "Email skipped (logged)" message

**Cause:** Environment variables not set or not loaded

**Fix:**
1. Check `.env.local` file exists at `c:\Users\bruce\my-app\.env.local`
2. Verify `RESEND_API_KEY` and `RESEND_FROM` are set
3. Restart dev server: `npm run dev`
4. Hard refresh browser: `Ctrl + Shift + R`

### Problem: Email not received

**Possible causes:**

1. **Spam folder** - Check your junk/spam
2. **Wrong email address** - Verify candidate email is correct
3. **Resend domain not verified** - If using your domain, check DNS
4. **API key invalid** - Generate a new key in Resend dashboard
5. **Rate limit** - Free tier: 100 emails/day, 1 email/second

**Fix:**
- Use `onboarding@resend.dev` for testing (no domain verification needed)
- Check Resend dashboard → **Logs** to see delivery status
- Try sending to a different email provider (Gmail, Outlook, etc.)

### Problem: "Resend error 403" or "Forbidden"

**Cause:** Invalid API key or domain not verified

**Fix:**
1. Generate a new API key in Resend
2. If using custom domain, verify DNS records are correct
3. Switch to `onboarding@resend.dev` for testing

### Problem: Emails go to spam

**Cause:** Using test domain or no SPF/DKIM records

**Fix:**
1. Add your own domain in Resend
2. Set up DNS records (SPF, DKIM, DMARC)
3. For testing, check spam folder manually

---

## 📊 Verification Checklist

Before testing the recruitment flow, verify:

- [ ] `.env.local` file exists
- [ ] `RESEND_API_KEY` is set (starts with `re_`)
- [ ] `RESEND_FROM` is set (valid email address)
- [ ] `NEXT_PUBLIC_APP_URL` is set (for offer links)
- [ ] Dev server restarted after adding env vars
- [ ] Resend account is active and verified
- [ ] If using custom domain, DNS records are added

---

## 🎯 Production Deployment (Vercel/etc.)

When deploying to production:

1. Go to your hosting dashboard (Vercel, etc.)
2. Add environment variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
3. Redeploy the app
4. Test with a real candidate email

---

## 💡 Alternative Email Providers

If you don't want to use Resend, you can swap it out for:

- **SendGrid** (100 emails/day free)
- **Mailgun** (5,000 emails/month free for 3 months)
- **AWS SES** (62,000 emails/month on free tier)
- **Postmark** (100 emails/month free)

To swap providers, edit `/src/app/api/send-email/route.ts` and replace the Resend API call.

---

## 📧 Email Content

The offer email includes:

- ✅ Beautiful HTML design with gradient header
- ✅ Candidate name personalization
- ✅ Job title and company name
- ✅ Salary, start date, contract type, hours
- ✅ Secure "Accept Offer" button with unique token
- ✅ 7-day validity notice
- ✅ Mobile-responsive design

Preview the email by checking the HTML in:
`/src/app/api/recruitment/send-offer-email/route.ts` (lines 45-143)

---

## 🔐 Security Notes

- ✅ Offer tokens are cryptographically secure (32 bytes)
- ✅ Each offer has a unique URL (can't be guessed)
- ✅ API keys are never exposed to the client
- ✅ Service role key used for database operations
- ✅ Candidate data protected by RLS policies

---

## Need Help?

If you're still having issues:

1. Check the browser console for error messages
2. Check the terminal where `npm run dev` is running
3. Check Resend dashboard → **Logs** for delivery status
4. Verify environment variables are loaded: `console.log(process.env.RESEND_API_KEY)`

---

**Last Updated:** December 2025
**Status:** Ready for testing ✅
