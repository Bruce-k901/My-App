import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { HealthCheckItem } from '@/types/health-check'
import { getRuleByCategory } from './rules'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface AISuggestion {
  value: unknown
  confidence: number
  reasoning: string
}

/**
 * Generate an AI suggestion for a single health check item.
 */
export async function generateAISuggestion(
  item: HealthCheckItem
): Promise<AISuggestion | null> {
  const rule = getRuleByCategory(item.category)
  if (!rule) return null

  const modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'

  try {
    const prompt = buildPrompt(item, rule)
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
      system: `You are a UK hospitality compliance data assistant. You suggest values for missing or incorrect data fields in food service, hotel, and catering operations. Respond ONLY in valid JSON format: { "value": ..., "confidence": 0-100, "reasoning": "brief explanation" }. For allergen fields, suggest an array of the 14 major allergens that apply based on the product name. For dates, use ISO format. Be conservative with confidence scores.`,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      value: parsed.value,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning || '',
    }
  } catch (err: any) {
    console.error('[AI] Suggestion failed for item', item.id, err.message)
    return null
  }
}

/**
 * Batch generate AI suggestions for multiple items.
 * Processes items sequentially to avoid rate limits.
 */
export async function batchGenerateAISuggestions(
  supabase: SupabaseClient,
  items: HealthCheckItem[],
  maxItems = 20
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const result = { processed: 0, succeeded: 0, failed: 0 }

  // Only process pending items that don't already have suggestions
  const eligible = items
    .filter(i => i.status === 'pending' && !i.ai_suggestion)
    .slice(0, maxItems)

  for (const item of eligible) {
    result.processed++

    const suggestion = await generateAISuggestion(item)
    if (!suggestion) {
      result.failed++
      continue
    }

    const { error } = await supabase
      .from('health_check_items')
      .update({
        ai_suggestion: JSON.stringify(suggestion.value),
        ai_confidence: suggestion.confidence,
        ai_reasoning: suggestion.reasoning,
      })
      .eq('id', item.id)

    if (error) {
      result.failed++
      console.error('[AI] Failed to save suggestion for', item.id, error.message)
    } else {
      result.succeeded++
    }
  }

  return result
}

/**
 * Auto-fix items where AI confidence is high enough.
 */
export async function autoFixHighConfidenceItems(
  supabase: SupabaseClient,
  reportId: string,
  confidenceThreshold = 90
): Promise<{ fixed: number; skipped: number }> {
  const { data: items } = await supabase
    .from('health_check_items')
    .select('*')
    .eq('report_id', reportId)
    .eq('status', 'pending')
    .not('ai_suggestion', 'is', null)
    .gte('ai_confidence', confidenceThreshold)

  if (!items?.length) return { fixed: 0, skipped: 0 }

  let fixed = 0
  let skipped = 0

  for (const item of items) {
    try {
      // Update the source record
      const { error: updateError } = await supabase
        .from(item.table_name)
        .update({ [item.field_name]: item.ai_suggestion })
        .eq('id', item.record_id)

      if (updateError) {
        skipped++
        continue
      }

      // Mark item as AI-fixed
      await supabase
        .from('health_check_items')
        .update({
          status: 'ai_fixed',
          resolved_at: new Date().toISOString(),
          resolution_method: 'ai_auto_fix',
          new_value: item.ai_suggestion,
        })
        .eq('id', item.id)

      fixed++
    } catch {
      skipped++
    }
  }

  // Update report counters
  if (fixed > 0) {
    const { data: allItems } = await supabase
      .from('health_check_items')
      .select('status')
      .eq('report_id', reportId)

    if (allItems) {
      const completed = allItems.filter(i => i.status === 'resolved' || i.status === 'ai_fixed').length
      const allDone = allItems.every(i => ['resolved', 'ai_fixed', 'ignored'].includes(i.status))

      await supabase
        .from('health_check_reports')
        .update({
          completed_items: completed,
          status: allDone ? 'completed' : 'in_progress',
          completed_at: allDone ? new Date().toISOString() : null,
        })
        .eq('id', reportId)
    }
  }

  return { fixed, skipped }
}

// ---------- Prompt Builder ----------

function buildPrompt(item: HealthCheckItem, rule: { field_type: string; field_options?: unknown }): string {
  let prompt = `A "${item.category}" issue was found for record "${item.record_name}" in a UK hospitality business.\n`
  prompt += `Field: ${item.field_label || item.field_name} (type: ${rule.field_type})\n`
  prompt += `Table: ${item.table_name}\n`

  if (item.current_value != null) {
    prompt += `Current value: ${JSON.stringify(item.current_value)}\n`
  } else {
    prompt += `Current value: empty/missing\n`
  }

  if (rule.field_options) {
    prompt += `Allowed options: ${JSON.stringify(rule.field_options)}\n`
  }

  prompt += `\nSuggest the most appropriate value for this field. Consider UK food safety regulations, common hospitality practices, and the product/record name.`

  return prompt
}
