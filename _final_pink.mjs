import fs from 'fs';

// All remaining pink-* patterns across the codebase
const replacements = [
  // Gradient combos
  ['from-pink-600/70 to-blue-600/70', 'from-[#D37E91]/70 to-[#544349]/70'],
  ['from-pink-500/90 to-blue-500/90', 'from-[#D37E91]/90 to-[#544349]/90'],
  ['hover:from-pink-500 hover:to-blue-500', 'hover:from-[#D37E91] hover:to-[#544349]'],
  ['from-pink-400 to-pink-600', 'from-[#D37E91] to-[#D37E91]/80'],
  ['from-pink-400/80 to-blue-400/80', 'from-[#D37E91]/80 to-[#544349]/80'],
  ['from-pink-400 to-blue-400', 'from-[#D37E91] to-[#544349]'],
  ['to-pink-600', 'to-[#D37E91]/80'],
  ['to-pink-500', 'to-[#D37E91]'],
  ['from-pink-500/10', 'from-[#D37E91]/15'],
  ['from-pink-500/5', 'from-[#D37E91]/5'],
  ['dark:from-pink-500/40', 'dark:from-[#D37E91]/40'],
  ['dark:to-pink-600/30', 'dark:to-[#D37E91]/30'],
  ['dark:from-pink-500/10', 'dark:from-[#D37E91]/10'],
  ['to-pink-500/10', 'to-[#D37E91]/10'],
  ['to-pink-500/5', 'to-[#D37E91]/5'],
  ['from-pink-50', 'from-[#D37E91]/10'],
  // Shadows
  ['shadow-pink-600/50', 'shadow-[#D37E91]/50'],
  ['shadow-pink-500/30', 'shadow-[#D37E91]/30'],
  ['shadow-pink-500/20', 'shadow-[#D37E91]/20'],
  ['shadow-pink-500/40', 'shadow-[#D37E91]/40'],
  // Light mode bg
  ['bg-pink-100', 'bg-[#D37E91]/10'],
  ['bg-pink-200', 'bg-[#D37E91]/20'],
  ['hover:bg-pink-200', 'hover:bg-[#D37E91]/20'],
  ['hover:file:bg-pink-200', 'hover:file:bg-[#D37E91]/20'],
  ['file:bg-pink-100', 'file:bg-[#D37E91]/10'],
  // Text
  ['text-pink-700', 'text-[#D37E91]'],
  ['text-pink-600', 'text-[#D37E91]'],
  ['text-pink-500', 'text-[#D37E91]'],
  ['text-pink-400', 'text-[#D37E91]'],
  ['text-pink-300', 'text-[#D37E91]'],
  // Rose → brand (used as pink substitute)
  ['from-rose-500 to-pink-600', 'from-[#D37E91] to-[#D37E91]/80'],
];

let totalCount = 0;
let totalFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = dir + '/' + entry.name;
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      walk(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(full, 'utf8');
      if (!content.includes('pink-')) continue;

      const original = content;
      let fileCount = 0;

      for (const [from, to] of replacements) {
        const count = content.split(from).length - 1;
        if (count > 0) {
          content = content.replaceAll(from, to);
          fileCount += count;
        }
      }

      if (content !== original) {
        fs.writeFileSync(full, content, 'utf8');
        totalCount += fileCount;
        totalFiles++;
        console.log(`  ${full} (${fileCount} replacements)`);
      }
    }
  }
}

walk('c:/Users/bruce/my-app/src');

console.log(`\nReplaced ${totalCount} pink-* occurrences across ${totalFiles} files`);
