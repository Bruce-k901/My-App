import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScanResult, ScannedItem } from '@/types/health-check'
import { RULES, SCAN_FUNCTIONS } from './rules'

/**
 * Run all health check rules for a single site.
 * Returns aggregated results with severity counts.
 */
export async function scanSite(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string,
  siteName: string
): Promise<ScanResult> {
  const allItems: ScannedItem[] = []
  const errors: string[] = []

  // Run each scan rule, catching errors per-rule so one failure doesn't block the rest
  for (const rule of RULES) {
    const scanFn = SCAN_FUNCTIONS[rule.id]
    if (!scanFn) continue

    try {
      const items = await scanFn(supabase, companyId, siteId)
      allItems.push(...items)
    } catch (err: any) {
      // 42P01 = table doesn't exist — skip gracefully
      if (err?.code === '42P01') continue
      errors.push(`${rule.id}: ${err.message || 'Unknown error'}`)
      console.error(`[HealthCheck] Rule ${rule.id} failed for site ${siteId}:`, err)
    }
  }

  const stats = {
    total: allItems.length,
    critical: allItems.filter(i => i.rule.severity === 'critical').length,
    medium: allItems.filter(i => i.rule.severity === 'medium').length,
    low: allItems.filter(i => i.rule.severity === 'low').length,
  }

  return { company_id: companyId, site_id: siteId, site_name: siteName, items: allItems, stats, scan_errors: errors }
}

/**
 * Run scans across all sites for a company.
 * Returns an array of ScanResult, one per site.
 */
export async function scanCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<ScanResult[]> {
  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (error || !sites?.length) {
    console.error('[HealthCheck] Failed to fetch sites for company', companyId, error)
    return []
  }

  const results: ScanResult[] = []

  for (const site of sites) {
    const result = await scanSite(supabase, companyId, site.id, site.name)
    results.push(result)
  }

  return results
}

/**
 * Calculate a health score (0-100) from scan stats.
 * Formula: 100 - (critical * 5 + medium * 2 + low * 1), min 0.
 */
export function calculateHealthScore(stats: ScanResult['stats']): number {
  const penalty = stats.critical * 5 + stats.medium * 2 + stats.low * 1
  return Math.max(0, Math.min(100, 100 - penalty))
}
