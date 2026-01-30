# ⚠️ Confirmation Links Not Showing - QUICK FIX

## Problem

Your emails show this fallback text instead of buttons:

```
📧 Please Confirm Your Attendance 
Please reply to this email to confirm your attendance...
```

## Root Cause

The `confirmation_token` column hasn't been added to your database yet.

## ⚡ Quick Fix (2 minutes)

### **Open Supabase SQL Editor and run these 2 scripts IN ORDER:**

#### **🔴 STEP 1 - Run This First:**
File: **`APPLY_CONFIRMATION_SYSTEM.sql`**
- Creates confirmation_token column
- Creates responses table
- Sets up security policies
- **YOU MUST RUN THIS FIRST!**

#### **🔵 STEP 2 - Run This Second:**
File: **`GENERATE_CONFIRMATION_TOKENS.sql`**
- Adds tokens to existing applications
- Verifies everything worked
- **Run AFTER step 1!**

### **That's it!**

Now when you send an interview/trial/offer email, you'll see:

```
┌──────────────────┐  ┌──────────────────┐
│  ✓ Confirm       │  │  🔄 Request      │
│    Attendance    │  │    Changes       │
└──────────────────┘  └──────────────────┘

Or copy this link: https://yourapp.com/confirm/abc123...
```

## Files You Need

Both files are already in your project root:
- ✅ `APPLY_CONFIRMATION_SYSTEM.sql`
- ✅ `GENERATE_CONFIRMATION_TOKENS.sql`

## Detailed Instructions

See: `SETUP_EMAIL_CONFIRMATIONS.md`

---

**Run the 2 SQL scripts → Buttons appear!** ✅
