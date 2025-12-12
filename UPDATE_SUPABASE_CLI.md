# How to Update Supabase CLI

## Current Status

- **Installed**: v2.62.5
- **Available**: v2.65.5

## Update Methods (Windows)

### Method 1: If Installed via npm (Most Common)

```powershell
# Update to latest version
npm install -g supabase@latest

# Verify update
supabase --version
```

### Method 2: If Installed via Scoop

```powershell
# Update Scoop first
scoop update

# Update Supabase CLI
scoop update supabase

# Verify update
supabase --version
```

### Method 3: If Installed via Chocolatey

```powershell
# Update Supabase CLI
choco upgrade supabase

# Verify update
supabase --version
```

### Method 4: Manual Download (If installed directly)

1. Go to: https://github.com/supabase/cli/releases
2. Download the latest Windows release (`.exe` file)
3. Replace the existing `supabase.exe` in your PATH
4. Or download and place in a folder, then add to PATH

### Method 5: Using Supabase's Update Command (If Available)

Some versions have a self-update command:

```powershell
supabase update
```

## Quick Check: Which Method to Use

Run this to check how it was installed:

```powershell
# Check if npm
npm list -g supabase

# Check if scoop
scoop list supabase

# Check if chocolatey
choco list supabase
```

## Recommended: npm Update

If you're not sure, try npm first (most common):

```powershell
npm install -g supabase@latest
```

Then verify:

```powershell
supabase --version
# Should show v2.65.5 or higher
```

## After Updating

Once updated, you can continue with migrations:

```powershell
# Set password (if not already set)
$env:SUPABASE_DB_PASSWORD = "your-password"

# Run migrations
supabase db push --include-all
```
