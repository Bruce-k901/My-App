#!/usr/bin/env npx ts-node
/**
 * AI Knowledge Sync Script
 *
 * Scans the codebase for @ai-knowledge JSDoc blocks and syncs them
 * to the knowledge_base table in Supabase.
 *
 * Usage:
 *   npm run sync:ai-knowledge
 *   npx ts-node scripts/sync-ai-knowledge.ts
 *
 * Comment Format:
 * ```
 * /**
 *  * @ai-knowledge
 *  * @title Feature Name
 *  * @category Category (e.g., Features, API, Components)
 *  * @subcategory Optional Subcategory
 *  * @tags tag1, tag2, tag3
 *  *
 *  * Description of the feature goes here.
 *  * Can span multiple lines.
 *  * /
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Directories to scan (relative to project root)
const SCAN_DIRS = [
  'src/app',
  'src/components',
  'src/hooks',
  'src/lib',
  'src/context',
  'src/types',
];

// File extensions to scan
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.next', 'dist', '.git'];

interface KnowledgeEntry {
  title: string;
  content: string;
  summary?: string;
  category: string;
  subcategory?: string;
  tags: string[];
  source: string;
  source_file: string;
}

interface ParsedBlock {
  title: string;
  category: string;
  subcategory?: string;
  tags: string[];
  content: string;
  filePath: string;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(file))) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Parse @ai-knowledge blocks from file content
 */
function parseAiKnowledgeBlocks(content: string, filePath: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Match JSDoc-style comments containing @ai-knowledge
  const commentRegex = /\/\*\*[\s\S]*?@ai-knowledge[\s\S]*?\*\//g;
  const matches = content.match(commentRegex);

  if (!matches) return blocks;

  for (const match of matches) {
    const block = parseBlock(match, filePath);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * Parse a single @ai-knowledge block
 */
function parseBlock(comment: string, filePath: string): ParsedBlock | null {
  // Remove comment syntax
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim())
    .filter(line => line.length > 0);

  let title = '';
  let category = '';
  let subcategory: string | undefined;
  let tags: string[] = [];
  const contentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@ai-knowledge')) {
      continue; // Skip the marker itself
    } else if (line.startsWith('@title')) {
      title = line.replace('@title', '').trim();
    } else if (line.startsWith('@category')) {
      category = line.replace('@category', '').trim();
    } else if (line.startsWith('@subcategory')) {
      subcategory = line.replace('@subcategory', '').trim();
    } else if (line.startsWith('@tags')) {
      const tagString = line.replace('@tags', '').trim();
      tags = tagString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else if (!line.startsWith('@')) {
      // Content line (not a tag)
      contentLines.push(line);
    }
  }

  // Validate required fields
  if (!title || !category) {
    console.warn(`Skipping block in ${filePath}: missing title or category`);
    return null;
  }

  return {
    title,
    category,
    subcategory,
    tags,
    content: contentLines.join('\n').trim(),
    filePath,
  };
}

/**
 * Generate a unique identifier for a knowledge entry
 * Used to detect changes and avoid duplicates
 */
function generateSourceId(block: ParsedBlock): string {
  // Use relative path + title as unique identifier
  const relativePath = path.relative(process.cwd(), block.filePath);
  return `${relativePath}::${block.title}`;
}

/**
 * Sync knowledge entries to the database
 */
async function syncToDatabase(blocks: ParsedBlock[]): Promise<void> {
  console.log(`\nSyncing ${blocks.length} knowledge entries to database...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const block of blocks) {
    const sourceId = generateSourceId(block);
    const relativePath = path.relative(process.cwd(), block.filePath);

    try {
      // Check if entry already exists (by source file and title)
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id, source, content')
        .eq('source', `code-sync:${sourceId}`)
        .maybeSingle();

      const entry: KnowledgeEntry = {
        title: block.title,
        content: block.content,
        category: block.category,
        subcategory: block.subcategory,
        tags: block.tags,
        source: `code-sync:${sourceId}`,
        source_file: relativePath,
      };

      if (existing) {
        // Check if content changed
        if (existing.content === block.content) {
          skipped++;
          continue;
        }

        // Update existing entry
        const { error } = await supabase
          .from('knowledge_base')
          .update({
            ...entry,
            is_active: true,
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating "${block.title}":`, error.message);
          errors++;
        } else {
          console.log(`  Updated: ${block.title}`);
          updated++;
        }
      } else {
        // Create new entry
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            ...entry,
            is_active: true,
          });

        if (error) {
          console.error(`Error creating "${block.title}":`, error.message);
          errors++;
        } else {
          console.log(`  Created: ${block.title}`);
          created++;
        }
      }
    } catch (err: any) {
      console.error(`Error processing "${block.title}":`, err.message);
      errors++;
    }
  }

  console.log('\n--- Sync Summary ---');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (unchanged): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

/**
 * Mark stale entries as inactive
 * (entries that were previously synced but no longer exist in code)
 */
async function cleanupStaleEntries(currentBlocks: ParsedBlock[]): Promise<void> {
  console.log('\nChecking for stale entries...');

  // Get all code-sync entries from database
  const { data: dbEntries, error } = await supabase
    .from('knowledge_base')
    .select('id, source')
    .like('source', 'code-sync:%')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching existing entries:', error.message);
    return;
  }

  if (!dbEntries || dbEntries.length === 0) {
    console.log('  No existing code-sync entries found.');
    return;
  }

  // Get current source IDs
  const currentSourceIds = new Set(
    currentBlocks.map(b => `code-sync:${generateSourceId(b)}`)
  );

  // Find stale entries (in DB but not in current code)
  const staleEntries = dbEntries.filter(e => !currentSourceIds.has(e.source));

  if (staleEntries.length === 0) {
    console.log('  No stale entries found.');
    return;
  }

  console.log(`  Found ${staleEntries.length} stale entries. Marking as inactive...`);

  for (const entry of staleEntries) {
    const { error: updateError } = await supabase
      .from('knowledge_base')
      .update({ is_active: false })
      .eq('id', entry.id);

    if (updateError) {
      console.error(`  Error deactivating entry ${entry.id}:`, updateError.message);
    } else {
      console.log(`  Deactivated: ${entry.source}`);
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('AI Knowledge Sync');
  console.log('=================\n');

  const projectRoot = path.join(__dirname, '..');
  const allBlocks: ParsedBlock[] = [];

  // Scan each directory
  for (const dir of SCAN_DIRS) {
    const fullPath = path.join(projectRoot, dir);

    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping ${dir} (not found)`);
      continue;
    }

    console.log(`Scanning ${dir}...`);
    const files = getAllFiles(fullPath);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const blocks = parseAiKnowledgeBlocks(content, file);

      if (blocks.length > 0) {
        console.log(`  Found ${blocks.length} block(s) in ${path.relative(projectRoot, file)}`);
        allBlocks.push(...blocks);
      }
    }
  }

  console.log(`\nTotal blocks found: ${allBlocks.length}`);

  if (allBlocks.length === 0) {
    console.log('\nNo @ai-knowledge blocks found. Add some to your code!');
    console.log('Example:');
    console.log(`
/**
 * @ai-knowledge
 * @title Clock In/Out Feature
 * @category Features
 * @subcategory Attendance
 * @tags attendance, time-tracking, employees
 *
 * The clock in/out feature allows employees to track their working hours.
 * Located in the ModuleBar and DashboardHeader components.
 */
`);
    return;
  }

  // Sync to database
  await syncToDatabase(allBlocks);

  // Clean up stale entries
  await cleanupStaleEntries(allBlocks);

  console.log('\nSync complete!');
}

// Run the script
main().catch(console.error);
