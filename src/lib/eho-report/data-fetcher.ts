import { SupabaseClient } from '@supabase/supabase-js'
import type { EHOReportData, SiteInfo, CompanyInfo } from './types'

function safeData<T>(result: PromiseSettledResult<{ data: T | null; error: any }>, label?: string): T | null {
  if (result.status !== 'fulfilled') {
    console.warn(`[EHO Report] ${label || 'Query'} rejected:`, result.status === 'rejected' ? result.reason : 'unknown')
    return null
  }
  if (result.value.error) {
    console.warn(`[EHO Report] ${label || 'Query'} error:`, result.value.error.message || result.value.error)
    return null
  }
  return result.value.data
}

export async function fetchAllReportData(
  supabase: SupabaseClient,
  siteId: string,
  startDate: string,
  endDate: string
): Promise<EHOReportData> {
  // Phase 1: Get site info (need company_id for subsequent queries)
  const { data: siteData } = await supabase
    .from('sites')
    .select('id, name, address_line1, address_line2, city, postcode, company_id')
    .eq('id', siteId)
    .single()

  const site: SiteInfo = siteData || {
    id: siteId,
    name: 'Unknown Site',
    address_line1: null,
    address_line2: null,
    city: null,
    postcode: null,
    company_id: null,
  }

  const companyId = site.company_id

  // Phase 2: All queries in parallel
  const results = await Promise.allSettled([
    // 0: Company info
    companyId
      ? supabase.from('companies').select('id, name, legal_name, address_line1, city, postcode, contact_email, phone').eq('id', companyId).single()
      : Promise.resolve({ data: null, error: null }),
    // 1: Compliance summary
    supabase.rpc('get_compliance_summary', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
    // 2: Task completions (all categories)
    supabase.rpc('get_eho_report_data', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate, p_template_categories: null }),
    // 3: Temperature records (direct query — RPC may not return data)
    supabase.from('temperature_logs')
      .select('id, asset_id, reading, unit, recorded_at, status, profiles:recorded_by(full_name), asset:assets!asset_id(name, category)')
      .eq('site_id', siteId)
      .gte('recorded_at', startDate + 'T00:00:00')
      .lte('recorded_at', endDate + 'T23:59:59')
      .order('recorded_at', { ascending: false })
      .limit(1000),
    // 4: Cleaning records
    supabase.rpc('get_eho_cleaning_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
    // 5: Pest control records
    supabase.rpc('get_eho_pest_control_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
    // 6: Training records
    supabase.rpc('get_eho_training_records', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
    // 7: Incident reports (direct query — RPC has column name mismatches)
    // Use reported_date as primary filter since incident_date may be null on some records
    supabase.from('incidents').select('id, title, description, incident_type, severity, incident_date, reported_date, reported_by, location, riddor_reportable, riddor_reported, riddor_reference, status, immediate_actions_taken, corrective_actions, investigation_notes, root_cause, casualties, emergency_services_called, photos').eq('site_id', siteId).or(`and(reported_date.gte.${startDate},reported_date.lte.${endDate}),and(incident_date.gte.${startDate},incident_date.lte.${endDate})`).order('reported_date', { ascending: false }),
    // 8: Opening/closing checklists
    supabase.rpc('get_eho_opening_closing_checklists', { p_site_id: siteId, p_start_date: startDate, p_end_date: endDate }),
    // 9: Global documents
    companyId
      ? supabase.from('global_documents').select('id, name, category, version, uploaded_at, expiry_date, is_active, notes, file_path').eq('company_id', companyId).eq('is_active', true).order('category')
      : Promise.resolve({ data: [], error: null }),
    // 10: COSHH data sheets
    companyId
      ? supabase.from('coshh_data_sheets').select('id, product_name, manufacturer, hazard_types, document_type, issue_date, expiry_date, status, verification_status, file_url').eq('company_id', companyId).order('product_name')
      : Promise.resolve({ data: [], error: null }),
    // 11: Risk assessments
    companyId
      ? supabase.from('risk_assessments').select('id, title, ref_code, template_type, assessor_name, assessment_date, next_review_date, status, total_hazards, hazards_controlled, highest_risk_level, linked_chemicals, linked_ppe').eq('company_id', companyId).order('template_type')
      : Promise.resolve({ data: [], error: null }),
    // 12: Assets
    supabase.from('assets').select('id, name, category, brand, model, serial_number, status, install_date, last_service_date, next_service_date, warranty_end, ppm_status, ppm_frequency_months').eq('site_id', siteId).or('archived.is.null,archived.eq.false').order('name'),
    // 13: PAT appliances
    companyId
      ? supabase.from('pat_appliances').select('id, name, brand, has_current_pat_label, purchase_date, notes').eq('site_id', siteId).eq('company_id', companyId).order('name')
      : Promise.resolve({ data: [], error: null }),
    // 14: Compliance scores
    supabase.from('site_compliance_score').select('id, score, score_date, open_critical_incidents, overdue_corrective_actions, missed_daily_checklists, temperature_breaches_last_7d, breakdown').eq('site_id', siteId).gte('score_date', startDate).lte('score_date', endDate).order('score_date', { ascending: false }),
    // 15: Staff profiles
    companyId
      ? supabase.from('profiles').select('id, full_name, app_role, position_title, food_safety_level, food_safety_expiry_date, h_and_s_level, h_and_s_expiry_date, fire_marshal_trained, fire_marshal_expiry_date, first_aid_trained, first_aid_expiry_date, cossh_trained, cossh_expiry_date').eq('company_id', companyId)
      : Promise.resolve({ data: [], error: null }),
    // 16: Contractor callouts (pest control) — table may not exist yet
    Promise.resolve({ data: [], error: null }),
    // 17: Site-specific user access (to filter profiles by site)
    supabase.from('user_site_access').select('profile_id, auth_user_id').eq('site_id', siteId),
  ])

  // Post-process temperature logs into TemperatureRecord format
  const rawTempLogs = (safeData(results[3], 'temperature_logs') as any[]) || []
  const temperatureRecords = rawTempLogs.map((log: any) => ({
    recorded_at: log.recorded_at,
    asset_name: log.asset?.name || 'Unknown Equipment',
    asset_type: log.asset?.category || null,
    reading: typeof log.reading === 'number' ? log.reading : parseFloat(log.reading),
    unit: log.unit || 'celsius',
    status: log.status || 'ok',
    recorded_by_name: log.profiles?.full_name || 'Unknown',
    evaluation: null,
  }))

  // Filter staff profiles to site-specific members via user_site_access
  const allProfiles = safeData(results[15], 'profiles') || []
  const siteAccess = (safeData(results[17], 'site_users') as any[]) || []
  let staffProfiles = allProfiles
  if (siteAccess.length > 0) {
    const siteIds = new Set<string>()
    for (const u of siteAccess) {
      if (u.profile_id) siteIds.add(u.profile_id)
      if (u.auth_user_id) siteIds.add(u.auth_user_id)
    }
    staffProfiles = allProfiles.filter((p: any) => siteIds.has(p.id))
  }

  return {
    site,
    company: safeData(results[0], 'companies') as CompanyInfo | null,
    startDate,
    endDate,
    complianceSummary: safeData(results[1], 'compliance_summary') || [],
    taskCompletions: safeData(results[2], 'report_data') || [],
    temperatureRecords,
    cleaningRecords: safeData(results[4], 'cleaning') || [],
    pestControlRecords: safeData(results[5], 'pest_control') || [],
    trainingRecords: safeData(results[6], 'training') || [],
    incidentReports: safeData(results[7], 'incidents') || [],
    openingClosingChecklists: safeData(results[8], 'checklists') || [],
    globalDocuments: safeData(results[9], 'documents') || [],
    coshhDataSheets: safeData(results[10], 'coshh') || [],
    riskAssessments: safeData(results[11], 'risk_assessments') || [],
    assets: safeData(results[12], 'assets') || [],
    patAppliances: safeData(results[13], 'pat') || [],
    complianceScores: safeData(results[14], 'scores') || [],
    staffProfiles,
    contractorCallouts: safeData(results[16], 'callouts') || [],
  }
}
