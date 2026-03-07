import type { SupabaseClient } from '@supabase/supabase-js'
import { RULES } from './rules'
import { calculateHealthScore } from './scanner'

type Scenario = 'clean' | 'moderate' | 'critical' | 'mixed'

interface GenerateOptions {
  companyId: string
  scenario: Scenario
}

interface GenerateResult {
  reportsCreated: number
  itemsCreated: number
  errors: string[]
}

/**
 * Generate synthetic health check test data.
 * Creates reports and items directly (no broken source records).
 * All generated data is marked with is_test_data = true for easy cleanup.
 */
export async function generateTestData(
  supabase: SupabaseClient,
  options: GenerateOptions
): Promise<GenerateResult> {
  const { companyId, scenario } = options
  const result: GenerateResult = { reportsCreated: 0, itemsCreated: 0, errors: [] }

  // Get active sites
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (!sites?.length) {
    result.errors.push('No active sites found for this company')
    return result
  }

  // Find a user to assign reports to
  const { data: assignee } = await supabase
    .from('profiles')
    .select('id, app_role')
    .eq('company_id', companyId)
    .in('app_role', ['Owner', 'Admin', 'Manager'])
    .limit(1)
    .single()

  if (!assignee) {
    result.errors.push('No admin/manager/owner found to assign reports to')
    return result
  }

  for (const site of sites) {
    try {
      const items = generateItemsForScenario(scenario, companyId, site.id, site.name)

      if (items.length === 0 && scenario === 'clean') {
        // Clean scenario: create a report with no issues
        const { error } = await supabase
          .from('health_check_reports')
          .insert({
            company_id: companyId,
            report_level: 'site',
            site_id: site.id,
            assigned_to: assignee.id,
            assigned_role: assignee.app_role,
            total_items: 0,
            critical_count: 0,
            medium_count: 0,
            low_count: 0,
            health_score: 100,
            status: 'completed',
            completed_at: new Date().toISOString(),
            is_test_data: true,
          })
        if (error) result.errors.push(`Report for ${site.name}: ${error.message}`)
        else result.reportsCreated++
        continue
      }

      const stats = {
        total: items.length,
        critical: items.filter(i => i.severity === 'critical').length,
        medium: items.filter(i => i.severity === 'medium').length,
        low: items.filter(i => i.severity === 'low').length,
      }

      const healthScore = calculateHealthScore(stats)

      // Create report
      const { data: report, error: reportError } = await supabase
        .from('health_check_reports')
        .insert({
          company_id: companyId,
          report_level: 'site',
          site_id: site.id,
          assigned_to: assignee.id,
          assigned_role: assignee.app_role,
          total_items: stats.total,
          critical_count: stats.critical,
          medium_count: stats.medium,
          low_count: stats.low,
          health_score: healthScore,
          previous_week_score: healthScore + (Math.random() * 10 - 5), // Simulate previous week
          status: 'pending',
          is_test_data: true,
        })
        .select('id')
        .single()

      if (reportError || !report) {
        result.errors.push(`Report for ${site.name}: ${reportError?.message}`)
        continue
      }

      result.reportsCreated++

      // Create items
      const dbItems = items.map(item => ({
        ...item,
        report_id: report.id,
        is_test_data: true,
      }))

      const { data: inserted, error: itemsError } = await supabase
        .from('health_check_items')
        .insert(dbItems)
        .select('id')

      if (itemsError) {
        result.errors.push(`Items for ${site.name}: ${itemsError.message}`)
      } else {
        result.itemsCreated += inserted?.length ?? 0
      }

      // Save to history
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('health_check_history').upsert({
        company_id: companyId,
        site_id: site.id,
        report_date: today,
        total_items: stats.total,
        critical_count: stats.critical,
        medium_count: stats.medium,
        low_count: stats.low,
        completed_items: 0,
        health_score: healthScore,
        module_scores: calculateModuleScores(items),
        category_counts: calculateCategoryCounts(items),
      }, { onConflict: 'company_id,site_id,report_date' })
    } catch (err: any) {
      result.errors.push(`Site ${site.name}: ${err.message}`)
    }
  }

  return result
}

/**
 * Clear all test data for a company.
 */
export async function clearTestData(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = []
  let deleted = 0

  // Delete test reports (cascade deletes items & reminders)
  const { data: reports, error: reportsErr } = await supabase
    .from('health_check_reports')
    .delete()
    .eq('company_id', companyId)
    .eq('is_test_data', true)
    .select('id')

  if (reportsErr) errors.push(`Reports: ${reportsErr.message}`)
  else deleted += reports?.length ?? 0

  // Delete history (no is_test_data flag, but clear for this company)
  const { error: historyErr } = await supabase
    .from('health_check_history')
    .delete()
    .eq('company_id', companyId)

  if (historyErr) errors.push(`History: ${historyErr.message}`)

  return { deleted, errors }
}

// ---------- Scenario Item Generators ----------

