# Update Supabase CLI - Correct Method

## ❌ The Problem

npm global install is **NOT supported** anymore. The error message says:

```
Installing Supabase CLI as a global module is not supported.
Please use one of the supported package managers
```

## ✅ Solution: Use Scoop (Recommended for Windows)

### Step 1: Check if Scoop is Installed

```powershell
scoop --version
```

### Step 2: If Scoop is NOT Installed, Install It

```powershell
# Install Scoop
iwr -useb get.scoop.sh | iex

# Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
```

### Step 3: Install/Update Supabase CLI

```powershell
# If not installed via Scoop, install it:
scoop install supabase

# If already installed via Scoop, update it:
scoop update supabase
```

### Step 4: Verify Update

```powershell
supabase --version
# Should show v2.65.5 or higher
```

## Alternative: Manual Download

If Scoop doesn't work, download manually:

1. Go to: https://github.com/supabase/cli/releases
2. Download the latest Windows release:
   - Look for `supabase_X.X.X_windows_amd64.zip`
3. Extract the `supabase.exe` file
4. Replace your existing `supabase.exe` (usually in `C:\Users\bruce\AppData\Local\Microsoft\WindowsApps` or similar)
5. Or add the extracted folder to your PATH

## Alternative: Use npx (Project-Level)

You can also use Supabase CLI via npx without global install:

```powershell
# Run commands with npx prefix
npx supabase --version
npx supabase db push --include-all
```

But you'll need to install it in your project:

```powershell
npm install supabase --save-dev
```

## Quick Fix: Try Scoop Update

Run this:

```powershell
# Check if Scoop is available
scoop --version

# If Scoop works, update Supabase
scoop update supabase

# If Scoop is not installed, install it first:
iwr -useb get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## After Updating

Once updated, continue with migrations:

```powershell
# Set database password
$env:SUPABASE_DB_PASSWORD = "your-password"

# Run migrations
supabase db push --include-all
```
