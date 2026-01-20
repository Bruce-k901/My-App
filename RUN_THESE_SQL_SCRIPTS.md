# 📝 Run These SQL Scripts - Simple Instructions

## ⚠️ You got an error because you ran them in the wrong order!

## ✅ Correct Order:

### **Step 1: Run `APPLY_CONFIRMATION_SYSTEM.sql`**

1. Open Supabase SQL Editor
2. Copy ALL the contents of `APPLY_CONFIRMATION_SYSTEM.sql`
3. Paste into SQL Editor
4. Click **RUN**
5. Should see: "Success: No rows returned"

### **Step 2: Run `GENERATE_CONFIRMATION_TOKENS.sql`**

1. Still in Supabase SQL Editor
2. Clear the editor
3. Copy ALL the contents of `GENERATE_CONFIRMATION_TOKENS.sql`
4. Paste into SQL Editor
5. Click **RUN**
6. Should see a table showing:
   ```
   total_applications | applications_with_tokens
   ```

## ✅ Done!

Now send a test email and you'll see the confirmation buttons!

## 🔴 If You See Errors:

- **"column confirmation_token does not exist"** 
  → You skipped Step 1! Run `APPLY_CONFIRMATION_SYSTEM.sql` first

- **"relation application_confirmation_responses already exists"**
  → You already ran Step 1! Just run Step 2 now

- **"duplicate key value violates unique constraint"**
  → You already ran Step 2! You're done, just test the emails

---

**Simple: Run Script 1, then Script 2** ✅