function generateItemsForScenario(
  scenario: Scenario,
  companyId: string,
  siteId: string,
  siteName: string
): Array<Record<string, any>> {
  switch (scenario) {
    case 'clean':
      return []
    case 'moderate':
      return generateModerateItems(companyId, siteId, siteName)
    case 'critical':
      return generateCriticalItems(companyId, siteId, siteName)
    case 'mixed':
      return [
        ...generateCriticalItems(companyId, siteId, siteName),
        ...generateModerateItems(companyId, siteId, siteName),
      ]
    default:
      return generateModerateItems(companyId, siteId, siteName)
  }
}

function generateModerateItems(companyId: string, siteId: string, siteName: string): Array<Record<string, any>> {
  const fakeId = () => crypto.randomUUID()

  return [
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'stockly_missing_par_level')!,
      recordName: `Olive Oil (${siteName})`,
      recordId: fakeId(),
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'stockly_missing_category')!,
      recordName: `Fresh Basil (${siteName})`,
      recordId: fakeId(),
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'teamly_missing_emergency_contact')!,
      recordName: `John Smith (${siteName})`,
      recordId: fakeId(),
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'teamly_incomplete_training')!,
      recordName: `Jane Doe - Level 2 Food Hygiene (${siteName})`,
      recordId: fakeId(),
      currentValue: 'not_started',
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'assetly_missing_ppm_contractor')!,
      recordName: `Walk-in Freezer (${siteName})`,
      recordId: fakeId(),
    }),
  ]
}

function generateCriticalItems(companyId: string, siteId: string, siteName: string): Array<Record<string, any>> {
  const fakeId = () => crypto.randomUUID()
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  return [
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'checkly_missing_allergens')!,
      recordName: `Prawn Cocktail (${siteName})`,
      recordId: fakeId(),
      aiSuggestion: ['Crustaceans', 'Fish', 'Eggs'],
      aiConfidence: 85,
      aiReasoning: 'Prawn cocktail typically contains crustaceans (prawns), may contain fish-based sauce, and Marie Rose sauce contains eggs.',
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'checkly_missing_allergens')!,
      recordName: `Caesar Salad (${siteName})`,
      recordId: fakeId(),
      aiSuggestion: ['Eggs', 'Fish', 'Milk', 'Cereals containing gluten'],
      aiConfidence: 75,
      aiReasoning: 'Caesar dressing contains eggs and anchovies (fish), parmesan (milk), croutons (gluten).',
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'checkly_missing_risk_assessment')!,
      recordName: `Deep Fat Fryer Clean (${siteName})`,
      recordId: fakeId(),
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'teamly_expired_training')!,
      recordName: `Mike Jones - Fire Safety (${siteName})`,
      recordId: fakeId(),
      currentValue: pastDate,
    }),
    makeItem({
      companyId, siteId,
      rule: RULES.find(r => r.id === 'assetly_overdue_ppm')!,
      recordName: `Gas Boiler (${siteName})`,
      recordId: fakeId(),
      currentValue: pastDate,
    }),
  ]
}

function makeItem(opts: {
  companyId: string
  siteId: string
  rule: (typeof RULES)[number]
  recordName: string
  recordId: string
  currentValue?: unknown
  aiSuggestion?: unknown
  aiConfidence?: number
  aiReasoning?: string
}): Record<string, any> {
  return {
    company_id: opts.companyId,
    site_id: opts.siteId,
    severity: opts.rule.severity,
    module: opts.rule.module,
    category: opts.rule.category,
    title: opts.rule.title,
    description: `${opts.rule.description}: ${opts.recordName}`,
    table_name: opts.rule.table_name,
    record_id: opts.recordId,
    record_name: opts.recordName,
    field_name: opts.rule.field_name,
    field_label: opts.rule.field_label,
    field_type: opts.rule.field_type,
    current_value: opts.currentValue != null ? JSON.stringify(opts.currentValue) : null,
    field_options: opts.rule.field_options ? JSON.stringify(opts.rule.field_options) : null,
    ai_suggestion: opts.aiSuggestion ? JSON.stringify(opts.aiSuggestion) : null,
    ai_confidence: opts.aiConfidence ?? null,
    ai_reasoning: opts.aiReasoning ?? null,
    status: 'pending',
  }
}

// ---------- Helpers ----------

function calculateModuleScores(items: Array<Record<string, any>>): Record<string, number> {
  const modules: Record<string, { weighted: number }> = {}
  for (const item of items) {
    const mod = item.module
    if (!modules[mod]) modules[mod] = { weighted: 0 }
    modules[mod].weighted += item.severity === 'critical' ? 5 : item.severity === 'medium' ? 2 : 1
  }
  const scores: Record<string, number> = {}
  for (const mod of Object.keys(modules)) {
    scores[mod] = Math.max(0, 100 - modules[mod].weighted)
  }
  return scores
}

function calculateCategoryCounts(items: Array<Record<string, any>>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1
  }
  return counts
}
