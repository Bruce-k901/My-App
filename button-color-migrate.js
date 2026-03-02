/**
 * Button & Interactive Element Color Migration Script
 * Converts hard-coded button/icon colors to module-fg and theme utilities.
 *
 * Targets:
 *  1. Solid action buttons (bg-{color}-600 text-white) → bg-module-fg
 *  2. Outline buttons (border-{color}-* text-{color}-*) → border-module-fg text-module-fg
 *  3. Module accent icons (text-{color}-600 dark:text-{color}-400) → text-module-fg
 *  4. Inactive filter buttons (border-gray-* hover:bg-gray-*) → border-theme hover:bg-theme-hover
 *  5. Remaining bg-gray-* page/card backgrounds → theme utilities
 *  6. Colored hover shadows → hover:shadow-module-glow
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Accent colors that represent module branding (NOT status colors)
const ACCENT_COLORS = ['emerald', 'cyan', 'teal', 'indigo', 'violet'];
// Colors that could be module OR status — handle more carefully
const MIXED_COLORS = ['blue', 'green', 'purple'];
// Status colors — NEVER convert
const STATUS_COLORS = ['red', 'orange', 'yellow', 'amber', 'rose', 'pink'];

const ALL_ACCENT = [...ACCENT_COLORS, ...MIXED_COLORS];
const ACCENT_RE = ALL_ACCENT.join('|');

let totalFiles = 0;
let totalReplacements = 0;
const fileChanges = [];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'public'].includes(entry.name)) continue;
      files.push(...walkDir(fullPath));
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      // Skip UI primitives and PDF generation
      if (fullPath.includes('src\\lib\\pdf\\')) continue;
      if (fullPath.includes('src\\components\\ui\\Button.tsx')) continue;
      if (fullPath.includes('packing-plan-print.css')) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileReplacements = 0;
  const changes = [];

  function replace(pattern, replacement, description) {
    const newContent = content.replace(pattern, (...args) => {
      const result = typeof replacement === 'function' ? replacement(...args) : replacement;
      if (args[0] !== result) {
        fileReplacements++;
        if (VERBOSE) changes.push({ from: args[0].substring(0, 120), to: result.substring(0, 120), desc: description });
      }
      return result;
    });
    content = newContent;
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Solid action buttons — bg-{color}-{shade} with text-white nearby
  // ═══════════════════════════════════════════════════════════

  // Pattern: bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white
  for (const color of ALL_ACCENT) {
    // Full pattern with dark variants
    replace(
      new RegExp(`bg-${color}-\\d{3}\\s+hover:bg-${color}-\\d{3}\\s+dark:bg-${color}-\\d{3}\\s+dark:hover:bg-${color}-\\d{3}\\s+text-white`, 'g'),
      'bg-module-fg hover:bg-module-fg/90 text-white',
      `Solid button (full dark) ${color}`
    );

    // Pattern without dark variants: bg-emerald-600 hover:bg-emerald-700 text-white
    replace(
      new RegExp(`bg-${color}-\\d{3}\\s+hover:bg-${color}-\\d{3}\\s+text-white`, 'g'),
      'bg-module-fg hover:bg-module-fg/90 text-white',
      `Solid button ${color}`
    );

    // Reversed order: text-white bg-{color}-600 hover:bg-{color}-700
    replace(
      new RegExp(`text-white\\s+bg-${color}-\\d{3}\\s+hover:bg-${color}-\\d{3}`, 'g'),
      'text-white bg-module-fg hover:bg-module-fg/90',
      `Solid button reversed ${color}`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Outline / ghost buttons — border + text in accent color
  // ═══════════════════════════════════════════════════════════

  for (const color of ALL_ACCENT) {
    // bg-transparent border border-{color}-600 dark:border-{color}-500 text-{color}-600 dark:text-{color}-400
    replace(
      new RegExp(`bg-transparent\\s+border\\s+border-${color}-\\d{3}\\s+dark:border-${color}-\\d{3}\\s+text-${color}-\\d{3}\\s+dark:text-${color}-\\d{3}`, 'g'),
      'bg-transparent border border-module-fg text-module-fg',
      `Outline button (transparent bg) ${color}`
    );

    // border border-{color}-600 dark:border-{color}-500 text-{color}-600 dark:text-{color}-400
    replace(
      new RegExp(`border\\s+border-${color}-\\d{3}\\s+dark:border-${color}-\\d{3}\\s+text-${color}-\\d{3}\\s+dark:text-${color}-\\d{3}`, 'g'),
      'border border-module-fg text-module-fg',
      `Outline button ${color}`
    );

    // border-{color}-600 dark:border-${color}-400 text-${color}-600 dark:text-${color}-400
    replace(
      new RegExp(`border-${color}-(\\d{3})\\s+dark:border-${color}-\\d{3}\\s+text-${color}-\\d{3}\\s+dark:text-${color}-\\d{3}`, 'g'),
      'border-module-fg text-module-fg',
      `Border+text pair ${color}`
    );

    // Hover bg for colored buttons: hover:bg-{color}-50 dark:hover:bg-{color}-500/10
    replace(
      new RegExp(`hover:bg-${color}-50\\s+dark:hover:bg-${color}-\\d{3}\\/\\d+`, 'g'),
      'hover:bg-module-fg/10',
      `Hover bg ${color}`
    );

    // hover:bg-{color}-500/10
    replace(
      new RegExp(`hover:bg-${color}-\\d{3}\\/\\d+`, 'g'),
      'hover:bg-module-fg/10',
      `Hover bg opacity ${color}`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: Module accent icons — text-{color}-600 dark:text-{color}-400
  // ═══════════════════════════════════════════════════════════

  for (const color of ACCENT_COLORS) {
    // text-{color}-600 dark:text-{color}-400 (accent icon pattern - safe to convert)
    replace(
      new RegExp(`text-${color}-600\\s+dark:text-${color}-400`, 'g'),
      'text-module-fg',
      `Accent icon ${color}`
    );

    // text-{color}-500 dark:text-{color}-400
    replace(
      new RegExp(`text-${color}-500\\s+dark:text-${color}-400`, 'g'),
      'text-module-fg',
      `Accent icon 500 ${color}`
    );

    // text-{color}-400 (standalone in dark-theme-first files)
    // Only convert for clearly accent colors, not mixed
    replace(
      new RegExp(`text-${color}-300(?!\\s)`, 'g'),
      'text-module-fg',
      `Dark accent text 300 ${color}`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: Inactive/outline filter buttons with gray borders
  // ═══════════════════════════════════════════════════════════

  // border-gray-300 dark:border-gray-700
  replace(
    /border-gray-300\s+dark:border-gray-700/g,
    'border-theme',
    'Gray border pair'
  );

  // border-gray-200 dark:border-gray-700
  replace(
    /border-gray-200\s+dark:border-gray-700/g,
    'border-theme',
    'Gray border pair 200'
  );

  // hover:bg-gray-100 dark:hover:bg-gray-700
  replace(
    /hover:bg-gray-100\s+dark:hover:bg-gray-700/g,
    'hover:bg-theme-hover',
    'Gray hover pair'
  );

  // hover:bg-gray-50 dark:hover:bg-gray-800
  replace(
    /hover:bg-gray-50\s+dark:hover:bg-gray-800/g,
    'hover:bg-theme-hover',
    'Gray hover pair 50/800'
  );

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: Page/card backgrounds with gray
  // ═══════════════════════════════════════════════════════════

  // bg-gray-50 dark:bg-[rgb(var(--surface-elevated))]
  replace(
    /bg-gray-50\s+dark:bg-\[rgb\(var\(--surface-elevated\)\)\]/g,
    'bg-theme-surface-elevated',
    'Page bg gray-50 with surface'
  );

  // bg-gray-50 dark:bg-gray-900
  replace(
    /bg-gray-50\s+dark:bg-gray-900/g,
    'bg-theme-surface',
    'Page bg gray-50/900'
  );

  // bg-gray-100 dark:bg-gray-800
  replace(
    /bg-gray-100\s+dark:bg-gray-800/g,
    'bg-theme-muted',
    'Muted bg gray-100/800'
  );

  // bg-gray-50 dark:bg-gray-800
  replace(
    /bg-gray-50\s+dark:bg-gray-800/g,
    'bg-theme-surface',
    'Surface bg gray-50/800'
  );

  // bg-gray-200 dark:bg-gray-700
  replace(
    /bg-gray-200\s+dark:bg-gray-700/g,
    'bg-theme-muted-strong',
    'Muted strong bg'
  );

  // Standalone bg-gray-50 (common page background, when alone)
  // Only on lines that look like page wrappers (contain min-h-screen or similar)
  content = content.replace(/^(.*)(bg-gray-50)(.*)$/gm, (match, before, bg, after) => {
    // Only convert standalone bg-gray-50 if NOT followed by dark: (pair already handled above)
    if (after.includes('dark:bg-')) return match;
    // Only convert if it's in a className context
    if (!before.includes('className') && !before.includes("'") && !before.includes('"') && !before.includes('`')) return match;
    fileReplacements++;
    if (VERBOSE) changes.push({ from: bg, to: 'bg-theme-surface-elevated', desc: 'Standalone bg-gray-50' });
    return `${before}bg-theme-surface-elevated${after}`;
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: Colored hover shadows → module glow
  // ═══════════════════════════════════════════════════════════

  // hover:shadow-[0_0_12px_rgba(16,185,129,*)] (emerald shadows)
  replace(
    /hover:shadow-\[0_0_\d+px_rgba\(\d+,\d+,\d+,[\d.]+\)\]/g,
    'hover:shadow-module-glow',
    'Colored hover shadow'
  );

  // ═══════════════════════════════════════════════════════════
  // PHASE 7: Remaining standalone colored classes in accent colors
  // ═══════════════════════════════════════════════════════════

  for (const color of ACCENT_COLORS) {
    // bg-{color}-100 dark:bg-{color}-500/10 (light badge bg)
    replace(
      new RegExp(`bg-${color}-100\\s+dark:bg-${color}-\\d{3}\\/\\d+`, 'g'),
      'bg-module-fg/10',
      `Badge bg ${color}`
    );

    // bg-{color}-500/10 (standalone low-opacity bg)
    replace(
      new RegExp(`bg-${color}-500\\/10`, 'g'),
      'bg-module-fg/10',
      `Low opacity bg ${color}`
    );

    // bg-{color}-500/20 (badge bg)
    replace(
      new RegExp(`bg-${color}-500\\/20`, 'g'),
      'bg-module-fg/20',
      `Badge bg 20% ${color}`
    );

    // border-{color}-500/30 (badge border)
    replace(
      new RegExp(`border-${color}-500\\/\\d+`, 'g'),
      'border-module-fg/30',
      `Badge border ${color}`
    );

    // border-{color}-200 dark:border-{color}-500/30
    replace(
      new RegExp(`border-${color}-\\d{3}\\s+dark:border-${color}-\\d{3}\\/\\d+`, 'g'),
      'border-module-fg/30',
      `Border pair ${color}`
    );

    // text-{color}-700 dark:text-{color}-400
    replace(
      new RegExp(`text-${color}-700\\s+dark:text-${color}-400`, 'g'),
      'text-module-fg',
      `Text pair 700/400 ${color}`
    );

    // text-{color}-400 (standalone, in dark-first files)
    // Be more careful - only replace clearly accent ones
    replace(
      new RegExp(`text-${color}-400(?=["'\\s\\}\\)])`, 'g'),
      'text-module-fg',
      `Standalone text-400 ${color}`
    );

    // text-{color}-600 (standalone, in light-first files)
    replace(
      new RegExp(`text-${color}-600(?=["'\\s\\}\\)])`, 'g'),
      'text-module-fg',
      `Standalone text-600 ${color}`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 8: Standalone gray classes that slipped through
  // ═══════════════════════════════════════════════════════════

  // text-gray-400 dark:text-gray-600 (inverted pair, e.g., empty state icons)
  replace(
    /text-gray-400\s+dark:text-gray-600/g,
    'text-theme-disabled',
    'Gray inverted pair'
  );

  // text-gray-600 dark:text-gray-400
  replace(
    /text-gray-600\s+dark:text-gray-400/g,
    'text-theme-secondary',
    'Gray text pair'
  );

  // ═══════════════════════════════════════════════════════════
  // CLEANUP: Remove orphaned dark: classes when module-fg present
  // ═══════════════════════════════════════════════════════════

  // Remove dark:text-white when text-module-fg is on same line
  content = content.replace(/^(.*)$/gm, (line) => {
    if (line.includes('text-module-fg') && /dark:text-white/.test(line)) {
      const cleaned = line.replace(/\s*dark:text-white/g, '');
      if (cleaned !== line) { fileReplacements++; }
      return cleaned;
    }
    return line;
  });

  // Remove dark:hover:text-white
  replace(
    /\s*dark:hover:text-white/g,
    '',
    'Orphaned dark:hover:text-white'
  );

  if (content !== original) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    totalFiles++;
    totalReplacements += fileReplacements;
    const relPath = path.relative(process.cwd(), filePath);
    fileChanges.push({ path: relPath, count: fileReplacements });
    if (VERBOSE) {
      console.log(`  ${relPath} (${fileReplacements} changes)`);
      changes.forEach(c => console.log(`    ${c.desc}: "${c.from}" → "${c.to}"`));
    }
  }
}

// Run
console.log(`\n🎨 Button Color Migration ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

const srcDir = path.join(process.cwd(), 'src');
const files = walkDir(srcDir);
console.log(`Scanning ${files.length} files...\n`);

files.forEach(migrateFile);

// Summary
console.log(`\n${'═'.repeat(50)}`);
console.log(`${DRY_RUN ? '🔍 DRY RUN' : '✅ DONE'}: ${totalFiles} files, ${totalReplacements} replacements`);
console.log(`${'═'.repeat(50)}\n`);

if (fileChanges.length > 0) {
  console.log('Files changed:');
  fileChanges
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .forEach(f => console.log(`  ${f.count.toString().padStart(4)} │ ${f.path}`));
  if (fileChanges.length > 30) {
    console.log(`  ... and ${fileChanges.length - 30} more files`);
  }
}
