import type { EHOReportData, TemperatureRecord } from '../types'
import { escapeHtml, formatDateTime, rateColor } from '../utils/formatters'
import { buildSection, buildSubSection, buildStatCards, buildDataTable, buildCallout } from '../utils/helpers'
import { extractTemperatureFromCompletions } from '../utils/temperature-extractor'

export function buildTemperatureSection(data: EHOReportData): string {
  const { temperatureRecords, taskCompletions, assets } = data

  // Merge temperature_logs RPC data with readings extracted from task completions
  const fromCompletions = extractTemperatureFromCompletions(taskCompletions, assets)

  // Deduplicate: if we have both sources, prefer temperature_logs entries.
  // Build a fingerprint set from the RPC results to avoid double-counting.
  const rpcFingerprints = new Set<string>()
  for (const r of temperatureRecords) {
    // Fingerprint: asset + reading + timestamp (rounded to minute)
    const ts = r.recorded_at ? r.recorded_at.slice(0, 16) : ''
    rpcFingerprints.add(`${r.asset_name}|${r.reading}|${ts}`)
  }

  const dedupedFromCompletions = fromCompletions.filter(r => {
    const ts = r.recorded_at ? r.recorded_at.slice(0, 16) : ''
    return !rpcFingerprints.has(`${r.asset_name}|${r.reading}|${ts}`)
  })

  const allRecords: TemperatureRecord[] = [...temperatureRecords, ...dedupedFromCompletions]
  // Sort by most recent first
  allRecords.sort((a, b) => (b.recorded_at || '').localeCompare(a.recorded_at || ''))

  const total = allRecords.length
  const breaches = allRecords.filter(r =>
    r.status === 'breach' || r.status === 'out_of_range' || r.status === 'critical'
  )
  const breachCount = breaches.length
  const breachRate = total > 0 ? Math.round((breachCount / total) * 100) : 0
  const uniqueAssets = new Set(allRecords.map(r => r.asset_name)).size

  const stats = buildStatCards([
    { value: total, label: 'Total Readings' },
    { value: uniqueAssets, label: 'Assets Monitored' },
    { value: breachCount, label: 'Breaches', colorClass: breachCount > 0 ? 'text-red' : 'text-green' },
    { value: `${breachRate}%`, label: 'Breach Rate', colorClass: `text-${rateColor(100 - breachRate)}` },
  ])

  // Breach highlight
  let breachCallout = ''
  if (breaches.length > 0) {
    const breachList = breaches.slice(0, 20).map(b =>
      `${escapeHtml(b.asset_name)}: <strong>${b.reading}°${b.unit === 'celsius' ? 'C' : b.unit}</strong> — ${formatDateTime(b.recorded_at)} (${escapeHtml(b.recorded_by_name)})`
    ).join('<br/>')
    const extra = breaches.length > 20 ? `<br/><em>...and ${breaches.length - 20} more breaches</em>` : ''
    breachCallout = buildCallout('danger', `${breachCount} Temperature Breach${breachCount > 1 ? 'es' : ''} Detected`, breachList + extra)
  }

  // Detailed temperature log table
  const recordsTable = buildDataTable({
    headers: [
      { key: 'asset_name', label: 'Equipment' },
      { key: 'reading_display', label: 'Temp', align: 'center' },
      { key: 'status_display', label: 'Status', format: 'badge', badgeMap: { ok: 'green', breach: 'red', 'out of range': 'red', critical: 'red' } },
      { key: 'recorded_at', label: 'Recorded', format: 'datetime' },
      { key: 'recorded_by_name', label: 'Recorded By' },
    ],
    rows: allRecords.map(r => ({
      ...r,
      reading_display: `${r.reading}°${r.unit === 'celsius' ? 'C' : r.unit}`,
      status_display: r.status === 'out_of_range' ? 'Out of Range'
        : r.status === 'critical' ? 'Breach'
        : r.status === 'breach' ? 'Breach'
        : 'OK',
    })),
    maxRows: 500,
    emptyMessage: 'No temperature records found for this period. Ensure temperature monitoring is configured.',
  })

  return buildSection(3, 'Temperature Monitoring', `
    ${stats}
    ${breachCallout}
    ${buildSubSection('Temperature Log', recordsTable)}
  `)
}
