#!/usr/bin/env node
/**
 * Theme Migration Script
 * Converts hard-coded Tailwind text/bg/border colors to theme utility classes.
 *
 * Usage: node theme-migrate.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SRC = path.join(__dirname, 'src');

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Adjacent pair replacements (simple string.replaceAll)
// Most specific first to avoid partial matches
// ═══════════════════════════════════════════════════════════════
const ADJACENT_PAIRS = [
  // ── Text: gray + dark → theme ──
  // Primary
  ['text-gray-900 dark:text-white', 'text-theme-primary'],
  ['text-gray-900 dark:text-zinc-100', 'text-theme-primary'],
  ['text-gray-900 dark:text-zinc-200', 'text-theme-primary'],
  ['text-gray-800 dark:text-white', 'text-theme-primary'],
  ['text-gray-800 dark:text-zinc-200', 'text-theme-primary'],
  // Secondary
  ['text-gray-700 dark:text-white/80', 'text-theme-secondary'],
  ['text-gray-700 dark:text-white/70', 'text-theme-secondary'],
  ['text-gray-700 dark:text-white', 'text-theme-secondary'],
  ['text-gray-700 dark:text-zinc-300', 'text-theme-secondary'],
  ['text-gray-700 dark:text-zinc-400', 'text-theme-secondary'],
  ['text-gray-700 dark:text-gray-300', 'text-theme-secondary'],
  ['text-gray-600 dark:text-white/80', 'text-theme-secondary'],
  ['text-gray-600 dark:text-white/70', 'text-theme-secondary'],
  ['text-gray-600 dark:text-white/60', 'text-theme-secondary'],
  ['text-gray-600 dark:text-white', 'text-theme-secondary'],
  ['text-gray-600 dark:text-zinc-400', 'text-theme-secondary'],
  ['text-gray-600 dark:text-zinc-300', 'text-theme-secondary'],
  ['text-gray-600 dark:text-gray-400', 'text-theme-secondary'],
  ['text-gray-600 dark:text-gray-300', 'text-theme-secondary'],
  // Tertiary
  ['text-gray-500 dark:text-white/60', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-white/50', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-white/40', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-white', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-zinc-400', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-zinc-500', 'text-theme-tertiary'],
  ['text-gray-500 dark:text-gray-400', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-white/60', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-white/50', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-white/40', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-white', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-zinc-400', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-zinc-500', 'text-theme-tertiary'],
  ['text-gray-400 dark:text-gray-500', 'text-theme-tertiary'],

  // ── Text: neutral + dark → theme ──
  ['text-neutral-900 dark:text-white', 'text-theme-primary'],
  ['text-neutral-900 dark:text-neutral-100', 'text-theme-primary'],
  ['text-neutral-800 dark:text-white', 'text-theme-primary'],
  ['text-neutral-800 dark:text-neutral-200', 'text-theme-primary'],
  ['text-neutral-700 dark:text-white/80', 'text-theme-secondary'],
  ['text-neutral-700 dark:text-white', 'text-theme-secondary'],
  ['text-neutral-700 dark:text-neutral-300', 'text-theme-secondary'],
  ['text-neutral-600 dark:text-white/70', 'text-theme-secondary'],
  ['text-neutral-600 dark:text-white', 'text-theme-secondary'],
  ['text-neutral-600 dark:text-neutral-400', 'text-theme-secondary'],
  ['text-neutral-500 dark:text-white/60', 'text-theme-tertiary'],
  ['text-neutral-500 dark:text-white', 'text-theme-tertiary'],
  ['text-neutral-500 dark:text-neutral-400', 'text-theme-tertiary'],
  ['text-neutral-400 dark:text-white/40', 'text-theme-tertiary'],
  ['text-neutral-400 dark:text-white', 'text-theme-tertiary'],
  ['text-neutral-400 dark:text-neutral-500', 'text-theme-tertiary'],

  // ── Text: slate + dark → theme ──
  ['text-slate-900 dark:text-white', 'text-theme-primary'],
  ['text-slate-800 dark:text-white', 'text-theme-primary'],
  ['text-slate-700 dark:text-white/80', 'text-theme-secondary'],
  ['text-slate-700 dark:text-white', 'text-theme-secondary'],
  ['text-slate-600 dark:text-white/70', 'text-theme-secondary'],
  ['text-slate-600 dark:text-white', 'text-theme-secondary'],
  ['text-slate-500 dark:text-white/60', 'text-theme-tertiary'],
  ['text-slate-500 dark:text-white', 'text-theme-tertiary'],
  ['text-slate-400 dark:text-white/40', 'text-theme-tertiary'],
  ['text-slate-400 dark:text-white', 'text-theme-tertiary'],

  // ── Text: zinc + dark → theme ──
  ['text-zinc-900 dark:text-white', 'text-theme-primary'],
  ['text-zinc-800 dark:text-white', 'text-theme-primary'],
  ['text-zinc-700 dark:text-white', 'text-theme-secondary'],
  ['text-zinc-600 dark:text-white', 'text-theme-secondary'],
  ['text-zinc-500 dark:text-white', 'text-theme-tertiary'],
  ['text-zinc-400 dark:text-white', 'text-theme-tertiary'],

  // ── Background pairs ──
  ['bg-white dark:bg-zinc-900', 'bg-theme-surface'],
  ['bg-white dark:bg-zinc-800', 'bg-theme-surface'],
  ['bg-white dark:bg-neutral-900', 'bg-theme-surface'],
  ['bg-white dark:bg-neutral-800', 'bg-theme-surface'],
  ['bg-white dark:bg-white/[0.03]', 'bg-theme-surface'],
  ['bg-white dark:bg-white/5', 'bg-theme-surface'],

  // Subtle backgrounds
  ['bg-gray-50 dark:bg-white/5', 'bg-theme-button'],
  ['bg-gray-50 dark:bg-white/[0.05]', 'bg-theme-button'],
  ['bg-gray-50 dark:bg-zinc-800/50', 'bg-theme-button'],
  ['bg-gray-50 dark:bg-zinc-800', 'bg-theme-button'],
  ['bg-gray-50 dark:bg-neutral-800', 'bg-theme-button'],
  ['bg-gray-50/50 dark:bg-zinc-900/50', 'bg-theme-surface'],

  // Muted backgrounds (table headers)
  ['bg-gray-100 dark:bg-white/10', 'bg-theme-muted'],
  ['bg-gray-100 dark:bg-white/[0.08]', 'bg-theme-muted'],
  ['bg-gray-100 dark:bg-white/[0.1]', 'bg-theme-muted'],
  ['bg-gray-100 dark:bg-zinc-800', 'bg-theme-muted'],
  ['bg-gray-100 dark:bg-zinc-800/50', 'bg-theme-muted'],
  ['bg-gray-100 dark:bg-neutral-800', 'bg-theme-muted'],

  // Stronger muted (table footers, emphasis)
  ['bg-gray-200 dark:bg-zinc-700', 'bg-theme-muted-strong'],
  ['bg-gray-200 dark:bg-white/12', 'bg-theme-muted-strong'],
  ['bg-gray-200 dark:bg-white/[0.12]', 'bg-theme-muted-strong'],
  ['bg-gray-200/70 dark:bg-zinc-700/50', 'bg-theme-muted'],
  ['bg-gray-300 dark:bg-zinc-600', 'bg-theme-muted-strong'],

  // ── Border pairs ──
  ['border-gray-200 dark:border-zinc-700', 'border-theme'],
  ['border-gray-200 dark:border-white/10', 'border-theme'],
  ['border-gray-200 dark:border-white/[0.06]', 'border-theme'],
  ['border-gray-200 dark:border-white/[0.1]', 'border-theme'],
  ['border-gray-200 dark:border-white/[0.08]', 'border-theme'],
  ['border-gray-200 dark:border-neutral-700', 'border-theme'],
  ['border-gray-300 dark:border-zinc-600', 'border-theme'],
  ['border-gray-300 dark:border-zinc-700', 'border-theme'],
  ['border-gray-300 dark:border-white/10', 'border-theme'],
  ['border-gray-300 dark:border-white/[0.1]', 'border-theme'],
  ['border-gray-100 dark:border-white/5', 'border-theme'],
  ['border-gray-100 dark:border-white/[0.05]', 'border-theme'],
  ['border-gray-100 dark:border-zinc-700', 'border-theme'],
  ['border-neutral-700', 'border-theme'],

  // ── Hover pairs ──
  ['hover:bg-gray-50 dark:hover:bg-white/5', 'hover:bg-theme-hover'],
  ['hover:bg-gray-50 dark:hover:bg-white/[0.05]', 'hover:bg-theme-hover'],
  ['hover:bg-gray-50 dark:hover:bg-zinc-800/50', 'hover:bg-theme-hover'],
  ['hover:bg-gray-50 dark:hover:bg-zinc-800', 'hover:bg-theme-hover'],
  ['hover:bg-gray-100 dark:hover:bg-white/10', 'hover:bg-theme-muted'],
  ['hover:bg-gray-100 dark:hover:bg-white/[0.1]', 'hover:bg-theme-muted'],
  ['hover:bg-gray-100 dark:hover:bg-zinc-800', 'hover:bg-theme-muted'],
  ['hover:bg-gray-100 dark:hover:bg-zinc-700', 'hover:bg-theme-muted'],

  // ── Existing hybrid patterns from previous refactoring (clean them up) ──
  ['bg-theme-surface dark:bg-white/[0.03]', 'bg-theme-surface'],
  ['bg-theme-button dark:bg-white/[0.05]', 'bg-theme-button'],
  ['bg-theme-button-hover dark:hover:bg-white/[0.08]', 'bg-theme-button-hover'],
  ['border-theme dark:border-white/[0.06]', 'border-theme'],
  ['hover:bg-theme-button-hover dark:hover:bg-white/[0.08]', 'hover:bg-theme-button-hover'],
];

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Non-adjacent pair detection (line-by-line)
// Finds light + dark classes on the same line, even when separated
// ═══════════════════════════════════════════════════════════════
const LINE_PAIR_RULES = [
  // [lightRegex, darkRegex, themeClass]
  [/\btext-gray-(?:900|800)\b/, /\bdark:text-(?:white|zinc-[12]00)\b/, 'text-theme-primary'],
  [/\btext-gray-(?:700|600)\b/, /\bdark:text-(?:white(?:\/[6-8]0)?|zinc-[34]00|gray-[34]00)\b/, 'text-theme-secondary'],
  [/\btext-gray-(?:500|400)\b/, /\bdark:text-(?:white(?:\/[4-6]0)?|zinc-[45]00|gray-[45]00)\b/, 'text-theme-tertiary'],
  [/\btext-neutral-(?:900|800)\b/, /\bdark:text-(?:white|neutral-[12]00)\b/, 'text-theme-primary'],
  [/\btext-neutral-(?:700|600)\b/, /\bdark:text-(?:white(?:\/[6-8]0)?|neutral-[34]00)\b/, 'text-theme-secondary'],
  [/\btext-neutral-(?:500|400)\b/, /\bdark:text-(?:white(?:\/[4-6]0)?|neutral-[45]00)\b/, 'text-theme-tertiary'],
  [/\btext-slate-(?:900|800)\b/, /\bdark:text-(?:white|slate-[12]00)\b/, 'text-theme-primary'],
  [/\btext-slate-(?:700|600)\b/, /\bdark:text-(?:white(?:\/[6-8]0)?|slate-[34]00)\b/, 'text-theme-secondary'],
  [/\btext-slate-(?:500|400)\b/, /\bdark:text-(?:white(?:\/[4-6]0)?|slate-[45]00)\b/, 'text-theme-tertiary'],
  // Background pairs
  [/\bbg-white\b(?!\/)/, /\bdark:bg-(?:zinc-[89]00|neutral-[89]00|white\/\[?0?\.?0[35]\]?|white\/5)\b/, 'bg-theme-surface'],
  [/\bbg-gray-50\b/, /\bdark:bg-(?:white\/5|white\/\[0\.05\]|zinc-800(?:\/50)?)\b/, 'bg-theme-button'],
  [/\bbg-gray-100\b/, /\bdark:bg-(?:white\/10|white\/\[0\.[01][08]\]|zinc-800)\b/, 'bg-theme-muted'],
  [/\bbg-gray-200\b/, /\bdark:bg-(?:zinc-700|white\/12|white\/\[0\.12\])\b/, 'bg-theme-muted-strong'],
  // Border pairs
  [/\bborder-gray-200\b/, /\bdark:border-(?:zinc-700|white\/10|white\/\[0\.0[6-9]\]|white\/\[0\.1\]|neutral-700)\b/, 'border-theme'],
  [/\bborder-gray-300\b/, /\bdark:border-(?:zinc-[67]00|white\/10|white\/\[0\.1\])\b/, 'border-theme'],
];

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Standalone color replacements (regex)
// ═══════════════════════════════════════════════════════════════
const STANDALONE_REGEX = [
  // Dark-only opacity text colors → theme
  [/\btext-white\/80\b/g, 'text-theme-secondary'],
  [/\btext-white\/70\b/g, 'text-theme-secondary'],
  [/\btext-white\/60\b/g, 'text-theme-tertiary'],
  [/\btext-white\/50\b/g, 'text-theme-tertiary'],
  [/\btext-white\/40\b/g, 'text-theme-tertiary'],
  [/\btext-white\/30\b/g, 'text-theme-disabled'],

  // Dark-only zinc/slate text → theme
  [/\btext-zinc-100\b/g, 'text-theme-primary'],
  [/\btext-zinc-200\b/g, 'text-theme-primary'],
  [/\btext-zinc-300\b/g, 'text-theme-secondary'],
  [/\btext-zinc-400\b/g, 'text-theme-tertiary'],
  [/\btext-zinc-500\b/g, 'text-theme-tertiary'],
  [/\btext-slate-200\b/g, 'text-theme-primary'],
  [/\btext-slate-300\b/g, 'text-theme-secondary'],
  [/\btext-slate-400\b/g, 'text-theme-tertiary'],

  // text-black → theme
  [/\btext-black\b/g, 'text-theme-primary'],
];

// ═══════════════════════════════════════════════════════════════
// PHASE 4: Context-aware standalone text-white replacement
// Only replaces text-white when NOT on a line with a colored bg
// ═══════════════════════════════════════════════════════════════
const COLORED_BG_PATTERNS = [
  /bg-module-fg/, /bg-red-[4-9]/, /bg-green-[4-9]/, /bg-blue-[4-9]/,
  /bg-amber-[4-9]/, /bg-orange-[4-9]/, /bg-purple-[4-9]/, /bg-indigo-[4-9]/,
  /bg-teal-[4-9]/, /bg-cyan-[4-9]/, /bg-pink-[4-9]/, /bg-yellow-[4-9]/,
  /bg-emerald-[4-9]/, /bg-violet-[4-9]/, /bg-rose-[4-9]/,
  /bg-\[#/, /bg-magenta/, /bg-brand/,
  /bg-checkly\b/, /bg-stockly\b/, /bg-teamly\b/, /bg-planly\b/, /bg-assetly\b/,
  /bg-gradient/, /bg-module-fg/,
];

function lineHasColoredBg(line) {
  return COLORED_BG_PATTERNS.some(p => p.test(line));
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Standalone gray text (no dark: pair remaining)
// These are light-mode-only or unthemed patterns
// ═══════════════════════════════════════════════════════════════
const STANDALONE_GRAY_RULES = [
  // [pattern, replacement] - applied only if no dark:text-* on same line
  [/\btext-gray-900\b/g, 'text-theme-primary'],
  [/\btext-gray-800\b/g, 'text-theme-primary'],
  [/\btext-gray-700\b/g, 'text-theme-secondary'],
  [/\btext-gray-600\b/g, 'text-theme-secondary'],
  [/\btext-gray-500\b/g, 'text-theme-tertiary'],
  [/\btext-gray-400\b/g, 'text-theme-tertiary'],
  [/\btext-gray-300\b/g, 'text-theme-tertiary'],
  [/\btext-neutral-900\b/g, 'text-theme-primary'],
  [/\btext-neutral-800\b/g, 'text-theme-primary'],
  [/\btext-neutral-700\b/g, 'text-theme-secondary'],
  [/\btext-neutral-600\b/g, 'text-theme-secondary'],
  [/\btext-neutral-500\b/g, 'text-theme-tertiary'],
  [/\btext-neutral-400\b/g, 'text-theme-tertiary'],
  [/\btext-neutral-300\b/g, 'text-theme-tertiary'],
  [/\btext-slate-900\b/g, 'text-theme-primary'],
  [/\btext-slate-800\b/g, 'text-theme-primary'],
  [/\btext-slate-700\b/g, 'text-theme-secondary'],
  [/\btext-slate-600\b/g, 'text-theme-secondary'],
  [/\btext-slate-500\b/g, 'text-theme-tertiary'],
];

// ═══════════════════════════════════════════════════════════════
// File discovery
// ═══════════════════════════════════════════════════════════════
const EXCLUDE_DIRS = new Set(['node_modules', '.next', 'dist', '.git']);
const EXCLUDE_PATHS = ['/lib/pdf/', '/lib/email/', 'packing-plan-print.css'];

function findFiles(dir) {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...findFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const rel = full.replace(/\\/g, '/');
      if (!EXCLUDE_PATHS.some(ex => rel.includes(ex))) {
        results.push(full);
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Processing
// ═══════════════════════════════════════════════════════════════
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  let totalChanges = 0;

  // PHASE 1: Adjacent pair replacements
  for (const [search, replace] of ADJACENT_PAIRS) {
    const count = content.split(search).length - 1;
    if (count > 0) {
      content = content.split(search).join(replace);
      totalChanges += count;
    }
  }

  // PHASE 2: Non-adjacent pair detection (line by line)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [lightRe, darkRe, themeClass] of LINE_PAIR_RULES) {
      const lightMatch = lightRe.exec(lines[i]);
      const darkMatch = darkRe.exec(lines[i]);
      if (lightMatch && darkMatch) {
        // Replace light class with theme class, remove dark class
        lines[i] = lines[i].replace(lightRe, themeClass);
        lines[i] = lines[i].replace(darkRe, '');
        // Clean up double/triple spaces
        lines[i] = lines[i].replace(/  +/g, ' ');
        // Clean up trailing space before quote/backtick
        lines[i] = lines[i].replace(/ (["`'])/g, '$1');
        // Clean up leading space after quote/backtick
        lines[i] = lines[i].replace(/(["`']) /g, '$1');
        totalChanges++;
        break; // one pair per line
      }
    }
  }
  content = lines.join('\n');

  // PHASE 3: Standalone regex replacements
  for (const [pattern, replacement] of STANDALONE_REGEX) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      totalChanges += matches.length;
    }
  }

  // PHASE 4: Standalone text-white (context-aware)
  // Replace text-white NOT preceded by dark: and NOT followed by /
  // Skip lines with colored backgrounds
  const lines2 = content.split('\n');
  for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i];
    if (lineHasColoredBg(line)) continue;
    // Match text-white that is NOT part of dark:text-white and NOT an opacity variant
    // Negative lookbehind for : (catches dark:, hover:, etc.)
    const re = /(?<![:\w-])text-white(?![\w/.-])/g;
    const matches = line.match(re);
    if (matches) {
      lines2[i] = line.replace(re, 'text-theme-primary');
      totalChanges += matches.length;
    }
  }
  content = lines2.join('\n');

  // PHASE 5: Standalone gray/neutral/slate text (no dark: pair on same line)
  const lines3 = content.split('\n');
  for (let i = 0; i < lines3.length; i++) {
    const line = lines3[i];
    // Skip if line already has dark:text- (means it's a pair we didn't catch)
    if (/dark:text-/.test(line)) continue;
    for (const [pattern, replacement] of STANDALONE_GRAY_RULES) {
      const matches = line.match(pattern);
      if (matches) {
        lines3[i] = lines3[i].replace(pattern, replacement);
        totalChanges += matches.length;
      }
    }
  }
  content = lines3.join('\n');

  // CLEANUP: Remove orphaned dark:text-white that's now redundant
  // (the light counterpart was already replaced with a theme class)
  const lines4 = content.split('\n');
  for (let i = 0; i < lines4.length; i++) {
    const line = lines4[i];
    // If line has a theme text class AND a dark:text-white, the dark variant is redundant
    if (/text-theme-(?:primary|secondary|tertiary)/.test(line) && /\bdark:text-white\b/.test(line)) {
      lines4[i] = line.replace(/\s*\bdark:text-white\b/g, '');
      lines4[i] = lines4[i].replace(/  +/g, ' ');
      totalChanges++;
    }
    // Same for dark:text-white/XX
    if (/text-theme-(?:primary|secondary|tertiary)/.test(lines4[i]) && /\bdark:text-white\/\d+\b/.test(lines4[i])) {
      lines4[i] = lines4[i].replace(/\s*\bdark:text-white\/\d+\b/g, '');
      lines4[i] = lines4[i].replace(/  +/g, ' ');
      totalChanges++;
    }
    // Same for dark:text-zinc-XXX
    if (/text-theme-(?:primary|secondary|tertiary)/.test(lines4[i]) && /\bdark:text-zinc-\d+\b/.test(lines4[i])) {
      lines4[i] = lines4[i].replace(/\s*\bdark:text-zinc-\d+\b/g, '');
      lines4[i] = lines4[i].replace(/  +/g, ' ');
      totalChanges++;
    }
  }
  content = lines4.join('\n');

  // CLEANUP: Remove redundant dark:bg-* when bg-theme-* is present
  const lines5 = content.split('\n');
  for (let i = 0; i < lines5.length; i++) {
    if (/bg-theme-(?:surface|button|muted|hover)/.test(lines5[i]) && /\bdark:bg-(?:white|zinc|neutral)/.test(lines5[i])) {
      lines5[i] = lines5[i].replace(/\s*\bdark:bg-(?:white|zinc|neutral)[^\s"'`]*/g, '');
      lines5[i] = lines5[i].replace(/  +/g, ' ');
      totalChanges++;
    }
    // Same for borders
    if (/border-theme\b/.test(lines5[i]) && /\bdark:border-(?:white|zinc|neutral)/.test(lines5[i])) {
      lines5[i] = lines5[i].replace(/\s*\bdark:border-(?:white|zinc|neutral)[^\s"'`]*/g, '');
      lines5[i] = lines5[i].replace(/  +/g, ' ');
      totalChanges++;
    }
    // Same for hover bg
    if (/hover:bg-theme-/.test(lines5[i]) && /\bdark:hover:bg-(?:white|zinc)/.test(lines5[i])) {
      lines5[i] = lines5[i].replace(/\s*\bdark:hover:bg-(?:white|zinc)[^\s"'`]*/g, '');
      lines5[i] = lines5[i].replace(/  +/g, ' ');
      totalChanges++;
    }
  }
  content = lines5.join('\n');

  // Write if changed
  if (content !== original) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return totalChanges;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
console.log(`\n🎨 Theme Migration Script ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log('─'.repeat(50));

const files = findFiles(SRC);
console.log(`Found ${files.length} source files to process\n`);

let totalFiles = 0;
let totalChanges = 0;
const changedFiles = [];

for (const file of files) {
  const changes = processFile(file);
  if (changes > 0) {
    totalFiles++;
    totalChanges += changes;
    const rel = path.relative(__dirname, file).replace(/\\/g, '/');
    changedFiles.push({ file: rel, changes });
  }
}

// Sort by changes descending
changedFiles.sort((a, b) => b.changes - a.changes);

console.log(`\n✅ Results:`);
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalChanges}`);

if (changedFiles.length > 0) {
  console.log(`\n📁 Top 30 modified files:`);
  changedFiles.slice(0, 30).forEach(({ file, changes }) => {
    console.log(`   ${changes.toString().padStart(4)} changes  ${file}`);
  });
  if (changedFiles.length > 30) {
    console.log(`   ... and ${changedFiles.length - 30} more files`);
  }
}

if (DRY_RUN) {
  console.log('\n⚠️  DRY RUN - no files were modified. Remove --dry-run to apply changes.');
}

console.log('');
