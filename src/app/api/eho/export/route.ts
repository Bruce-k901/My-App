import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateComprehensiveReport } from '@/lib/eho-report'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }

  return createClient(url, key)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function buildSummarySection(summaryData: any[]): string {
  if (!summaryData || summaryData.length === 0) {
    return `<div class="section">
      <h2>Compliance Summary</h2>
      <p class="muted">No compliance summary data available for this period.</p>
    </div>`
  }

  const totalTasks = summaryData.reduce((s: number, r: any) => s + (r.total_tasks || 0), 0)
  const totalCompleted = summaryData.reduce((s: number, r: any) => s + (r.completed_tasks || 0), 0)
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  const rows = summaryData.map((row: any) => `
    <tr>
      <td>${escapeHtml(row.category || 'Unknown')}</td>
      <td class="center">${row.total_tasks || 0}</td>
      <td class="center">${row.completed_tasks || 0}</td>
      <td class="center">${row.missed_tasks || 0}</td>
      <td class="center ${(row.completion_rate || 0) >= 90 ? 'text-green' : (row.completion_rate || 0) >= 70 ? 'text-amber' : 'text-red'}">${row.completion_rate || 0}%</td>
    </tr>
  `).join('')

  return `<div class="section">
    <h2>Compliance Summary</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${totalTasks}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green">${totalCompleted}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-red">${totalTasks - totalCompleted}</div>
        <div class="stat-label">Missed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value ${overallRate >= 90 ? 'text-green' : overallRate >= 70 ? 'text-amber' : 'text-red'}">${overallRate}%</div>
        <div class="stat-label">Overall Rate</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th class="center">Total</th>
          <th class="center">Completed</th>
          <th class="center">Missed</th>
          <th class="center">Rate</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function buildTaskCompletionsSection(reportData: any[]): string {
  if (!reportData || reportData.length === 0) {
    return `<div class="section">
      <h2>Task Completions</h2>
      <p class="muted">No task completion records found for this period.</p>
    </div>`
  }

  const rows = reportData.slice(0, 200).map((row: any) => `
    <tr>
      <td>${escapeHtml(row.task_name || row.template_name || 'Unknown')}</td>
      <td>${escapeHtml(row.category || 'N/A')}</td>
      <td>${formatDateTime(row.completed_at)}</td>
      <td>${escapeHtml(row.completed_by_name || row.completed_by || 'N/A')}</td>
      <td class="center">${row.status === 'completed' ? '<span class="badge green">Done</span>' : `<span class="badge red">${escapeHtml(row.status || 'Unknown')}</span>`}</td>
    </tr>
  `).join('')

  return `<div class="section">
    <h2>Task Completions</h2>
    <p class="muted">${reportData.length} record(s) found${reportData.length > 200 ? ' (showing first 200)' : ''}</p>
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Category</th>
          <th>Completed</th>
          <th>By</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function buildExtendedSection(title: string, data: any[], columns: { key: string; label: string; format?: 'date' | 'datetime' }[]): string {
  if (!data || data.length === 0) return ''

  const headers = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')
  const rows = data.slice(0, 100).map((row: any) => {
    const cells = columns.map(c => {
      const val = row[c.key]
      if (c.format === 'date') return `<td>${formatDate(val)}</td>`
      if (c.format === 'datetime') return `<td>${formatDateTime(val)}</td>`
      return `<td>${escapeHtml(String(val ?? 'N/A'))}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  return `<div class="section">
    <h2>${escapeHtml(title)}</h2>
    <p class="muted">${data.length} record(s)${data.length > 100 ? ' (showing first 100)' : ''}</p>
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function buildStaffHealthSection(data: any[]): string {
  if (!data || data.length === 0) return ''

  const rows = data.slice(0, 100).map((row: any) => {
    const statusClass = row.health_status === 'active' ? 'red' : row.health_status === 'cleared' ? 'green' : 'amber'
    const statusLabel = row.health_status === 'active' ? 'Active' : row.health_status === 'cleared' ? 'Cleared' : 'Closed'
    const critical = row.symptomatic_in_food_areas ? '<br/><span style="color:#991b1b;font-weight:600;">⚠ Symptomatic in food areas</span>' : ''
    const rtwInfo = row.rtw_conducted_date
      ? `RTW: ${formatDate(row.rtw_conducted_date)} — ${row.rtw_fit_for_full_duties ? 'Fit' : 'Restricted'}${row.rtw_adjustments_needed && row.rtw_adjustments_details ? ' (' + escapeHtml(row.rtw_adjustments_details) + ')' : ''}`
      : ''

    return `<tr>
      <td>${escapeHtml(row.staff_name || 'N/A')}</td>
      <td>${formatDate(row.declaration_date)}</td>
      <td>${escapeHtml(row.symptoms || 'N/A')}${critical}</td>
      <td>${formatDate(row.exclusion_start)} – ${row.exclusion_end ? formatDate(row.exclusion_end) : 'Ongoing'}</td>
      <td class="center"><span class="badge ${statusClass}">${statusLabel}</span></td>
      <td>${row.medical_clearance_required ? (row.medical_clearance_received ? '<span class="badge green">Received</span>' : '<span class="badge amber">Required</span>') : 'N/A'}</td>
      <td>${rtwInfo || 'Pending'}</td>
    </tr>`
  }).join('')

  return `<div class="section">
    <h2>Staff Sickness & Return to Work</h2>
    <p class="muted">${data.length} record(s)${data.length > 100 ? ' (showing first 100)' : ''}</p>
    <table>
      <thead>
        <tr>
          <th>Staff Member</th>
          <th>Onset Date</th>
          <th>Symptoms</th>
          <th>Exclusion Period</th>
          <th class="center">Status</th>
          <th>Medical Clearance</th>
          <th>Return to Work</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function generatePdfHtml(
  siteName: string,
  siteAddress: string,
  startDate: string,
  endDate: string,
  summaryData: any[],
  reportData: any[],
  extendedData: any | null
): string {
  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  let extendedSections = ''
  if (extendedData) {
    extendedSections += buildExtendedSection('Temperature Records', extendedData.temperature_records, [
      { key: 'location_name', label: 'Location' },
      { key: 'temperature', label: 'Temp (\u00B0C)' },
      { key: 'recorded_at', label: 'Recorded', format: 'datetime' },
      { key: 'recorded_by_name', label: 'By' },
    ])
    extendedSections += buildExtendedSection('Incident Reports', extendedData.incident_reports, [
      { key: 'title', label: 'Incident' },
      { key: 'incident_type', label: 'Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'status', label: 'Status' },
      { key: 'incident_date', label: 'Date', format: 'date' },
    ])
    extendedSections += buildExtendedSection('Cleaning Records', extendedData.cleaning_records, [
      { key: 'task_name', label: 'Task' },
      { key: 'area', label: 'Area' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'completed_by_name', label: 'By' },
    ])
    extendedSections += buildExtendedSection('Training Records', extendedData.training_records, [
      { key: 'employee_name', label: 'Employee' },
      { key: 'course', label: 'Course' },
      { key: 'status', label: 'Status' },
      { key: 'completed_date', label: 'Completed', format: 'date' },
    ])
    extendedSections += buildExtendedSection('Maintenance Logs', extendedData.maintenance_logs, [
      { key: 'asset_name', label: 'Asset' },
      { key: 'work_type', label: 'Type' },
      { key: 'performed_at', label: 'Date', format: 'date' },
      { key: 'performed_by_name', label: 'By' },
    ])
    extendedSections += buildStaffHealthSection(extendedData.staff_health_declarations)
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EHO Compliance Report - ${escapeHtml(siteName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.5;
      font-size: 12px;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 24px 32px; }

    /* Header */
    .header {
      border-bottom: 3px solid #D37E91;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #64748b; }
    .header .meta { display: flex; gap: 24px; margin-top: 12px; font-size: 12px; color: #475569; flex-wrap: wrap; }
    .header .meta strong { color: #1a1a2e; }

    /* Sections */
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section h2 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { background: #f1f5f9; }
    th { text-align: left; padding: 8px 10px; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #475569; }
    tr:nth-child(even) { background: #fafafa; }
    .center { text-align: center; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.green { background: #dcfce7; color: #166534; }
    .badge.red { background: #fee2e2; color: #991b1b; }
    .badge.amber { background: #fef3c7; color: #92400e; }

    /* Colors */
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; }
    .text-amber { color: #d97706; }
    .muted { color: #94a3b8; font-size: 11px; margin-bottom: 8px; }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }

    /* Print */
    @media print {
      body { font-size: 10px; }
      .container { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EHO Compliance Report</h1>
      <div class="subtitle">${escapeHtml(siteName)}</div>
      <div class="meta">
        ${siteAddress ? `<span><strong>Address:</strong> ${escapeHtml(siteAddress)}</span>` : ''}
        <span><strong>Period:</strong> ${formatDate(startDate)} &mdash; ${formatDate(endDate)}</span>
        <span><strong>Generated:</strong> ${now}</span>
      </div>
    </div>

    ${buildSummarySection(summaryData)}
    ${buildTaskCompletionsSection(reportData)}
    ${extendedSections}

    <div class="footer">
      This report was generated automatically by Opsly. Data shown reflects compliance records for the specified date range.
    </div>
  </div>
</body>
</html>`
}

/**
 * POST /api/eho/export
 *
 * Generate EHO report export as printable HTML (for PDF via browser print)
 *
 * Query params:
 * - site_id: UUID of the site
 * - start_date: YYYY-MM-DD format
 * - end_date: YYYY-MM-DD format
 * - format: pdf (default)
 * - categories: comma-separated list (optional)
 * - include_missed: boolean (optional)
 */
export async function GET(request: NextRequest) {
  return handleExport(request)
}

export async function POST(request: NextRequest) {
  return handleExport(request)
}

async function handleExport(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fullReport = searchParams.get('full_report') === 'true'

    // Comprehensive EHO Pack
    if (fullReport) {
      return await generateComprehensiveReport(searchParams)
    }

    // Legacy basic export
    const format = (searchParams.get('format') || 'pdf') as 'pdf' | 'json' | 'zip'

    if (format === 'json') {
      return NextResponse.json({ error: 'Use /api/eho/export/json endpoint' }, { status: 400 })
    }

    if (format === 'zip') {
      return NextResponse.json({ error: 'Use /api/eho/export/zip endpoint' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const categoriesParam = searchParams.get('categories')
    const includeMissed = searchParams.get('include_missed') === 'true'

    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      )
    }

    const categories = categoriesParam
      ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean)
      : null

    // Fetch site info
    const { data: siteData } = await supabase
      .from('sites')
      .select('id, name, address_line1, address_line2, city, postcode')
      .eq('id', siteId)
      .single()

    const siteName = siteData?.name || 'Unknown Site'
    const addressParts = [siteData?.address_line1, siteData?.address_line2, siteData?.city, siteData?.postcode].filter(Boolean)
    const siteAddress = addressParts.join(', ')

    // Fetch compliance summary (graceful fallback if RPC doesn't exist)
    let summaryData: any[] = []
    try {
      const { data, error } = await supabase.rpc('get_compliance_summary', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      })
      if (!error && data) summaryData = data
    } catch {
      console.warn('get_compliance_summary not available')
    }

    // Fetch task completion report data (graceful fallback)
    let reportData: any[] = []
    try {
      const { data, error } = await supabase.rpc('get_eho_report_data', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_template_categories: categories
      })
      if (!error && data) reportData = data
    } catch {
      console.warn('get_eho_report_data not available')
    }

    // Fetch extended data (graceful fallback per-section)
    let extendedData: any = null
    try {
      const results = await Promise.allSettled([
        supabase.rpc('get_eho_temperature_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
        supabase.rpc('get_eho_incident_reports', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
        supabase.rpc('get_eho_cleaning_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
        supabase.rpc('get_eho_training_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
        supabase.rpc('get_eho_maintenance_logs', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
      ])

      const getData = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' && !result.value.error ? (result.value.data || []) : []

      extendedData = {
        temperature_records: getData(results[0]),
        incident_reports: getData(results[1]),
        cleaning_records: getData(results[2]),
        training_records: getData(results[3]),
        maintenance_logs: getData(results[4]),
      }
    } catch {
      console.warn('Extended data RPCs not available')
    }

    // Generate the HTML
    const html = generatePdfHtml(
      siteName,
      siteAddress,
      startDate,
      endDate,
      summaryData,
      reportData,
      extendedData
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="eho-report-${startDate}-to-${endDate}.html"`
      }
    })

  } catch (error: any) {
    console.error('EHO export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}
