import fs from 'fs';

// Define all replacements per file
const fileReplacements = {
  // ==========================================
  // NewMainSidebar.tsx - sidebar bg + pink classes
  // ==========================================
  'src/components/layouts/NewMainSidebar.tsx': [
    // Warm backgrounds
    ['dark:bg-[#0B0D13]', 'dark:bg-[#110F0D]'],
    ['bg-[#0B0D13]', 'bg-[#110F0D]'],
    ['dark:bg-[#0f1119]', 'dark:bg-[#151210]'],
    ['dark:bg-[#1a1c24]', 'dark:bg-[#1e1a17]'],
    // Pink → brand
    ['text-pink-400', 'text-[#D37E91]'],
    ['text-pink-300', 'text-[#D37E91]'],
    ['bg-pink-500/20', 'bg-[#D37E91]/25'],
    ['bg-pink-500/10', 'bg-[#D37E91]/15'],
    ['border-pink-500/30', 'border-[#D37E91]/30'],
    ['border-pink-500/20', 'border-[#D37E91]/20'],
    ['border-l-pink-500', 'border-l-[#D37E91]'],
    ['border-l-pink-400', 'border-l-[#D37E91]'],
    ['border-t-pink-500', 'border-t-[#D37E91]'],
  ],

  // ==========================================
  // DashboardHeader.tsx - header bg + pink classes
  // ==========================================
  'src/components/layouts/DashboardHeader.tsx': [
    // Pink → brand
    ['text-pink-400', 'text-[#D37E91]'],
    ['text-pink-300', 'text-[#D37E91]'],
    ['bg-pink-500/20', 'bg-[#D37E91]/25'],
    ['bg-pink-500/10', 'bg-[#D37E91]/15'],
    ['bg-pink-600/20', 'bg-[#D37E91]/25'],
    ['bg-pink-500', 'bg-[#D37E91]'],
    ['border-pink-500/30', 'border-[#D37E91]/30'],
    ['border-pink-500/20', 'border-[#D37E91]/20'],
    ['border-t-pink-500', 'border-t-[#D37E91]'],
    ['hover:text-pink-400', 'hover:text-[#D37E91]'],
    ['hover:bg-pink-500/20', 'hover:bg-[#D37E91]/25'],
    ['from-pink-600/20', 'from-[#D37E91]/25'],
    ['to-blue-600/20', 'to-[#544349]/25'],
    ['hover:from-pink-600/30', 'hover:from-[#D37E91]/35'],
    ['hover:to-blue-600/30', 'hover:to-[#544349]/35'],
    // Warm incidents popup bg
    ['bg-[#0f1119]', 'bg-[#151210]'],
    ['rgba(15, 17, 25, 0.98)', 'rgba(21, 18, 16, 0.98)'],
  ],

  // ==========================================
  // Header.tsx - warm backgrounds
  // ==========================================
  'src/components/layout/Header.tsx': [
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:bg-[#1a1a1a]', 'dark:bg-[#1c1917]'],
    ['border-blue-200', 'border-[rgb(var(--border))]'],
  ],

  // ==========================================
  // ModuleBar.tsx - warm backgrounds
  // ==========================================
  'src/components/layout/ModuleBar.tsx': [
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:bg-[#1a1a1a]', 'dark:bg-[#1c1917]'],
  ],

  // ==========================================
  // DashboardSidebar.tsx - warm backgrounds
  // ==========================================
  'src/components/dashboard/DashboardSidebar.tsx': [
    ['dark:bg-[#171B2D]', 'dark:bg-[#1a1714]'],
    ['dark:bg-[#1E2337]', 'dark:bg-[#1e1a17]'],
    ['dark:bg-[#0f1220]', 'dark:bg-[#131110]'],
  ],

  // ==========================================
  // BurgerMenu.tsx - warm bg + pink badge
  // ==========================================
  'src/components/layout/BurgerMenu.tsx': [
    ['dark:bg-[#09090B]', 'dark:bg-[#0c0a09]'],
    ['bg-pink-500', 'bg-[#D37E91]'],
    // Fix old purple glow rgba references
    ['rgba(217,70,239,0.12)', 'rgba(211,126,145,0.12)'],
    ['rgba(217, 70, 239, 0.12)', 'rgba(211, 126, 145, 0.12)'],
  ],

  // ==========================================
  // SharedHeaderBase.tsx - warm public header
  // ==========================================
  'src/components/layouts/SharedHeaderBase.tsx': [
    ['bg-[#0b0e17]', 'bg-[#110f0d]'],
    ['border-slate-800', 'border-[#2a2520]'],
  ],

  // ==========================================
  // checkly/sidebar-nav.tsx - warm sidebar + boost opacity
  // ==========================================
  'src/components/checkly/sidebar-nav.tsx': [
    ['dark:bg-neutral-900', 'dark:bg-[#1c1917]'],
    ['dark:border-neutral-800', 'dark:border-[#2a2520]'],
    ['bg-gray-50', 'bg-[#FAF8F5]'],
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:hover:bg-neutral-800', 'dark:hover:bg-[#2a2520]'],
    ['dark:text-neutral-400', 'dark:text-white/60'],
    ['dark:text-neutral-500', 'dark:text-white/50'],
    // Boost active state opacity
    ['bg-checkly/20', 'bg-checkly/25'],
  ],

  // ==========================================
  // stockly/sidebar-nav.tsx
  // ==========================================
  'src/components/stockly/sidebar-nav.tsx': [
    ['dark:bg-neutral-900', 'dark:bg-[#1c1917]'],
    ['dark:border-neutral-800', 'dark:border-[#2a2520]'],
    ['bg-gray-50', 'bg-[#FAF8F5]'],
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:hover:bg-neutral-800', 'dark:hover:bg-[#2a2520]'],
    ['dark:text-neutral-400', 'dark:text-white/60'],
    ['dark:text-neutral-500', 'dark:text-white/50'],
    ['bg-stockly/20', 'bg-stockly/25'],
  ],

  // ==========================================
  // teamly/sidebar-nav.tsx
  // ==========================================
  'src/components/teamly/sidebar-nav.tsx': [
    ['dark:bg-neutral-900', 'dark:bg-[#1c1917]'],
    ['dark:border-neutral-800', 'dark:border-[#2a2520]'],
    ['bg-gray-50', 'bg-[#FAF8F5]'],
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:hover:bg-neutral-800', 'dark:hover:bg-[#2a2520]'],
    ['dark:text-neutral-400', 'dark:text-white/60'],
    ['dark:text-neutral-500', 'dark:text-white/50'],
    ['bg-teamly/20', 'bg-teamly/25'],
  ],

  // ==========================================
  // planly/sidebar-nav.tsx
  // ==========================================
  'src/components/planly/sidebar-nav.tsx': [
    ['dark:bg-neutral-900', 'dark:bg-[#1c1917]'],
    ['dark:border-neutral-800', 'dark:border-[#2a2520]'],
    ['bg-gray-50', 'bg-[#FAF8F5]'],
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:hover:bg-neutral-800', 'dark:hover:bg-[#2a2520]'],
    ['dark:text-neutral-400', 'dark:text-white/60'],
    ['dark:text-neutral-500', 'dark:text-white/50'],
    ['bg-planly/20', 'bg-planly/25'],
  ],

  // ==========================================
  // assetly/sidebar-nav.tsx
  // ==========================================
  'src/components/assetly/sidebar-nav.tsx': [
    ['dark:bg-neutral-900', 'dark:bg-[#1c1917]'],
    ['dark:border-neutral-800', 'dark:border-[#2a2520]'],
    ['bg-gray-50', 'bg-[#FAF8F5]'],
    ['bg-blue-50', 'bg-[#FAF8F5]'],
    ['dark:hover:bg-neutral-800', 'dark:hover:bg-[#2a2520]'],
    ['dark:text-neutral-400', 'dark:text-white/60'],
    ['dark:text-neutral-500', 'dark:text-white/50'],
    ['bg-assetly/20', 'bg-assetly/25'],
  ],

  // ==========================================
  // dashboard/layout.tsx - warm backgrounds
  // ==========================================
  'src/app/dashboard/layout.tsx': [
    ['bg-[#0a0a0a]', 'bg-[rgb(var(--background))]'],
  ],
};

const root = 'c:/Users/bruce/my-app/';
let totalFiles = 0;
let totalReplacements = 0;

for (const [relPath, replacements] of Object.entries(fileReplacements)) {
  const fullPath = root + relPath;

  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  let fileReplacementCount = 0;

  for (const [from, to] of replacements) {
    const count = content.split(from).length - 1;
    if (count > 0) {
      content = content.replaceAll(from, to);
      fileReplacementCount += count;
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalFiles++;
    totalReplacements += fileReplacementCount;
    console.log(`✓ ${relPath} (${fileReplacementCount} replacements)`);
  } else {
    console.log(`  ${relPath} (no changes needed)`);
  }
}

console.log(`\nDone: ${totalReplacements} replacements across ${totalFiles} files`);
