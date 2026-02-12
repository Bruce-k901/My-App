'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, Users, Thermometer, ClipboardCheck, Shield, Flame, Sparkles, FileCheck, AlertTriangle, Building2, ExternalLink, Star } from '@/components/ui/icons'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2 } from '@/components/ui/icons'

interface Requirement {
  id: string
  name: string
  category: string
  required: boolean
  frequency?: string
  evidenceType: 'document' | 'record' | 'template' | 'completion' | 'training' | 'assessment'
  found: boolean
  foundDetails?: string
  expiryDate?: string | null
  status?: 'valid' | 'expired' | 'expiring_soon' | 'missing'
}

interface CategoryGroup {
  category: string
  icon: React.ReactNode
  requirements: Requirement[]
  completionRate: number
  status: 'complete' | 'partial' | 'missing'
}

interface EHOReadinessDashboardProps {
  siteId: string | null
}

// Comprehensive UK EHO Requirements for Hospitality Venues
const EHO_REQUIREMENTS: Omit<Requirement, 'found' | 'foundDetails' | 'expiryDate' | 'status'>[] = [
  // FOOD SAFETY POLICIES & DOCUMENTS
  { id: 'fs-policy', name: 'Food Safety Policy', category: 'Food Safety', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'haccp-plan', name: 'HACCP Plan / Food Safety Management System', category: 'Food Safety', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'allergen-policy', name: 'Allergen Management Policy', category: 'Food Safety', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'food-hygiene-training', name: 'Food Hygiene Training Records (Level 2+)', category: 'Food Safety', required: true, evidenceType: 'training', frequency: 'All food handlers' },
  { id: 'allergen-training', name: 'Allergen Awareness Training', category: 'Food Safety', required: true, evidenceType: 'training', frequency: 'All staff' },

  // FOOD SAFETY RECORDS
  { id: 'temp-logs', name: 'Temperature Logs (30 days)', category: 'Food Safety', required: true, evidenceType: 'record', frequency: 'Daily' },
  { id: 'fridge-temp', name: 'Fridge/Freezer Temperature Records', category: 'Food Safety', required: true, evidenceType: 'completion', frequency: 'Daily' },
  { id: 'hot-holding', name: 'Hot Holding Temperature Records', category: 'Food Safety', required: true, evidenceType: 'completion', frequency: 'During service' },
  { id: 'opening-checklist', name: 'Opening Checklist Records', category: 'Food Safety', required: true, evidenceType: 'completion', frequency: 'Daily' },
  { id: 'closing-checklist', name: 'Closing Checklist Records', category: 'Food Safety', required: true, evidenceType: 'completion', frequency: 'Daily' },

  // HEALTH & SAFETY POLICIES & DOCUMENTS
  { id: 'hs-policy', name: 'Health & Safety Policy', category: 'Health & Safety', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'hs-appointment', name: 'Competent Person Appointment Letter', category: 'Health & Safety', required: true, evidenceType: 'document', frequency: 'Annual' },
  { id: 'accident-book', name: 'Accident Book / Incident Log', category: 'Health & Safety', required: true, evidenceType: 'record', frequency: 'As occurs' },
  { id: 'riddor-records', name: 'RIDDOR Reportable Incident Records', category: 'Health & Safety', required: true, evidenceType: 'record', frequency: 'As occurs' },

  // RISK ASSESSMENTS
  { id: 'general-ra', name: 'General Risk Assessment', category: 'Health & Safety', required: true, evidenceType: 'assessment', frequency: 'Annual review' },
  { id: 'coshh-ra', name: 'COSHH Risk Assessments', category: 'Health & Safety', required: true, evidenceType: 'assessment', frequency: 'Annual review' },
  { id: 'manual-handling-ra', name: 'Manual Handling Risk Assessment', category: 'Health & Safety', required: true, evidenceType: 'assessment', frequency: 'Annual review' },
  { id: 'fire-ra', name: 'Fire Risk Assessment', category: 'Fire Safety', required: true, evidenceType: 'assessment', frequency: 'Annual review' },

  // COSHH DATA
  { id: 'coshh-register', name: 'COSHH Register / Chemical Inventory', category: 'Health & Safety', required: true, evidenceType: 'document', frequency: 'Updated as chemicals change' },
  { id: 'coshh-sheets', name: 'COSHH Data Sheets (SDS/MSDS)', category: 'Health & Safety', required: true, evidenceType: 'document', frequency: 'One per chemical' },

  // FIRE SAFETY
  { id: 'fire-policy', name: 'Fire Safety Policy', category: 'Fire Safety', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'fire-alarm-tests', name: 'Fire Alarm Test Records', category: 'Fire Safety', required: true, evidenceType: 'completion', frequency: 'Weekly' },
  { id: 'fire-extinguisher', name: 'Fire Extinguisher Inspection Records', category: 'Fire Safety', required: true, evidenceType: 'completion', frequency: 'Monthly' },
  { id: 'emergency-exits', name: 'Emergency Exit & Assembly Point Checks', category: 'Fire Safety', required: true, evidenceType: 'completion', frequency: 'Monthly' },
  { id: 'emergency-lighting', name: 'Emergency Lighting Test Records', category: 'Fire Safety', required: true, evidenceType: 'completion', frequency: 'Monthly' },

  // TRAINING & COMPETENCY
  { id: 'training-matrix', name: 'Training Matrix / Competency Records', category: 'Training', required: true, evidenceType: 'document', frequency: 'Updated quarterly' },
  { id: 'hs-training', name: 'Health & Safety Training Records', category: 'Training', required: true, evidenceType: 'training', frequency: 'All staff' },
  { id: 'fire-training', name: 'Fire Safety Training Records', category: 'Training', required: true, evidenceType: 'training', frequency: 'All staff' },
  { id: 'first-aid', name: 'First Aid Training Certificates', category: 'Training', required: true, evidenceType: 'training', frequency: 'At least one per site' },

  // CLEANING & HYGIENE
  { id: 'cleaning-schedule', name: 'Cleaning Schedule', category: 'Cleaning', required: true, evidenceType: 'document', frequency: 'Updated as needed' },
  { id: 'cleaning-records', name: 'Cleaning Checklist Records (30 days)', category: 'Cleaning', required: true, evidenceType: 'completion', frequency: 'Daily' },
  { id: 'pest-control', name: 'Pest Control Records / Log', category: 'Cleaning', required: true, evidenceType: 'completion', frequency: 'Weekly' },

  // EQUIPMENT & MAINTENANCE
  { id: 'pat-tests', name: 'PAT Test Records / Certificates', category: 'Equipment', required: true, evidenceType: 'record', frequency: 'Annual for portable appliances' },
  { id: 'equipment-maintenance', name: 'Equipment Maintenance Records', category: 'Equipment', required: true, evidenceType: 'record', frequency: 'As per schedule' },
  { id: 'gas-safety', name: 'Gas Safety Certificate (if applicable)', category: 'Equipment', required: true, evidenceType: 'document', frequency: 'Annual' },
  { id: 'electrical-safety', name: 'Electrical Installation Certificate', category: 'Equipment', required: true, evidenceType: 'document', frequency: '5-yearly' },

  // LEGAL & INSURANCE
  { id: 'public-liability', name: 'Public Liability Insurance', category: 'Legal', required: true, evidenceType: 'document', frequency: 'Annual renewal' },
  { id: 'employers-liability', name: 'Employers Liability Insurance', category: 'Legal', required: true, evidenceType: 'document', frequency: 'Annual renewal' },
  { id: 'premises-licence', name: 'Premises Licence (if applicable)', category: 'Legal', required: true, evidenceType: 'document', frequency: 'Valid' },
  { id: 'food-registration', name: 'Food Business Registration', category: 'Legal', required: true, evidenceType: 'document', frequency: 'Valid' },

  // ADDITIONAL COMPLIANCE
  { id: 'sop-library', name: 'Standard Operating Procedures (SOPs)', category: 'Compliance', required: true, evidenceType: 'document', frequency: 'Updated as needed' },
  { id: 'waste-management', name: 'Waste Management Policy / Records', category: 'Compliance', required: true, evidenceType: 'document', frequency: 'Annual review' },
  { id: 'staff-handbook', name: 'Staff Handbook / Employment Policies', category: 'Compliance', required: true, evidenceType: 'document', frequency: 'Updated as needed' },
]

