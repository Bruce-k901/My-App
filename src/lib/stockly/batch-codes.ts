// @salsa - SALSA Compliance: Batch code generation utility
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Default batch code format if none configured.
 * Tokens: {SITE} = site code, {YYYY} = year, {MMDD} = month+day, {SEQ} = daily sequence
 */
export const DEFAULT_BATCH_CODE_FORMAT = '{YYYY}-{MMDD}-{SEQ}';

/**
 * Get the next sequence number for a given company on a given date.
 * Queries stock_batches for the highest sequence used today and increments.
 */
export async function getNextSequence(
  supabase: SupabaseClient,
  companyId: string,
  date: Date
): Promise<number> {
  const dateStr = formatDateForCode(date);
  const pattern = `%-${dateStr}-%`; // Match any code containing today's date

  const { data, error } = await supabase
    .from('stock_batches')
    .select('batch_code')
    .eq('company_id', companyId)
    .like('batch_code', pattern)
    .order('batch_code', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  // Extract the sequence number from the last batch code
  const lastCode = data[0].batch_code;
  const parts = lastCode.split('-');
  const lastSeq = parseInt(parts[parts.length - 1], 10);

  return isNaN(lastSeq) ? 1 : lastSeq + 1;
}

/**
 * Generate a batch code using the configured format.
 *
 * Supported tokens:
 * - {SITE}: site name abbreviation (first 4 chars uppercase)
 * - {YYYY}: 4-digit year
 * - {YY}: 2-digit year
 * - {MMDD}: month and day (zero-padded)
 * - {MM}: month (zero-padded)
 * - {DD}: day (zero-padded)
 * - {SEQ}: daily sequence number (zero-padded to 3 digits)
 * - {SEQ4}: daily sequence number (zero-padded to 4 digits)
 */
export async function generateBatchCode(
  supabase: SupabaseClient,
  companyId: string,
  options: {
    format?: string;
    siteName?: string;
    date?: Date;
  } = {}
): Promise<string> {
  const date = options.date || new Date();
  const format = options.format || DEFAULT_BATCH_CODE_FORMAT;
  const siteName = options.siteName || '';

  const seq = await getNextSequence(supabase, companyId, date);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const siteAbbr = siteName.substring(0, 4).toUpperCase().replace(/\s/g, '');

  const code = format
    .replace('{SITE}', siteAbbr)
    .replace('{YYYY}', String(year))
    .replace('{YY}', String(year).slice(-2))
    .replace('{MMDD}', `${month}${day}`)
    .replace('{MM}', month)
    .replace('{DD}', day)
    .replace('{SEQ4}', String(seq).padStart(4, '0'))
    .replace('{SEQ}', String(seq).padStart(3, '0'));

  return code;
}

/**
 * Validate a manually entered batch code is unique for the company.
 */
export async function isBatchCodeUnique(
  supabase: SupabaseClient,
  companyId: string,
  batchCode: string,
  excludeBatchId?: string
): Promise<boolean> {
  let query = supabase
    .from('stock_batches')
    .select('id')
    .eq('company_id', companyId)
    .eq('batch_code', batchCode)
    .limit(1);

  if (excludeBatchId) {
    query = query.neq('id', excludeBatchId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}

/**
 * Format a date as YYYYMMDD for use in batch code pattern matching.
 */
function formatDateForCode(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}

/**
 * Parse a batch code format string and return a preview with example values.
 */
export function previewBatchCodeFormat(format: string, siteName?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const siteAbbr = (siteName || 'SITE').substring(0, 4).toUpperCase().replace(/\s/g, '');

  return format
    .replace('{SITE}', siteAbbr)
    .replace('{YYYY}', String(year))
    .replace('{YY}', String(year).slice(-2))
    .replace('{MMDD}', `${month}${day}`)
    .replace('{MM}', month)
    .replace('{DD}', day)
    .replace('{SEQ4}', '0001')
    .replace('{SEQ}', '001');
}
