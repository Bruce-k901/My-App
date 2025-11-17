# How to Test the Task Notification Cron Manually

## ⚠️ Important: Don't Run PowerShell Scripts in SQL Editor!

The error you saw (`syntax error at or near "#"`) means you tried to run a PowerShell script (`.ps1` file) in a SQL editor. PowerShell scripts must be run in **PowerShell**, not SQL!

## ✅ Correct Ways to Test the Cron

### Method 1: PowerShell Script (Recommended)

1. **Open PowerShell** (not SQL editor!)
2. Navigate to your project folder:
   ```powershell
   cd C:\Users\bruce\my-app
   ```
3. Run the script:
   ```powershell
   .\test-task-cron.ps1
   ```
4. Enter your service role key when prompted

### Method 2: Simple PowerShell Command

Copy and paste this into PowerShell (replace `YOUR_KEY` with your actual service role key):

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY_HERE"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications" -Method POST -Headers $headers
```

### Method 3: Using curl (if installed)

```bash
curl -X POST "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE" \
  -H "Content-Type: application/json"
```

### Method 4: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
2. Navigate to **Edge Functions** → **check-task-notifications**
3. Click **"Invoke"** button
4. Click **"Invoke Function"**

### Method 5: Supabase CLI (if installed)

```bash
supabase functions invoke check-task-notifications --no-verify-jwt
```

## 🔑 Getting Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key!)
4. Use it in the commands above

## ✅ Expected Response

If successful, you should see:

```json
{
  "success": true,
  "ready_notifications": 0,
  "late_notifications": 0,
  "total_notifications": 0,
  "tasks_checked": 0,
  "errors_count": 0,
  "warnings_count": 0,
  "execution_time_ms": 123,
  "message": "Processed 0 tasks. Created 0 notifications.",
  "metrics": { ... }
}
```

## 🐛 Troubleshooting

### Error: "syntax error at or near #"

- **Problem**: You're running a PowerShell script in SQL editor
- **Solution**: Run it in PowerShell instead!

### Error: "401 Unauthorized"

- **Problem**: Wrong or missing service role key
- **Solution**: Get the correct key from Supabase Dashboard → Settings → API

### Error: "404 Not Found"

- **Problem**: Function not deployed
- **Solution**: Deploy it first: `supabase functions deploy check-task-notifications`

### Error: "Connection refused"

- **Problem**: Network issue or wrong URL
- **Solution**: Check your internet connection and verify the URL

## 📝 Quick Test Command

Here's the simplest way to test (copy/paste into PowerShell):

```powershell
$key = "YOUR_SERVICE_ROLE_KEY_HERE"
Invoke-RestMethod -Uri "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications" -Method POST -Headers @{"Authorization"="Bearer $key"; "Content-Type"="application/json"}
```

Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key!