// Maps each requirement ID to the app page where users can add/manage that data
const REQUIREMENT_LINKS: Record<string, { href: string; label: string }> = {
  // Food Safety - documents
  'fs-policy': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'haccp-plan': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'allergen-policy': { href: '/dashboard/documents', label: 'Upload in Documents' },
  // Food Safety - training
  'food-hygiene-training': { href: '/dashboard/people/training/matrix', label: 'Manage Training' },
  'allergen-training': { href: '/dashboard/people/training/matrix', label: 'Manage Training' },
  // Food Safety - records
  'temp-logs': { href: '/dashboard/todays_tasks', label: 'Log Temperatures' },
  'fridge-temp': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'hot-holding': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'opening-checklist': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'closing-checklist': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  // Health & Safety - documents
  'hs-policy': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'hs-appointment': { href: '/dashboard/documents', label: 'Upload in Documents' },
  // Health & Safety - incidents
  'accident-book': { href: '/dashboard/incidents', label: 'View Incidents' },
  'riddor-records': { href: '/dashboard/incidents', label: 'View Incidents' },
  // Health & Safety - risk assessments
  'general-ra': { href: '/dashboard/sops/risk-assessments', label: 'Risk Assessments' },
  'coshh-ra': { href: '/dashboard/risk-assessments/coshh-template', label: 'COSHH Assessment' },
  'manual-handling-ra': { href: '/dashboard/sops/risk-assessments', label: 'Risk Assessments' },
  // Health & Safety - COSHH
  'coshh-register': { href: '/dashboard/coshh-data', label: 'COSHH Data Sheets' },
  'coshh-sheets': { href: '/dashboard/coshh-data', label: 'COSHH Data Sheets' },
  // Fire Safety
  'fire-ra': { href: '/dashboard/sops/risk-assessments', label: 'Risk Assessments' },
  'fire-policy': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'fire-alarm-tests': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'fire-extinguisher': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'emergency-exits': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'emergency-lighting': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  // Training
  'training-matrix': { href: '/dashboard/people/training/matrix', label: 'Training Matrix' },
  'hs-training': { href: '/dashboard/people/training/matrix', label: 'Manage Training' },
  'fire-training': { href: '/dashboard/people/training/matrix', label: 'Manage Training' },
  'first-aid': { href: '/dashboard/people/training/matrix', label: 'Manage Training' },
  // Cleaning
  'cleaning-schedule': { href: '/dashboard/checklists/templates', label: 'Checklist Templates' },
  'cleaning-records': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  'pest-control': { href: '/dashboard/todays_tasks', label: 'Complete Checklist' },
  // Equipment
  'pat-tests': { href: '/dashboard/assets', label: 'Asset Register' },
  'equipment-maintenance': { href: '/dashboard/assets', label: 'Asset Register' },
  'gas-safety': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'electrical-safety': { href: '/dashboard/documents', label: 'Upload in Documents' },
  // Legal
  'public-liability': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'employers-liability': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'premises-licence': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'food-registration': { href: '/dashboard/documents', label: 'Upload in Documents' },
  // Compliance
  'sop-library': { href: '/dashboard/sops', label: 'Manage SOPs' },
  'waste-management': { href: '/dashboard/documents', label: 'Upload in Documents' },
  'staff-handbook': { href: '/dashboard/documents', label: 'Upload in Documents' },
}

