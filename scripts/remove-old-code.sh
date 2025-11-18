#!/bin/bash

# Safe Removal Script for Old Code Generations
# This script removes old/duplicate code based on CONFIRMED_REMOVAL_LIST.md
# Run with: bash scripts/remove-old-code.sh

set -e  # Exit on error

echo "🧹 Starting removal of old code generations..."
echo ""

# Create a backup branch first
BACKUP_BRANCH="backup/before-code-cleanup-$(date +%Y%m%d)"
echo "📦 Creating backup branch: $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH" 2>/dev/null || echo "Branch already exists, continuing..."

echo ""
echo "🗑️  Removing playground pages..."
PLAYGROUND_PAGES=(
  "src/app/dashboard/sops-playground"
  "src/app/button-playground"
  "src/app/card-playground"
  "src/app/header-playground"
  "src/app/design-system"
  "src/app/sop-playground"
)

for page in "${PLAYGROUND_PAGES[@]}"; do
  if [ -d "$page" ] || [ -f "$page" ]; then
    echo "  Removing: $page"
    rm -rf "$page"
  else
    echo "  Skipping (not found): $page"
  fi
done

echo ""
echo "🗑️  Removing empty organization directories..."
EMPTY_DIRS=(
  "src/app/organization/business"
  "src/app/organization/business-details"
  "src/app/organization/sites"
  "src/app/organization/users"
  "src/app/organization/contractors"
  "src/app/organization/documents"
  "src/app/business-details"
  "src/app/dashboard/organization/sites"
)

for dir in "${EMPTY_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Removing: $dir"
    rm -rf "$dir"
  else
    echo "  Skipping (not found): $dir"
  fi
done

echo ""
echo "🗑️  Removing duplicate pages..."
DUPLICATE_PAGES=(
  "src/app/dashboard/organization/business-details"
  "src/app/dashboard/organization/contractors"
  "src/app/dashboard/organization/documents"
  "src/app/dashboard/organization/users"
)

for page in "${DUPLICATE_PAGES[@]}"; do
  if [ -d "$page" ] || [ -f "$page" ]; then
    echo "  Removing: $page"
    rm -rf "$page"
  else
    echo "  Skipping (not found): $page"
  fi
done

echo ""
echo "🗑️  Removing legacy sidebar components..."
LEGACY_SIDEBARS=(
  "src/components/layout/LeftSidebar.tsx"
  "src/components/layout/HeaderLayout.tsx"
  "src/components/layout/MainSidebar.tsx"
  "src/components/layout/ContextualSidebar.tsx"
)

for sidebar in "${LEGACY_SIDEBARS[@]}"; do
  if [ -f "$sidebar" ]; then
    echo "  Removing: $sidebar"
    rm -f "$sidebar"
  else
    echo "  Skipping (not found): $sidebar"
  fi
done

echo ""
echo "🔧 Fixing redirects..."
# Fix /sites redirect to point to /dashboard/sites
if [ -f "src/app/sites/page.tsx" ]; then
  echo "  Updating src/app/sites/page.tsx redirect..."
  cat > "src/app/sites/page.tsx" << 'EOF'
import { redirect } from "next/navigation";

export default function SitesRootRedirect() {
  redirect("/dashboard/sites");
}
EOF
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git status"
echo "  2. Test the app: npm run dev"
echo "  3. Check for broken imports: npm run lint"
echo "  4. If everything works: git add . && git commit -m 'chore: remove old code generations'"
echo "  5. If something breaks: git checkout main"

