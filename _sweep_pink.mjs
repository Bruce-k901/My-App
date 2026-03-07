import fs from 'fs';
import path from 'path';

// All pink-* → brand colour replacements
// Order matters - more specific patterns first
const replacements = [
  // Gradients
  ['from-pink-600/20', 'from-[#D37E91]/25'],
  ['from-pink-500/20', 'from-[#D37E91]/25'],
  ['from-pink-600/30', 'from-[#D37E91]/35'],
  ['from-pink-500/30', 'from-[#D37E91]/35'],
  ['to-pink-600/20', 'to-[#D37E91]/25'],
  ['to-pink-500/20', 'to-[#D37E91]/25'],

  // Hover bg with opacity
  ['hover:bg-pink-600/30', 'hover:bg-[#D37E91]/35'],
  ['hover:bg-pink-600/20', 'hover:bg-[#D37E91]/25'],
  ['hover:bg-pink-500/30', 'hover:bg-[#D37E91]/35'],
  ['hover:bg-pink-500/25', 'hover:bg-[#D37E91]/30'],
  ['hover:bg-pink-500/20', 'hover:bg-[#D37E91]/25'],
  ['hover:bg-pink-500/15', 'hover:bg-[#D37E91]/20'],
  ['hover:bg-pink-500/10', 'hover:bg-[#D37E91]/15'],
  ['hover:bg-pink-400/20', 'hover:bg-[#D37E91]/25'],
  ['hover:bg-pink-400/10', 'hover:bg-[#D37E91]/15'],

  // Focus ring
  ['focus:ring-pink-500', 'focus:ring-[#D37E91]'],
  ['focus:ring-pink-400', 'focus:ring-[#D37E91]'],
  ['focus:border-pink-500', 'focus:border-[#D37E91]'],
  ['focus:border-pink-400', 'focus:border-[#D37E91]'],

  // Bg with specific opacity
  ['bg-pink-600/20', 'bg-[#D37E91]/25'],
  ['bg-pink-600/10', 'bg-[#D37E91]/15'],
  ['bg-pink-500/50', 'bg-[#D37E91]/50'],
  ['bg-pink-500/40', 'bg-[#D37E91]/40'],
  ['bg-pink-500/30', 'bg-[#D37E91]/35'],
  ['bg-pink-500/25', 'bg-[#D37E91]/30'],
  ['bg-pink-500/20', 'bg-[#D37E91]/25'],
  ['bg-pink-500/15', 'bg-[#D37E91]/20'],
  ['bg-pink-500/10', 'bg-[#D37E91]/15'],
  ['bg-pink-500/5', 'bg-[#D37E91]/10'],
  ['bg-pink-400/20', 'bg-[#D37E91]/25'],
  ['bg-pink-400/10', 'bg-[#D37E91]/15'],
  ['bg-pink-300/20', 'bg-[#D37E91]/25'],
  ['bg-pink-300/10', 'bg-[#D37E91]/15'],

  // Bg without opacity (solid)
  ['bg-pink-600', 'bg-[#D37E91]'],
  ['bg-pink-500', 'bg-[#D37E91]'],
  ['bg-pink-400', 'bg-[#D37E91]'],
  ['bg-pink-300', 'bg-[#D37E91]'],
  ['bg-pink-50', 'bg-[#D37E91]/10'],

  // Border with opacity
  ['border-pink-600/30', 'border-[#D37E91]/30'],
  ['border-pink-500/50', 'border-[#D37E91]/50'],
  ['border-pink-500/40', 'border-[#D37E91]/40'],
  ['border-pink-500/30', 'border-[#D37E91]/30'],
  ['border-pink-500/20', 'border-[#D37E91]/20'],
  ['border-pink-400/30', 'border-[#D37E91]/30'],
  ['border-pink-400/20', 'border-[#D37E91]/20'],
  ['border-pink-300/30', 'border-[#D37E91]/30'],

  // Border without opacity
  ['border-pink-600', 'border-[#D37E91]'],
  ['border-pink-500', 'border-[#D37E91]'],
  ['border-pink-400', 'border-[#D37E91]'],
  ['border-pink-300', 'border-[#D37E91]'],
  ['border-pink-200', 'border-[#D37E91]/30'],

  // Border directional
  ['border-t-pink-500', 'border-t-[#D37E91]'],
  ['border-t-pink-400', 'border-t-[#D37E91]'],
  ['border-l-pink-500', 'border-l-[#D37E91]'],
  ['border-l-pink-400', 'border-l-[#D37E91]'],
  ['border-b-pink-500', 'border-b-[#D37E91]'],
  ['border-b-pink-400', 'border-b-[#D37E91]'],
  ['border-r-pink-500', 'border-r-[#D37E91]'],

  // Hover border
  ['hover:border-pink-500', 'hover:border-[#D37E91]'],
  ['hover:border-pink-400', 'hover:border-[#D37E91]'],

  // Text
  ['text-pink-600', 'text-[#D37E91]'],
  ['text-pink-500', 'text-[#D37E91]'],
  ['text-pink-400', 'text-[#D37E91]'],
  ['text-pink-300', 'text-[#D37E91]'],
  ['text-pink-200', 'text-[#D37E91]/70'],

  // Hover text
  ['hover:text-pink-600', 'hover:text-[#D37E91]'],
  ['hover:text-pink-500', 'hover:text-[#D37E91]'],
  ['hover:text-pink-400', 'hover:text-[#D37E91]'],
  ['hover:text-pink-300', 'hover:text-[#D37E91]'],

  // Ring
  ['ring-pink-500', 'ring-[#D37E91]'],
  ['ring-pink-400', 'ring-[#D37E91]'],

  // Decoration / Accent
  ['decoration-pink-500', 'decoration-[#D37E91]'],
  ['accent-pink-500', 'accent-[#D37E91]'],
  ['accent-pink-400', 'accent-[#D37E91]'],

  // Placeholder
  ['placeholder-pink-300', 'placeholder-[#D37E91]'],
  ['placeholder:text-pink-300', 'placeholder:text-[#D37E91]'],
];

let totalCount = 0;
let totalFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      walk(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(full, 'utf8');
      // Quick check if file contains pink-
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
      }
    }
  }
}

walk('c:\\Users\\bruce\\my-app\\src');

console.log(`Replaced ${totalCount} pink-* occurrences across ${totalFiles} files`);