// Maps each category to a primary page for the category-level link
const CATEGORY_LINKS: Record<string, { href: string; label: string }> = {
  'Food Safety': { href: '/dashboard/documents', label: 'Food Safety Documents' },
  'Health & Safety': { href: '/dashboard/sops/risk-assessments', label: 'Risk Assessments' },
  'Fire Safety': { href: '/dashboard/todays_tasks', label: 'Fire Safety Checks' },
  'Training': { href: '/dashboard/people/training/matrix', label: 'Training Matrix' },
  'Cleaning': { href: '/dashboard/todays_tasks', label: 'Cleaning Checklists' },
  'Equipment': { href: '/dashboard/assets', label: 'Asset Register' },
  'Legal': { href: '/dashboard/documents', label: 'Legal Documents' },
  'Compliance': { href: '/dashboard/sops', label: 'SOPs & Compliance' },
}

// UK FHRS-style star rating based on documentation completion
// Modelled on the "Confidence in Management" scoring element
interface StarRatingInfo {
  stars: number
  label: string
  color: string
  bgColor: string
  borderColor: string
}

function getStarRating(completionPct: number, expiringCount: number = 0, expiredCount: number = 0): StarRatingInfo {
  // Penalise for expiring/expired items (each expired item reduces effective score more)
  const penalty = (expiredCount * 3) + (expiringCount * 1)
  const adjustedPct = Math.max(0, completionPct - penalty)

  if (adjustedPct >= 90) return {
    stars: 5, label: 'Very Good',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-500/20'
  }
  if (adjustedPct >= 75) return {
    stars: 4, label: 'Good',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-500/20'
  }
  if (adjustedPct >= 60) return {
    stars: 3, label: 'Generally Satisfactory',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-500/10',
    borderColor: 'border-yellow-200 dark:border-yellow-500/20'
  }
  if (adjustedPct >= 40) return {
    stars: 2, label: 'Improvement Necessary',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-500/10',
    borderColor: 'border-orange-200 dark:border-orange-500/20'
  }
  if (adjustedPct >= 20) return {
    stars: 1, label: 'Major Improvement Necessary',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/20'
  }
  return {
    stars: 0, label: 'Urgent Improvement Necessary',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/20'
  }
}

