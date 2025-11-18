# Scripts Directory

Utility scripts for development and maintenance.

## Available Scripts

### `cleanup-debug-pages.sh`

Safely removes debug and test pages identified in the codebase audit.

**Usage:**

```bash
bash scripts/cleanup-debug-pages.sh
```

**What it does:**

- Creates a backup branch before cleanup
- Removes debug pages (`/dashboard/quick`, `/test-*`, `/debug*`, etc.)
- Removes playground pages (`*playground*`)
- Provides next steps for review and testing

**Safety:**

- Creates backup branch automatically
- Only removes files that exist
- Provides clear output of what was removed

## Adding New Scripts

When adding new scripts:

1. Make them executable: `chmod +x scripts/script-name.sh`
2. Add documentation here
3. Include safety checks (backups, confirmations, etc.)
4. Provide clear output
