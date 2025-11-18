#!/bin/bash

# Cleanup Script: Remove Debug and Test Pages
# This script safely removes debug/test pages identified in the audit
# Run with: bash scripts/cleanup-debug-pages.sh

set -e  # Exit on error

echo "🧹 Starting cleanup of debug and test pages..."
echo ""

# Create a backup branch first
BACKUP_BRANCH="backup/before-cleanup-$(date +%Y%m%d)"
echo "📦 Creating backup branch: $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH" 2>/dev/null || echo "Branch already exists, continuing..."

# Debug pages to remove (from audit)
DEBUG_PAGES=(
  "src/app/dashboard/quick"
  "src/app/dashboard/simple"
  "src/app/dashboard/minimal"
  "src/app/test-session"
  "src/app/test-search"
  "src/app/test-asset-modal"
  "src/app/debug"
  "src/app/debug-env"
)

# Playground pages (consider removing)
PLAYGROUND_PAGES=(
  "src/app/dashboard/sops-playground"
  "src/app/button-playground"
  "src/app/card-playground"
  "src/app/header-playground"
  "src/app/design-system"
  "src/app/sop-playground"
)

echo "🗑️  Removing debug pages..."
for page in "${DEBUG_PAGES[@]}"; do
  if [ -d "$page" ] || [ -f "$page" ]; then
    echo "  Removing: $page"
    rm -rf "$page"
  else
    echo "  Skipping (not found): $page"
  fi
done

echo ""
echo "🎮 Removing playground pages..."
for page in "${PLAYGROUND_PAGES[@]}"; do
  if [ -d "$page" ] || [ -f "$page" ]; then
    echo "  Removing: $page"
    rm -rf "$page"
  else
    echo "  Skipping (not found): $page"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git status"
echo "  2. Test the app: npm run dev"
echo "  3. If everything works: git commit -m 'chore: remove debug and playground pages'"
echo "  4. If something breaks: git checkout main"