function StarDisplay({ rating, size = 'md' }: { rating: StarRatingInfo; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < rating.stars
              ? `${rating.color} fill-current`
              : 'text-gray-300 dark:text-white/20'
          }`}
        />
      ))}
    </div>
  )
}

export default function EHOReadinessDashboard({ siteId }: EHOReadinessDashboardProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [incidentCount, setIncidentCount] = useState(0)
  const [riddorCount, setRiddorCount] = useState(0)

  useEffect(() => {
    if (!siteId) {
      setCategories([])
      return
    }
    loadReadinessData()
  }, [siteId])

  async function loadReadinessData() {
    if (!siteId) return

    setLoading(true)
    try {
      // Get company_id from site first
      const { data: siteData } = await supabase
        .from('sites')
        .select('company_id')
        .eq('id', siteId)
        .single()

      const companyId = siteData?.company_id

      if (!companyId) {
        console.error('Could not find company_id for site')
        setLoading(false)
        return
      }

      // Fetch all data in parallel
      const [
        documentsResult,
        coshhResult,
        riskAssessmentsResult,
        trainingResult,
        patResult,
        templatesResult,
        completionsResult,
        tempLogsResult,
        incidentsResult
      ] = await Promise.all([
        // Global documents (policies, certificates, etc.)
        supabase
          .from('global_documents')
          .select('category, name, expiry_date, is_active')
          .eq('company_id', companyId)
          .eq('is_active', true),

        // COSHH data sheets
        supabase
          .from('coshh_data_sheets')
          .select('product_name, expiry_date, status')
          .eq('company_id', companyId)
          .eq('status', 'Active'),

        // Risk assessments
        supabase
          .from('risk_assessments')
          .select('template_type, title, next_review_date, status, site_id')
          .eq('company_id', companyId)
          .eq('status', 'Published'),

        // Training records
        supabase
          .from('training_bookings')
          .select('course, status, site_id')
          .eq('site_id', siteId),

        // PAT appliances - filter by both site_id AND company_id to prevent cross-referencing
        supabase
          .from('pat_appliances')
          .select('id, name, site_id, company_id, has_current_pat_label')
          .eq('site_id', siteId)
          .eq('company_id', companyId),

        // Task templates (for checklists)
        supabase
          .from('task_templates')
          .select('category, name, slug, is_active')
          .or(`company_id.is.null,company_id.eq.${companyId}`)
          .eq('is_active', true),

        // Task completions (last 30 days)
        supabase
          .from('task_completion_records')
          .select('template_id, task_templates!inner(category, name), completed_at')
          .eq('site_id', siteId)
          .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Temperature logs (last 30 days)
        supabase
          .from('temperature_logs')
          .select('id, recorded_at')
          .eq('site_id', siteId)
          .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Incidents - fetch all (EHO wants to see you have a logging system, not just recent ones)
        supabase
          .from('incidents')
          .select('id, incident_type, riddor_reportable, reported_date, severity, status')
          .eq('site_id', siteId)
          .order('reported_date', { ascending: false })
      ])

      const documents = documentsResult.data || []
      const coshhSheets = coshhResult.data || []
      const riskAssessments = riskAssessmentsResult.data || []
      const training = trainingResult.data || []
      const patAppliancesRaw = patResult.data || []
      const templates = templatesResult.data || []
      const completions = completionsResult.data || []
      const tempLogs = tempLogsResult.data || []
      const incidents = incidentsResult.data || []

      // Validate PAT appliances - ensure all belong to correct site and company
      const patAppliances = patAppliancesRaw.filter((appliance: any) => {
        const isValid = appliance.site_id === siteId && appliance.company_id === companyId
        if (!isValid) {
          console.warn(`⚠️ PAT appliance ${appliance.id} (${appliance.name}) has mismatched site_id or company_id. Expected site: ${siteId}, company: ${companyId}, Got site: ${appliance.site_id}, company: ${appliance.company_id}`)
        }
        return isValid
      })

      // Log validation summary
      if (patAppliancesRaw.length > 0) {
        const validCount = patAppliances.length
        const invalidCount = patAppliancesRaw.length - validCount
        if (invalidCount > 0) {
          console.error(`❌ PAT Validation: ${invalidCount} appliance(s) filtered out due to site/company mismatch`)
        }
        console.log(`✅ PAT Records: ${validCount} valid appliance(s) found for site ${siteId} (company ${companyId})`)
      }

      // Store incident counts for display
      setIncidentCount(incidents.length)
      setRiddorCount(incidents.filter((i: any) => i.riddor_reportable).length)

      // Check each requirement against actual data
      const requirements: Requirement[] = EHO_REQUIREMENTS.map(req => {
        let found = false
        let foundDetails: string | undefined
        let expiryDate: string | null = null
        let status: 'valid' | 'expired' | 'expiring_soon' | 'missing' = 'missing'

        switch (req.evidenceType) {
          case 'document':
            // Check global_documents - match by exact name (standardized) or fuzzy match
            const docMatch = documents.find(d => {
              const docName = d.name.toLowerCase().trim()
              const reqName = req.name.toLowerCase().trim()
              // Exact match (preferred - when uploaded with document type selector)
              if (docName === reqName) return true
              // Fuzzy match for backwards compatibility
              if (docName.includes(reqName.substring(0, Math.min(15, reqName.length))) ||
                  reqName.includes(docName.substring(0, Math.min(15, docName.length)))) {
                return true
              }
              return false
            })
            if (docMatch) {
              found = true
              foundDetails = docMatch.name
              expiryDate = docMatch.expiry_date
              if (expiryDate) {
                const expDate = new Date(expiryDate)
                const now = new Date()
                const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                if (daysUntilExpiry < 0) status = 'expired'
                else if (daysUntilExpiry < 30) status = 'expiring_soon'
                else status = 'valid'
              } else {
                status = 'valid'
              }
            }
            break

          case 'assessment':
            // Check risk_assessments
            const raMatch = riskAssessments.find(ra => {
              if (req.id === 'coshh-ra') return ra.template_type === 'coshh'
              if (req.id === 'fire-ra') return ra.title.toLowerCase().includes('fire')
              if (req.id === 'manual-handling-ra') return ra.title.toLowerCase().includes('manual')
              if (req.id === 'general-ra') return ra.template_type === 'general'
              return false
            })
            if (raMatch) {
              found = true
              foundDetails = raMatch.title
              expiryDate = raMatch.next_review_date
              if (expiryDate) {
                const expDate = new Date(expiryDate)
                const now = new Date()
                const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                if (daysUntilExpiry < 0) status = 'expired'
                else if (daysUntilExpiry < 30) status = 'expiring_soon'
                else status = 'valid'
              } else {
                status = 'valid'
              }
            }
            break

          case 'training':
            // Check training_bookings
            const trainingMatch = training.find(t => {
              const course = (t.course || '').toLowerCase()
              if (req.id === 'food-hygiene-training') return course.includes('food') || course.includes('hygiene')
              if (req.id === 'allergen-training') return course.includes('allergen')
              if (req.id === 'hs-training') return course.includes('safety') || course.includes('health')
              if (req.id === 'fire-training') return course.includes('fire')
              if (req.id === 'first-aid') return course.includes('first aid')
              return false
            })
            if (trainingMatch) {
              found = true
              foundDetails = `${trainingMatch.course} (${training.length} records)`
              status = 'valid'
            }
            break

          case 'record':
            // Check specific records
            if (req.id === 'temp-logs') {
              found = tempLogs.length > 0
              foundDetails = found ? `${tempLogs.length} temperature logs (30 days)` : undefined
              status = found ? 'valid' : 'missing'
            } else if (req.id === 'accident-book') {
              found = incidents.length > 0
              foundDetails = found ? `${incidents.length} incident records` : undefined
              status = found ? 'valid' : 'missing'
            } else if (req.id === 'riddor-records') {
              const riddorIncidents = incidents.filter(i => i.riddor_reportable)
              found = riddorIncidents.length > 0
              foundDetails = found ? `${riddorIncidents.length} RIDDOR reportable incidents` : undefined
              status = found ? 'valid' : 'missing'
            } else if (req.id === 'pat-tests') {
              // Count appliances with current PAT labels - already validated for correct site/company
              const patTested = patAppliances.filter((p: any) => {
                // Double-check site/company match as safety measure
                if (p.site_id !== siteId || p.company_id !== companyId) {
                  console.warn(`⚠️ PAT appliance ${p.id} failed validation check`)
                  return false
                }
                return p.has_current_pat_label === true
              })
              found = patTested.length > 0
              const totalAppliances = patAppliances.length
              foundDetails = found
                ? `${patTested.length} of ${totalAppliances} appliances with PAT labels`
                : totalAppliances > 0
                  ? `${totalAppliances} appliances found but none have current PAT labels`
                  : undefined
              status = found ? 'valid' : 'missing'
            }
            break

          case 'completion':
            // Check task completions
            const completionMatch = completions.find(c => {
              const name = (c.task_templates as any)?.name?.toLowerCase() || ''
              if (req.id === 'fridge-temp') return name.includes('fridge') || name.includes('freezer') || name.includes('temperature')
              if (req.id === 'hot-holding') return name.includes('hot holding')
              if (req.id === 'opening-checklist') return name.includes('opening')
              if (req.id === 'closing-checklist') return name.includes('closing')
              if (req.id === 'fire-alarm-tests') return name.includes('fire alarm')
              if (req.id === 'fire-extinguisher') return name.includes('fire extinguisher')
              if (req.id === 'emergency-exits') return name.includes('emergency') || name.includes('exit')
              if (req.id === 'emergency-lighting') return name.includes('emergency lighting')
              if (req.id === 'cleaning-records') return (c.task_templates as any)?.category === 'cleaning'
              if (req.id === 'pest-control') return name.includes('pest')
              return false
            })
            if (completionMatch) {
              found = true
              const categoryCompletions = completions.filter(c => {
                const cat = (c.task_templates as any)?.category
                const name = (c.task_templates as any)?.name?.toLowerCase() || ''
                if (req.id === 'cleaning-records') return cat === 'cleaning'
                if (req.id === 'pest-control') return name.includes('pest')
                return false
              })
              foundDetails = categoryCompletions.length > 0
                ? `${categoryCompletions.length} completions (30 days)`
                : 'Recent completion found'
              status = 'valid'
            }
            break

          case 'template':
            // Check if template exists
            const templateMatch = templates.find(t => {
              const name = t.name.toLowerCase()
              if (req.id === 'cleaning-schedule') return t.category === 'cleaning'
              return name.includes(req.name.toLowerCase().substring(0, 10))
            })
            if (templateMatch) {
              found = true
              foundDetails = templateMatch.name
              status = 'valid'
            }
            break
        }

        // Special checks for COSHH
        if (req.id === 'coshh-register' || req.id === 'coshh-sheets') {
          if (coshhSheets.length > 0) {
            found = true
            foundDetails = `${coshhSheets.length} COSHH data sheets`
            status = 'valid'
          }
        }

        return {
          ...req,
          found,
          foundDetails,
          expiryDate,
          status
        }
      })

      // Group by category
      const categoryMap = new Map<string, Requirement[]>()
      requirements.forEach(req => {
        if (!categoryMap.has(req.category)) {
          categoryMap.set(req.category, [])
        }
        categoryMap.get(req.category)!.push(req)
      })

      // Create category groups with icons
      const categoryGroups: CategoryGroup[] = Array.from(categoryMap.entries()).map(([category, reqs]) => {
        const completed = reqs.filter(r => r.found && r.status !== 'expired').length
        const completionRate = Math.round((completed / reqs.length) * 100)

        let icon: React.ReactNode
        switch (category) {
          case 'Food Safety':
            icon = <Shield className="w-5 h-5" />
            break
          case 'Health & Safety':
            icon = <Users className="w-5 h-5" />
            break
          case 'Fire Safety':
            icon = <Flame className="w-5 h-5" />
            break
          case 'Training':
            icon = <FileCheck className="w-5 h-5" />
            break
          case 'Cleaning':
            icon = <Sparkles className="w-5 h-5" />
            break
          case 'Equipment':
            icon = <Building2 className="w-5 h-5" />
            break
          case 'Legal':
            icon = <FileText className="w-5 h-5" />
            break
          case 'Compliance':
            icon = <ClipboardCheck className="w-5 h-5" />
            break
          default:
            icon = <FileText className="w-5 h-5" />
        }

        let status: 'complete' | 'partial' | 'missing'
        if (completionRate === 100) status = 'complete'
        else if (completionRate > 0) status = 'partial'
        else status = 'missing'

        return {
          category,
          icon,
          requirements: reqs,
          completionRate,
          status
        }
      })

      // Sort by completion rate (lowest first - most urgent)
      categoryGroups.sort((a, b) => a.completionRate - b.completionRate)

      setCategories(categoryGroups)
    } catch (error) {
      console.error('Error loading readiness data:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(category: string) {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  if (!siteId) {
    return (
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-6">
        <p className="text-theme-tertiary text-center">Please select a site to view EHO readiness analysis</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#D37E91] dark:text-[#D37E91] animate-spin" />
          <span className="ml-3 text-theme-tertiary">Analyzing compliance readiness...</span>
        </div>
      </div>
    )
  }

  const overallCompletion = categories.length > 0
    ? Math.round(categories.reduce((sum, cat) => sum + cat.completionRate, 0) / categories.length)
    : 0

  const totalRequirements = categories.reduce((sum, cat) => sum + cat.requirements.length, 0)
  const completedRequirements = categories.reduce((sum, cat) =>
    sum + cat.requirements.filter(r => r.found && r.status !== 'expired').length, 0
  )
  const missingRequirements = totalRequirements - completedRequirements

  return (
    <div className="space-y-4">
      {/* Incidents Summary Card */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D37E91]/10 dark:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-primary">Incidents & Accidents</h3>
              <p className="text-sm text-theme-tertiary">Track all incidents, complaints, and RIDDOR reports</p>
            </div>
          </div>
          <Link
            href="/dashboard/incidents/storage"
            className="flex items-center gap-2 px-4 py-2 bg-[#D37E91]/10 dark:bg-[#D37E91]/25 hover:bg-[#D37E91]/10 dark:hover:bg-[#D37E91]/35 border border-[#D37E91] dark:border-[#D37E91]/40 rounded-lg text-[#D37E91] dark:text-[#D37E91] transition-colors"
          >
            <span className="text-sm font-medium">View Incident Log</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
 <div className="bg-theme-surface ] rounded-lg p-3">
            <div className="text-xs text-theme-tertiary mb-1">Total Incidents</div>
            <div className={`text-xl font-bold ${incidentCount === 0 ? 'text-theme-tertiary' : 'text-theme-primary'}`}>
              {incidentCount === 0 ? 'None reported' : incidentCount}
            </div>
            {incidentCount === 0 && (
              <div className="text-xs text-theme-tertiary mt-1">This will be reflected in your readiness score</div>
            )}
          </div>
 <div className="bg-theme-surface ] rounded-lg p-3">
            <div className="text-xs text-theme-tertiary mb-1">RIDDOR Reportable</div>
            <div className={`text-xl font-bold ${riddorCount === 0 ? 'text-theme-tertiary' : 'text-orange-600 dark:text-orange-400'}`}>
              {riddorCount === 0 ? 'None' : riddorCount}
            </div>
          </div>
 <div className="bg-theme-surface ] rounded-lg p-3">
            <div className="text-xs text-theme-tertiary mb-1">Status</div>
            <div className={`text-sm font-medium ${
              incidentCount === 0
                ? 'text-theme-tertiary'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {incidentCount === 0
                ? 'No incidents recorded'
                : 'Incidents logged'}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Summary with Star Rating */}
      {(() => {
        const allReqs = categories.flatMap(c => c.requirements)
        const expiringCount = allReqs.filter(r => r.status === 'expiring_soon').length
        const expiredCount = allReqs.filter(r => r.status === 'expired').length
        const overallRating = getStarRating(overallCompletion, expiringCount, expiredCount)

        return (
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-theme-primary">EHO Readiness Analysis</h2>
                <p className="text-sm text-theme-tertiary mt-1">
                  Comprehensive compliance checker - know exactly where you stand when an EHO arrives
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${
                  overallCompletion === 100 ? 'text-green-600 dark:text-green-400' :
                  overallCompletion >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {overallCompletion}%
                </div>
                <div className="text-sm text-theme-tertiary">Complete</div>
              </div>
            </div>

            {/* Star Rating Banner */}
            <div className={`rounded-xl p-5 mb-4 border ${overallRating.bgColor} ${overallRating.borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-theme-tertiary uppercase tracking-wider mb-1">Estimated FHRS Paperwork Score</div>
                  <div className="flex items-center gap-3">
                    <StarDisplay rating={overallRating} size="lg" />
                    <span className={`text-lg font-bold ${overallRating.color}`}>{overallRating.stars}/5</span>
                  </div>
                  <div className={`text-sm font-medium mt-1.5 ${overallRating.color}`}>
                    {overallRating.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-theme-tertiary mb-1">Based on</div>
                  <div className="text-sm text-theme-secondary">
                    {completedRequirements}/{totalRequirements} requirements
                  </div>
                  {(expiringCount > 0 || expiredCount > 0) && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {expiredCount > 0 && `${expiredCount} expired`}
                      {expiredCount > 0 && expiringCount > 0 && ' · '}
                      {expiringCount > 0 && `${expiringCount} expiring soon`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
 <div className="bg-theme-surface ] rounded-lg p-3">
                <div className="text-xs text-theme-tertiary mb-1">Total Requirements</div>
                <div className="text-xl font-bold text-theme-primary">{totalRequirements}</div>
              </div>
 <div className="bg-theme-surface ] rounded-lg p-3">
                <div className="text-xs text-theme-tertiary mb-1">Completed</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{completedRequirements}</div>
              </div>
 <div className="bg-theme-surface ] rounded-lg p-3">
                <div className="text-xs text-theme-tertiary mb-1">Missing</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{missingRequirements}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Category Breakdown */}
      <div className="space-y-3">
        {categories.map((categoryGroup) => {
          const isExpanded = expandedCategories.has(categoryGroup.category)
          const missing = categoryGroup.requirements.filter(r => !r.found || r.status === 'expired')
          const expiringSoon = categoryGroup.requirements.filter(r => r.status === 'expiring_soon')
          const expiredInCat = categoryGroup.requirements.filter(r => r.status === 'expired').length
          const expiringInCat = expiringSoon.length
          const catRating = getStarRating(categoryGroup.completionRate, expiringInCat, expiredInCat)

          return (
            <div
              key={categoryGroup.category}
              className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl overflow-hidden"
            >
              <div className="flex items-center">
                <button
                  onClick={() => toggleCategory(categoryGroup.category)}
                  className="flex-1 px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      categoryGroup.status === 'complete' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                      categoryGroup.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {categoryGroup.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-theme-primary">{categoryGroup.category}</div>
                      <div className="text-sm text-theme-tertiary">
                        {categoryGroup.requirements.filter(r => r.found && r.status !== 'expired').length} of {categoryGroup.requirements.length} requirements met
                        {expiringSoon.length > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400 ml-2">• {expiringSoon.length} expiring soon</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <StarDisplay rating={catRating} size="sm" />
                      <div className={`text-xs font-medium ${catRating.color}`}>
                        {catRating.label}
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${
                      categoryGroup.status === 'complete' ? 'text-green-600 dark:text-green-400' :
                      categoryGroup.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {categoryGroup.completionRate}%
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-theme-tertiary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-theme-tertiary" />
                    )}
                  </div>
                </button>
                {CATEGORY_LINKS[categoryGroup.category] && (
                  <Link
                    href={CATEGORY_LINKS[categoryGroup.category].href}
                    className="flex items-center gap-1.5 mr-4 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0 transition-colors bg-[#D37E91]/10 dark:bg-[#D37E91]/15 hover:bg-[#D37E91]/10 dark:hover:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91] border border-[#D37E91]/30 dark:border-[#D37E91]/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {CATEGORY_LINKS[categoryGroup.category].label}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {isExpanded && (
                <div className="px-6 pb-4 pt-2 border-t border-theme space-y-3">
                  {/* Requirements List */}
                  {categoryGroup.requirements.map((req) => (
                    <div
                      key={req.id}
                      className={`p-3 rounded-lg border ${
                        req.found && req.status === 'valid'
                          ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30'
                          : req.status === 'expiring_soon'
                          ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30'
                          : req.status === 'expired'
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
                          : 'bg-gray-50 dark:bg-white/[0.03] border-theme'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {req.found && req.status === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            ) : req.status === 'expired' ? (
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            ) : req.status === 'expiring_soon' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-300 dark:text-red-400/50 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm font-medium ${
                              req.found && req.status === 'valid' ? 'text-theme-primary' :
                              req.status === 'expired' ? 'text-red-700 dark:text-red-300' :
                              req.status === 'expiring_soon' ? 'text-yellow-700 dark:text-yellow-300' :
                              'text-theme-tertiary'
                            }`}>
                              {req.name}
                            </span>
                            {req.required && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded">Required</span>
                            )}
                          </div>
                          {req.foundDetails && (
                            <div className="text-xs text-theme-tertiary mt-1 ml-6">
                              Found: {req.foundDetails}
                              {req.expiryDate && (
                                <span className="ml-2">
                                  {req.status === 'expired' && '• Expired'}
                                  {req.status === 'expiring_soon' && '• Expires soon'}
                                </span>
                              )}
                            </div>
                          )}
                          {!req.found && (
                            <div className="text-xs text-red-500 dark:text-red-400/70 mt-1 ml-6">
                              Missing • {req.frequency || 'Required'}
                            </div>
                          )}
                        </div>
                        {REQUIREMENT_LINKS[req.id] && (
                          <Link
                            href={REQUIREMENT_LINKS[req.id].href}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0 transition-colors bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-theme-secondary border border-theme"
                          >
                            {REQUIREMENT_LINKS[req.id].label}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
