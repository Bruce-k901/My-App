# Admin Icon Setup Instructions

## Current Status

The admin icon setup scripts are ready, but we're only detecting `send_icon.png` in `public/logo/`.

## To Use Your 3 Inverted Icon Files

### Step 1: Verify Files Are in Place

Make sure your 3 inverted icon files are in the `public/logo/` folder. They can have any names, for example:

- `inverted-icon-1.png`
- `inverted-icon-2.png`
- `inverted-icon-3.png`
- Or: `icon-small.png`, `icon-medium.png`, `icon-large.png`
- Or any other names you prefer

**Important:** Files with "send" in the name will be excluded automatically.

### Step 2: Run the Setup Script

Once your files are in `public/logo/`, run:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/setup-admin-icons-from-logo.ps1"
```

This script will:

- Find all image files in `public/logo/` (excluding send_icon.png)
- Use the 3 most recent files (or reuse if fewer than 3)
- Create the admin icon files in `public/`:
  - `admin-icon-192x192.png`
  - `admin-icon-512x512.png`
  - `admin-apple-touch-icon.png`

### Step 3: Verify Setup

Check that the files were created:

```powershell
Get-ChildItem -Path "public" -Filter "admin-*" | Select-Object Name
```

## Quick Check Script

To see what files are currently in the logo folder:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/find-admin-icons.ps1"
```

## File Requirements

- **Format:** PNG, ICO, SVG, JPG, or JPEG
- **Location:** `public/logo/` folder
- **Naming:** Any name is fine (files with "send" will be excluded)
- **Quantity:** 1-3 files (script will use what's available)

## What Happens Next

Once the script runs successfully:

1. ✅ Admin icon files will be created in `public/`
2. ✅ The admin PWA will use these icons
3. ✅ Icons will appear in the browser tab and when installing the PWA

## Troubleshooting

**If files aren't detected:**

1. Make sure files are saved in `public/logo/` (not a subfolder)
2. Check file extensions are `.png`, `.ico`, `.svg`, `.jpg`, or `.jpeg`
3. Try refreshing the folder or restarting your editor
4. Run `scripts/find-admin-icons.ps1` to see what's detected

**If you want to manually specify files:**
You can copy your files directly to `public/` with these exact names:

- `admin-icon-192x192.png`
- `admin-icon-512x512.png`
- `admin-apple-touch-icon.png`
