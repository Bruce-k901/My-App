# 🚨 EMAIL SETUP REQUIRED FOR RECRUITMENT

## Current Status

✅ **Email system is built and ready**  
❌ **Missing API credentials** - Emails will NOT be sent

---

## What's Missing

Your `.env.local` file needs these variables:

```bash
# ❌ MISSING - Required for email
RESEND_API_KEY=re_your_key_here

# ❌ MISSING - Required for correct links in emails
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ❌ MISSING - Required for authentication
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ✅ ALREADY SET (you have these)
NEXT_PUBLIC_SUPABASE_URL=https://xijoybubtrgbrhquqwrx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RESEND_FROM=onboarding@resend.dev
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Resend API Key

1. Go to **https://resend.com/signup**
2. Sign up (free - 100 emails/day)
3. Verify your email
4. Go to **API Keys** section
5. Click **Create API Key**
6. Copy the key (starts with `re_...`)

### Step 2: Get Supabase Anon Key

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project (xijoybubtrgbrhquqwrx)
3. Click **Settings** → **API**
4. Copy the **anon public** key (starts with `eyJhbGciOi...`)

### Step 3: Update .env.local

Open `c:\Users\bruce\my-app\.env.local` and add:

```bash
# Add these 3 lines:
RESEND_API_KEY=re_paste_your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
```

### Step 4: Restart Dev Server

```powershell
# Stop current server (Ctrl+C in terminal)
npm run dev
```

### Step 5: Verify Setup

```powershell
node scripts/verify-email-setup.js
```

You should see all ✅ green checkmarks!

---

## 🧪 Test the Flow

Once configured:

1. **Create a job** in Recruitment → Jobs → "Post New Job"
2. **Apply to the job** at `http://localhost:3000/jobs/[job-id]`
   - Use a **REAL email** you can check (Gmail, Outlook, etc.)
   - Upload a CV
   - Submit application
3. **Send an offer**:
   - Go to Recruitment → Candidates
   - Click on the candidate
   - Click "Send Offer"
   - Fill in offer details
   - Click "Send Offer"
4. **Check your email** (and spam folder!)
5. **Accept the offer** by clicking the button in the email
6. **Complete onboarding** at the link provided

---

## ❓ What Happens Without Setup?

Without `RESEND_API_KEY`:

- ✅ Application flow works
- ✅ Offers are created
- ✅ Candidate data is saved
- ❌ **No email is sent** (just logged to console)
- ❌ Candidate never receives the offer link

**Result:** Candidate can't accept offer because they don't receive the email!

---

## 🔐 Using Test Domain

You're currently set to use `onboarding@resend.dev` (Resend's test domain).

**Pros:**

- No domain setup required
- Works immediately
- Good for testing

**Cons:**

- Emails may go to spam
- Looks less professional

**For Production:**
Set up your own domain in Resend and update:

```bash
RESEND_FROM=noreply@peoplely.io
```

---

## 📋 Checklist

Before testing recruitment flow:

- [ ] Get Resend API key from https://resend.com
- [ ] Get Supabase anon key from dashboard
- [ ] Add `RESEND_API_KEY` to `.env.local`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Add `NEXT_PUBLIC_APP_URL` to `.env.local`
- [ ] Restart dev server (`npm run dev`)
- [ ] Run verification script (`node scripts/verify-email-setup.js`)
- [ ] See all ✅ checkmarks
- [ ] Test with real email address
- [ ] Check inbox (and spam folder)

---

## 🆘 Need Help?

Full documentation: **SETUP_EMAIL_CORRECTLY.md**

Common issues:

- **"Email skipped"** → Missing `RESEND_API_KEY`
- **"Email not received"** → Check spam folder, verify API key
- **"Invalid API key"** → Generate new key in Resend dashboard
- **Wrong links in email** → Set `NEXT_PUBLIC_APP_URL` correctly

---

**Ready to set up?** Follow Steps 1-5 above, then run the test flow! 🚀
