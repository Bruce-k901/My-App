# 📧 Setup Email Confirmations - Quick Guide

## 🎯 Goal

Get the confirmation buttons and links working in all recruitment emails.

## 📝 3-Step Setup

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### **Step 2: Run First SQL Script**

Copy and paste the contents of `APPLY_CONFIRMATION_SYSTEM.sql` and click "Run"

**What this does:**
- Adds `confirmation_token` column to applications table
- Creates `application_confirmation_responses` table
- Sets up security policies
- Creates indexes

**Expected output:**
```
Success: No rows returned
```

### **Step 3: Run Second SQL Script**

Copy and paste the contents of `GENERATE_CONFIRMATION_TOKENS.sql` and click "Run"

**What this does:**
- Generates tokens for all existing applications
- Shows you a count of applications with tokens

**Expected output:**
```
total_applications | applications_with_tokens | applications_without_tokens
        5          |            5             |            0
```

## ✅ Verification

### **Test It:**

1. Go to your app
2. Navigate to a candidate profile
3. Click "Schedule Interview" or "Schedule Trial"
4. Fill in the details and send
5. Check the email

### **You Should See:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         🤝
    Interview Invitation
    We'd like to meet you
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Interview details in pink card]

┌──────────────────┐  ┌──────────────────┐
│  ✓ Confirm       │  │  🔄 Request      │
│    Attendance    │  │    Changes       │
└──────────────────┘  └──────────────────┘

Or copy this link: https://yourapp.com/confirm/abc123...
```

### **If You Still See:**

```
📧 Please Confirm Your Attendance 
Please reply to this email...
```

**Then:**
1. The SQL scripts weren't run yet
2. Run them now (steps above)
3. Send a new email
4. Buttons will appear!

## 🔍 Troubleshooting

### **"How do I know if it's set up?"**

Run this query in Supabase SQL Editor:

```sql
SELECT confirmation_token 
FROM public.applications 
LIMIT 1;
```

- **If you see a UUID** (like `a1b2c3d4-...`): ✅ Set up correctly
- **If you see `null`**: ❌ Run `GENERATE_CONFIRMATION_TOKENS.sql`
- **If you see "column doesn't exist"**: ❌ Run `APPLY_CONFIRMATION_SYSTEM.sql` first

### **"The link doesn't work"**

Make sure your `NEXT_PUBLIC_APP_URL` is set in your `.env.local`:

```
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

Or for local testing:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **"Buttons show but clicking does nothing"**

1. Check browser console for errors
2. Make sure the `/confirm/[token]` page exists at:
   `src/app/confirm/[token]/page.tsx`
3. Check if RLS policies are set up (they are in the SQL script)

## 📋 Summary

| Step | File | What It Does | Required |
|------|------|--------------|----------|
| 1 | `APPLY_CONFIRMATION_SYSTEM.sql` | Creates database structure | ✅ Yes |
| 2 | `GENERATE_CONFIRMATION_TOKENS.sql` | Adds tokens to existing apps | ✅ Yes |
| 3 | Test | Send a test email | ✅ Yes |

## 🎉 After Setup

✅ All interview emails have confirmation buttons  
✅ All trial shift emails have confirmation buttons  
✅ All offer emails have confirmation buttons  
✅ Each email has a visible link as backup  
✅ Candidates can confirm/decline/reschedule easily  
✅ Responses are tracked in the database  
✅ Managers can see responses in the dashboard  

## 💡 How It Works

1. **Application created** → Gets a unique token
2. **Email sent** → Includes token in the link
3. **Candidate clicks** → Opens `/confirm/[token]` page
4. **Candidate responds** → Saves to database
5. **Manager views** → Sees confirmation status on profile

## 🚀 You're Done!

Once you run the two SQL scripts, all emails will automatically show the confirmation buttons and links. No code changes needed!

---

**Questions?** Check `FIX_CONFIRMATION_LINKS.md` for more details.
