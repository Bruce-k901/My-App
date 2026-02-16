'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, 
  Star, Edit, Trash2, Send, ExternalLink, Download, Briefcase
} from '@/components/ui/icons'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'
import SendOfferModal from '@/components/recruitment/SendOfferModal'
import EditOfferModal from '@/components/recruitment/EditOfferModal'
import OffersManagementModal from '@/components/recruitment/OffersManagementModal'
import ScheduleInterviewModal from '@/components/recruitment/ScheduleInterviewModal'
import ScheduleTrialModal from '@/components/recruitment/ScheduleTrialModal'
import ProgressApplicationModal from '@/components/recruitment/ProgressApplicationModal'
// import EditTrialModal from '@/components/recruitment/EditTrialModal' // TODO: Create this component

type Candidate = {
  id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  source: string | null
  cv_file_path: string | null
  cover_letter: string | null
  linkedin_url: string | null
  overall_status: string
  tags: string[] | null
  internal_notes: string | null
  created_at: string
}

type Application = {
  id: string
  job_id: string
  status: string
  applied_at: string
  interview_scheduled_at: string | null
  interview_completed_at: string | null
  interview_confirmation_status: 'pending' | 'confirmed' | 'declined' | 'rescheduled' | null
  interview_confirmation_at: string | null
  interview_reschedule_reason: string | null
  interview_notes: string | null
  interview_rating: number | null
  trial_scheduled_at: string | null
  trial_completed_at: string | null
  trial_confirmation_status: 'pending' | 'confirmed' | 'declined' | 'rescheduled' | null
  trial_confirmation_at: string | null
  trial_reschedule_reason: string | null
  trial_notes: string | null
  status_history: Array<{
    status: string
    from_status: string
    changed_at: string
    changed_by: string | null
    notes: string | null
  }> | null
  job: {
    title: string
    boh_foh: string
    pay_type: string
  }
}

type OfferLetter = {
  id: string
  application_id: string
  status: string
  start_date: string
  pay_rate: number
  pay_frequency: string
  contract_type: string | null
  contract_hours: number | null
  offer_token: string
  created_at: string
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
}

export default function CandidateProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAppContext()
  const companyId = profile?.company_id
  const candidateId = params.id as string

  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [offersByApplication, setOffersByApplication] = useState<Map<string, OfferLetter[]>>(new Map())
  
  // Edit mode
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Modals
  const [showSendOffer, setShowSendOffer] = useState(false)
  const [showEditOffer, setShowEditOffer] = useState(false)
  const [showOffersManagement, setShowOffersManagement] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [showScheduleInterview, setShowScheduleInterview] = useState(false)
  const [showScheduleTrial, setShowScheduleTrial] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showEditTrialModal, setShowEditTrialModal] = useState(false)
  const [progressMode, setProgressMode] = useState<'interview' | 'trial' | 'reject'>('interview')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const load = async () => {
    if (!companyId || !candidateId) return

    setLoading(true)
    try {
      // Load candidate
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .eq('company_id', companyId)
        .single()

      if (candidateError) throw candidateError
      setCandidate(candidateData)
      setNotes(candidateData.internal_notes || '')

      // Load applications with job details, trial site info, and status history
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(title, boh_foh, pay_type),
          sites!trial_site_id(name)
        `)
        .eq('candidate_id', candidateId)
        .order('applied_at', { ascending: false })

      if (appsError) throw appsError
      const apps = (appsData || []) as any
      setApplications(apps)

      // Load offers for all applications
      await loadOffersForApplications(apps)
    } catch (error: any) {
      console.error('Failed to load candidate:', error)
      toast.error('Failed to load candidate')
    } finally {
      setLoading(false)
    }
  }

  const loadOffersForApplications = async (apps: any[]) => {
    if (!companyId) return

    try {
      const applicationIds = apps.map(app => app.id)
      if (applicationIds.length === 0) return

      // Try to load offers for all applications
      const { data: offers, error: offersError } = await supabase
        .from('offer_letters')
        .select('*')
        .in('application_id', applicationIds)
        .order('created_at', { ascending: false })

      if (offersError) {
        console.error('Error loading offers:', offersError)
        // Don't throw - just log, as RLS might be blocking
        if (offersError.code === 'PGRST116' || offersError.message?.includes('406')) {
          console.warn('RLS policy blocking offer access. Run fix_offer_letters_rls.sql')
        }
        return
      }

      // Group offers by application_id
      const offersMap = new Map<string, OfferLetter[]>()
      if (offers) {
        offers.forEach((offer: any) => {
          const appId = offer.application_id
          if (!offersMap.has(appId)) {
            offersMap.set(appId, [])
          }
          offersMap.get(appId)!.push(offer as OfferLetter)
        })
      }

      setOffersByApplication(offersMap)
    } catch (error) {
      console.error('Failed to load offers:', error)
    }
  }

  useEffect(() => {
    load()
    
    // Set up real-time subscription for application updates
    if (!companyId || !candidateId) return
    
    const channel = supabase
      .channel(`candidate-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          console.log('Application updated:', payload)
          
          // Show notification based on what changed
          const newData = payload.new as any
          const oldData = payload.old as any
          
          // Check if confirmation status changed
          if (newData.interview_confirmation_status !== oldData.interview_confirmation_status) {
            if (newData.interview_confirmation_status === 'confirmed') {
              toast.success('🎉 Candidate confirmed interview!', {
                description: 'The candidate has confirmed their attendance.'
              })
            } else if (newData.interview_confirmation_status === 'declined') {
              toast.error('Candidate declined interview', {
                description: 'The candidate has declined the interview.'
              })
            } else if (newData.interview_confirmation_status === 'rescheduled') {
              toast.info('Candidate requested changes', {
                description: 'The candidate has requested to reschedule.'
              })
            }
          }
          
          if (newData.trial_confirmation_status !== oldData.trial_confirmation_status) {
            if (newData.trial_confirmation_status === 'confirmed') {
              toast.success('🎉 Candidate confirmed trial shift!', {
                description: 'The candidate has confirmed their attendance.'
              })
            } else if (newData.trial_confirmation_status === 'declined') {
              toast.error('Candidate declined trial shift', {
                description: 'The candidate has declined the trial shift.'
              })
            } else if (newData.trial_confirmation_status === 'rescheduled') {
              toast.info('Candidate requested changes', {
                description: 'The candidate has requested to reschedule.'
              })
            }
          }
          
          if (newData.status !== oldData.status && newData.status === 'accepted') {
            toast.success('🌟 Candidate accepted job offer!', {
              description: 'The candidate has accepted the offer.'
            })
          } else if (newData.status !== oldData.status && newData.status === 'rejected') {
            toast.error('Candidate declined job offer', {
              description: 'The candidate has declined the offer.'
            })
          }
          
          // Reload applications
          load()
        }
      )
      .subscribe()
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, candidateId])

  const handleSaveNotes = async () => {
    if (!candidateId) return

    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ internal_notes: notes.trim() || null })
        .eq('id', candidateId)

      if (error) throw error

      toast.success('Notes saved')
      setEditingNotes(false)
      await load()
    } catch (error: any) {
      console.error('Failed to save notes:', error)
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase.rpc('update_application_status', {
        p_application_id: applicationId,
        p_new_status: newStatus,
        p_changed_by: profile?.id,
        p_notes: null,
      })

      if (error) throw error

      toast.success('Status updated')
      await load()
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      applied: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      screening: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      interview: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      trial: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      offer: 'bg-module-fg/[0.15] text-module-fg border-module-fg/[0.30]',
      accepted: 'bg-green-500/10 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    }
    return (
      <span className={`px-2 py-1 text-xs rounded border ${styles[status] || styles.applied}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-theme-primary/40 animate-spin" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <div className="text-theme-primary/60 text-center">Candidate not found</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/people/recruitment/candidates"
          className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-theme text-theme-primary/80"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-theme-primary">{candidate.full_name}</h1>
          <p className="text-sm text-theme-primary/60 mt-1">
            Applied {new Date(candidate.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => window.open(`mailto:${candidate.email}`, '_blank')}
          className="px-4 py-2 rounded-lg text-sm bg-transparent text-blue-600 dark:text-blue-400 border border-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Send Email
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Candidate Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-theme-primary font-semibold mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-theme-primary/40 flex-shrink-0" />
                <a href={`mailto:${candidate.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {candidate.email}
                </a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-theme-primary/40 flex-shrink-0" />
                  <a href={`tel:${candidate.phone}`} className="text-theme-primary/80">
                    {candidate.phone}
                  </a>
                </div>
              )}
              {candidate.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-theme-primary/40 flex-shrink-0" />
                  <span className="text-theme-primary/80">{candidate.address}</span>
                </div>
              )}
              {candidate.linkedin_url && (
                <div className="flex items-center gap-3 text-sm">
                  <ExternalLink className="w-4 h-4 text-theme-primary/40 flex-shrink-0" />
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          {candidate.cover_letter && (
            <div className="bg-theme-surface border border-theme rounded-xl p-6">
              <h2 className="text-theme-primary font-semibold mb-3">Cover Letter</h2>
              <p className="text-theme-primary/70 text-sm whitespace-pre-wrap">{candidate.cover_letter}</p>
            </div>
          )}

          {/* Applications */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <h2 className="text-theme-primary font-semibold mb-4">
              Applications ({applications.length})
            </h2>
            {applications.length === 0 ? (
              <div className="text-theme-primary/40 text-sm text-center py-4">
                No applications yet
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-theme-primary font-medium text-sm mb-1">
                          {app.job.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {app.job.boh_foh}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            {app.job.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>

                    {/* Interview Confirmation Status */}
                    {app.interview_scheduled_at && app.status === 'interview' && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs text-theme-primary/60">
                            📅 Interview: {new Date(app.interview_scheduled_at).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        {/* Confirmation Status */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-theme-primary/50">Attendance:</span>
                          {!app.interview_confirmation_status || app.interview_confirmation_status === 'pending' ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        interview_confirmation_status: 'confirmed',
                                        interview_confirmation_at: new Date().toISOString()
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.success('Marked as confirmed')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-module-fg/10"
                              >
                                ✓ Confirmed
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        interview_confirmation_status: 'declined',
                                        interview_confirmation_at: new Date().toISOString()
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Marked as declined')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              >
                                ✗ Declined
                              </button>
                              <button
                                onClick={async () => {
                                  const reason = prompt('Why does it need to be rescheduled?')
                                  if (!reason) return
                                  
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        interview_confirmation_status: 'rescheduled',
                                        interview_confirmation_at: new Date().toISOString(),
                                        interview_reschedule_reason: reason
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Marked for rescheduling')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                              >
                                🔄 Reschedule
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                app.interview_confirmation_status === 'confirmed' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : app.interview_confirmation_status === 'declined'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {app.interview_confirmation_status === 'confirmed' && '✓ Confirmed'}
                                {app.interview_confirmation_status === 'declined' && '✗ Declined'}
                                {app.interview_confirmation_status === 'rescheduled' && '🔄 Needs Reschedule'}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        interview_confirmation_status: 'pending',
                                        interview_confirmation_at: null,
                                        interview_reschedule_reason: null
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Reset to pending')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to reset')
                                  }
                                }}
                                className="text-xs text-theme-primary/40 hover:text-theme-primary dark:hover:text-theme-tertiary underline"
                              >
                                reset
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {app.interview_reschedule_reason && (
                          <div className="mt-2 text-xs text-amber-400/70">
                            Reason: {app.interview_reschedule_reason}
                          </div>
                        )}
                        
                        {/* Resend Interview Invitation Button */}
                        <button
                          onClick={async () => {
                            try {
                              // Get confirmation token
                              const { data: appData } = await supabase
                                .from('applications')
                                .select('confirmation_token')
                                .eq('id', app.id)
                                .single()

                              const response = await fetch('/api/recruitment/send-interview-invite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  candidateEmail: candidate.email,
                                  candidateName: candidate.full_name,
                                  jobTitle: app.job.title,
                                  companyId,
                                  interviewDate: app.interview_scheduled_at,
                                  interviewType: 'In-Person',
                                  location: 'Company Office',
                                  applicationId: app.id,
                                  confirmationToken: appData?.confirmation_token,
                                }),
                              })

                              if (response.ok) {
                                toast.success('Interview invitation resent!')
                              } else {
                                throw new Error('Failed to send')
                              }
                            } catch (error) {
                              console.error('Failed to resend:', error)
                              toast.error('Failed to resend invitation')
                            }
                          }}
                          className="mt-3 w-full px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-module-fg/10 flex items-center justify-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Resend Interview Invitation
                        </button>
                      </div>
                    )}

                    {/* Trial Confirmation Status */}
                    {app.trial_scheduled_at && app.status === 'trial' && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs text-theme-primary/60">
                            👔 Trial: {new Date(app.trial_scheduled_at).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        {/* Trial Details */}
                        <div className="space-y-1 mb-2 text-xs">
                          {(app as any).sites?.name && (
                            <div className="text-theme-primary/50">
                              📍 Site: <span className="text-theme-primary/70">{(app as any).sites.name}</span>
                            </div>
                          )}
                          {(app as any).trial_contact_person && (
                            <div className="text-theme-primary/50">
                              👤 Contact: <span className="text-theme-primary/70">{(app as any).trial_contact_person}</span>
                            </div>
                          )}
                          {(app as any).trial_duration_hours && (
                            <div className="text-theme-primary/50">
                              ⏱️ Duration: <span className="text-theme-primary/70">{(app as any).trial_duration_hours} hours</span>
                            </div>
                          )}
                          {!(app as any).sites?.name && !(app as any).trial_contact_person && (
                            <div className="text-amber-400/60 text-xs">
                              ⚠️ Trial details incomplete - click Edit to add site and contact
                            </div>
                          )}
                        </div>
                        
                        {/* Confirmation Status */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-theme-primary/50">Attendance:</span>
                          {!app.trial_confirmation_status || app.trial_confirmation_status === 'pending' ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        trial_confirmation_status: 'confirmed',
                                        trial_confirmation_at: new Date().toISOString()
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.success('Marked as confirmed')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-module-fg/10"
                              >
                                ✓ Confirmed
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        trial_confirmation_status: 'declined',
                                        trial_confirmation_at: new Date().toISOString()
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Marked as declined')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              >
                                ✗ Declined
                              </button>
                              <button
                                onClick={async () => {
                                  const reason = prompt('Why does it need to be rescheduled?')
                                  if (!reason) return
                                  
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        trial_confirmation_status: 'rescheduled',
                                        trial_confirmation_at: new Date().toISOString(),
                                        trial_reschedule_reason: reason
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Marked for rescheduling')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to update')
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                              >
                                🔄 Reschedule
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                app.trial_confirmation_status === 'confirmed' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : app.trial_confirmation_status === 'declined'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {app.trial_confirmation_status === 'confirmed' && '✓ Confirmed'}
                                {app.trial_confirmation_status === 'declined' && '✗ Declined'}
                                {app.trial_confirmation_status === 'rescheduled' && '🔄 Needs Reschedule'}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('applications')
                                      .update({
                                        trial_confirmation_status: 'pending',
                                        trial_confirmation_at: null,
                                        trial_reschedule_reason: null
                                      })
                                      .eq('id', app.id)
                                    
                                    if (error) throw error
                                    toast.info('Reset to pending')
                                    load()
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('Failed to reset')
                                  }
                                }}
                                className="text-xs text-theme-primary/40 hover:text-theme-primary dark:hover:text-theme-tertiary underline"
                              >
                                reset
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {app.trial_reschedule_reason && (
                          <div className="mt-2 text-xs text-amber-400/70">
                            Reason: {app.trial_reschedule_reason}
                          </div>
                        )}
                        
                        {/* Edit Trial Button */}
                        <button
                          onClick={() => {
                            setSelectedApplication(app)
                            setShowEditTrialModal(true)
                          }}
                          className="mt-3 w-full px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Edit Trial Details
                        </button>

                        {/* Resend Trial Invitation Button */}
                        <button
                          onClick={async () => {
                            try {
                              // Get full application details including trial info
                              const { data: appData } = await supabase
                                .from('applications')
                                .select(`
                                  confirmation_token,
                                  trial_scheduled_at,
                                  trial_site_id,
                                  trial_contact_person,
                                  trial_location_notes,
                                  trial_what_to_bring,
                                  trial_duration_hours,
                                  sites!trial_site_id (
                                    name
                                  )
                                `)
                                .eq('id', app.id)
                                .single()

                              if (!appData) {
                                toast.error('Could not load trial details')
                                return
                              }

                              const trialDate = new Date(appData.trial_scheduled_at!)
                              const siteName = (appData.sites as any)?.name || 'Company Location'
                              const contactPerson = appData.trial_contact_person || 'the manager'
                              const duration = appData.trial_duration_hours || 4
                              
                              const response = await fetch('/api/recruitment/send-trial-invite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  candidateEmail: candidate.email,
                                  candidateName: candidate.full_name,
                                  jobTitle: app.job.title,
                                  companyId,
                                  trialDate: trialDate.toISOString().split('T')[0],
                                  trialTime: trialDate.toTimeString().slice(0, 5),
                                  trialLocation: siteName,
                                  trialDuration: `${duration} hours`,
                                  whatToBring: appData.trial_what_to_bring || '',
                                  additionalInfo: `${appData.trial_location_notes || ''}\n\nYou will meet ${contactPerson} on arrival.`,
                                  applicationId: app.id,
                                  confirmationToken: appData.confirmation_token,
                                }),
                              })

                              if (response.ok) {
                                toast.success('Trial invitation resent!')
                              } else {
                                throw new Error('Failed to send')
                              }
                            } catch (error) {
                              console.error('Failed to resend:', error)
                              toast.error('Failed to resend invitation')
                            }
                          }}
                          className="mt-3 w-full px-3 py-1.5 text-xs rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-module-fg/10 flex items-center justify-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Resend Trial Invitation
                        </button>
                      </div>
                    )}

                    {/* Offers Section */}
                    {(app.status === 'offer' || app.status === 'accepted' || offersByApplication.has(app.id)) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05]">
                        <h4 className="text-theme-primary/70 font-medium text-xs mb-3 uppercase tracking-wide">
                          Offer Letters
                        </h4>
                        {(() => {
                          const offers = offersByApplication.get(app.id) || []
                          
                          if (offers.length === 0) {
                            return (
                              <div className="text-theme-primary/40 text-xs p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200 dark:border-white/[0.05]">
                                No offers found. This may be due to RLS policies. Please run the SQL fix: supabase/sql/fix_offer_letters_rls.sql
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3">
                              {offers.map((offer) => (
                                <div
                                  key={offer.id}
                                  className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                          offer.status === 'accepted' 
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : offer.status === 'declined'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : offer.status === 'sent'
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            : 'bg-theme-surface-elevated0/20 text-theme-tertiary border border-gray-500/30'
                                        }`}>
                                          {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                                        </span>
                                        <span className="text-xs text-theme-primary/50">
                                          {new Date(offer.created_at).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div className="text-xs text-theme-primary/70 space-y-1">
                                        <div>
                                          <span className="text-theme-primary/50">Start Date: </span>
                                          <strong>{offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-GB') : 'Not set'}</strong>
                                        </div>
                                        <div>
                                          <span className="text-theme-primary/50">Pay Rate: </span>
                                          <strong>£{offer.pay_rate}{offer.pay_frequency === 'hourly' ? '/hr' : '/year'}</strong>
                                        </div>
                                        {offer.contract_type && (
                                          <div>
                                            <span className="text-theme-primary/50">Contract: </span>
                                            <strong>{offer.contract_type.replace('_', ' ')}{offer.contract_hours ? ` (${offer.contract_hours} hrs/week)` : ''}</strong>
                                          </div>
                                        )}
                                        {offer.accepted_at && (
                                          <div className="text-green-400 text-xs mt-1">
                                            ✓ Accepted {new Date(offer.accepted_at).toLocaleDateString('en-GB')}
                                          </div>
                                        )}
                                        {offer.declined_at && (
                                          <div className="text-red-400 text-xs mt-1">
                                            ✗ Declined {new Date(offer.declined_at).toLocaleDateString('en-GB')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <button
                                        onClick={() => {
                                          setSelectedOfferId(offer.id)
                                          setSelectedApplication(app)
                                          setShowEditOffer(true)
                                        }}
                                        className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1"
                                      >
                                        <Edit className="w-3 h-3" />
                                        Edit
                                      </button>
                                      {offer.status === 'sent' && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const { data: appData } = await supabase
                                                .from('applications')
                                                .select('confirmation_token')
                                                .eq('id', app.id)
                                                .single()

                                              const response = await fetch('/api/recruitment/send-offer-email', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  candidateEmail: candidate.email,
                                                  candidateName: candidate.full_name,
                                                  jobTitle: app.job.title,
                                                  companyId,
                                                  offerUrl: `${window.location.origin}/recruitment/offers/${offer.offer_token}`,
                                                  startDate: offer.start_date,
                                                  payRate: offer.pay_rate,
                                                  payFrequency: offer.pay_frequency,
                                                  contractType: offer.contract_type,
                                                  contractHours: offer.contract_hours,
                                                  applicationId: app.id,
                                                  confirmationToken: appData?.confirmation_token,
                                                }),
                                              })

                                              if (response.ok) {
                                                toast.success('Offer email resent!')
                                              } else {
                                                throw new Error('Failed to send')
                                              }
                                            } catch (error) {
                                              console.error('Failed to resend offer:', error)
                                              toast.error('Failed to resend offer email')
                                            }
                                          }}
                                          className="px-2 py-1 text-xs rounded bg-module-fg/[0.15] text-module-fg border border-module-fg/[0.30] hover:bg-module-fg/[0.25] flex items-center gap-1"
                                        >
                                          <Send className="w-3 h-3" />
                                          Resend
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Recruitment History Timeline */}
                    {app.status_history && app.status_history.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05]">
                        <h4 className="text-theme-primary/70 font-medium text-xs mb-3 uppercase tracking-wide">
                          Recruitment History
                        </h4>
                        <div className="space-y-3">
                          {/* Initial application */}
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                              <div className="w-0.5 h-full bg-gray-300 dark:bg-white/10 min-h-[20px]" />
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-theme-primary/80">Applied</span>
                                <span className="text-xs text-theme-primary/50">
                                  {new Date(app.applied_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-theme-primary/60">
                                Application submitted for {app.job.title}
                              </p>
                            </div>
                          </div>

                          {/* History entries */}
                          {app.status_history.map((entry, idx) => {
                            const statusLabels: Record<string, string> = {
                              applied: 'Application Received',
                              screening: 'Screening',
                              interview: 'Interview Scheduled',
                              trial: 'Trial Shift Scheduled',
                              offer: 'Offer Sent',
                              accepted: 'Offer Accepted',
                              rejected: 'Rejected',
                              withdrawn: 'Withdrawn',
                            }
                            
                            const statusColors: Record<string, string> = {
                              applied: 'bg-blue-500',
                              screening: 'bg-yellow-500',
                              interview: 'bg-purple-500',
                              trial: 'bg-orange-500',
                              offer: 'bg-module-fg',
                              accepted: 'bg-green-500',
                              rejected: 'bg-red-500',
                              withdrawn: 'bg-theme-surface-elevated0',
                            }

                            const isLast = idx === app.status_history!.length - 1
                            
                            return (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-2 h-2 rounded-full ${statusColors[entry.status] || 'bg-gray-400 dark:bg-white/40'} mt-1`} />
                                  {!isLast && <div className="w-0.5 h-full bg-gray-300 dark:bg-white/10 min-h-[20px]" />}
                                </div>
                                <div className="flex-1 pb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-theme-primary/80">
                                      {statusLabels[entry.status] || entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                    </span>
                                    <span className="text-xs text-theme-primary/50">
                                      {new Date(entry.changed_at).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {entry.from_status && entry.from_status !== 'applied' && (
                                    <p className="text-xs text-theme-primary/50 mb-1">
                                      Changed from {statusLabels[entry.from_status] || entry.from_status}
                                    </p>
                                  )}
                                  {entry.notes && (
                                    <p className="text-xs text-theme-primary/60 italic">
                                      {entry.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05] space-y-2">
                      {(app.status === 'applied' || app.status === 'screening') && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowScheduleInterview(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-green-500/10 hover:bg-module-fg/10 border border-green-500/30 text-green-400 font-medium"
                          >
                            📅 Schedule Interview
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setProgressMode('reject')
                              setShowProgressModal(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      
                      {app.status === 'interview' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setProgressMode('interview')
                              setShowProgressModal(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-blue-500/10 hover:bg-module-fg/10 border border-blue-500/30 text-blue-400 font-medium"
                          >
                            ✍️ Complete Interview
                          </button>
                          {app.interview_completed_at && (
                            <button
                              onClick={() => {
                                setSelectedApplication(app)
                                setShowScheduleTrial(true)
                              }}
                              className="w-full px-3 py-2 rounded-lg text-xs bg-purple-500/10 hover:bg-module-fg/10 border border-purple-500/30 text-purple-400 font-medium"
                            >
                              📅 Schedule Trial Shift
                            </button>
                          )}
                        </>
                      )}
                      
                      {app.status === 'trial' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setProgressMode('trial')
                              setShowProgressModal(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-purple-500/10 hover:bg-module-fg/10 border border-purple-500/30 text-purple-400 font-medium"
                          >
                            ⭐ Complete Trial
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowSendOffer(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-transparent text-blue-600 dark:text-blue-400 border border-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all font-medium"
                          >
                            💼 Send Offer
                          </button>
                        </>
                      )}
                      
                      {(app.status === 'offer' || app.status === 'accepted') && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowOffersManagement(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center justify-center gap-2 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Manage Offers
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowSendOffer(true)
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-transparent text-blue-600 dark:text-blue-400 border border-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all font-medium"
                          >
                            💼 Send New Offer
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                // Get confirmation token
                                const { data: appData } = await supabase
                                  .from('applications')
                                  .select('confirmation_token')
                                  .eq('id', app.id)
                                  .single()

                                // Get offer details - try multiple approaches
                                let offerData: any = null
                                let offerError: any = null

                                // First, try direct query
                                const { data: directOffer, error: directError } = await supabase
                                  .from('offer_letters')
                                  .select('*')
                                  .eq('application_id', app.id)
                                  .order('created_at', { ascending: false })
                                  .limit(1)
                                  .maybeSingle()

                                if (directError) {
                                  console.error('Direct offer query error:', directError)
                                  // Check if it's a 406 RLS error
                                  if (directError.code === 'PGRST116' || directError.message?.includes('406') || directError.message?.includes('Not Acceptable')) {
                                    toast.error('Permission denied. RLS policy is blocking access.')
                                    toast.error('Please run the SQL fix: supabase/sql/fix_offer_letters_rls.sql in your Supabase SQL Editor', { duration: 15000 })
                                    return
                                  }
                                  offerError = directError
                                } else {
                                  offerData = directOffer
                                }

                                // If direct query failed or returned nothing, try through application relationship
                                if (!offerData && !offerError) {
                                  try {
                                    const { data: appWithOffer, error: appOfferError } = await supabase
                                      .from('applications')
                                      .select(`
                                        id,
                                        status,
                                        offer_letters!offer_letters_application_id_fkey (
                                          id,
                                          offer_token,
                                          start_date,
                                          pay_rate,
                                          pay_frequency,
                                          contract_type,
                                          contract_hours,
                                          status,
                                          created_at
                                        )
                                      `)
                                      .eq('id', app.id)
                                      .single()

                                    if (!appOfferError && appWithOffer?.offer_letters) {
                                      const offers = Array.isArray(appWithOffer.offer_letters) 
                                        ? appWithOffer.offer_letters 
                                        : [appWithOffer.offer_letters].filter(Boolean)
                                      
                                      if (offers.length > 0) {
                                        offers.sort((a: any, b: any) => 
                                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                        )
                                        offerData = offers[0]
                                      }
                                    }
                                  } catch (relError) {
                                    console.error('Error in relationship query:', relError)
                                  }
                                }

                                if (offerError) {
                                  toast.error(`Failed to load offer: ${offerError.message}`)
                                  return
                                }

                                if (!offerData) {
                                  toast.error('No offer found for this application. Please send a new offer first.')
                                  return
                                }

                                const response = await fetch('/api/recruitment/send-offer-email', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    candidateEmail: candidate.email,
                                    candidateName: candidate.full_name,
                                    jobTitle: app.job.title,
                                    companyId,
                                    offerUrl: `${window.location.origin}/recruitment/offers/${offerData.offer_token}`,
                                    startDate: offerData.start_date,
                                    payRate: offerData.pay_rate,
                                    payFrequency: offerData.pay_frequency,
                                    contractType: offerData.contract_type,
                                    contractHours: offerData.contract_hours,
                                    applicationId: app.id,
                                    confirmationToken: appData?.confirmation_token,
                                  }),
                                })

                                if (response.ok) {
                                  toast.success('Offer email resent!')
                                } else {
                                  throw new Error('Failed to send')
                                }
                              } catch (error) {
                                console.error('Failed to resend offer:', error)
                                toast.error('Failed to resend offer email')
                              }
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg bg-module-fg/[0.15] text-module-fg border border-module-fg/[0.30] hover:bg-module-fg/[0.25] flex items-center justify-center gap-2"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Resend Offer Email
                          </button>
                        </>
                      )}
                      
                      {/* Show status for debugging */}
                      {!['applied', 'interview', 'trial', 'offer', 'accepted', 'rejected', 'withdrawn'].includes(app.status) && (
                        <div className="text-theme-primary/60 text-xs p-2">
                          Unknown status: {app.status}
                        </div>
                      )}
                    </div>

                    {/* Interview Notes */}
                    {app.interview_notes && (
                      <div className="mt-3 p-2 bg-gray-50 dark:bg-white/[0.02] rounded text-xs text-theme-primary/60">
                        <strong>Interview:</strong> {app.interview_notes}
                        {app.interview_rating && (
                          <span className="ml-2">
                            ⭐ {app.interview_rating}/5
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* CV Download */}
          {candidate.cv_file_path && (
            <div className="bg-theme-surface border border-theme rounded-xl p-4">
              <h3 className="text-theme-primary font-semibold mb-3 text-sm">CV/Resume</h3>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.storage
                      .from('recruitment_cvs')
                      .createSignedUrl(candidate.cv_file_path!, 60)

                    if (error) throw error
                    
                    if (data?.signedUrl) {
                      // Open CV in new tab
                      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
                      toast.success('CV opened in new tab')
                    }
                  } catch (error: any) {
                    console.error('CV download error:', error)
                    
                    // Check if bucket doesn't exist
                    if (error.message?.includes('Bucket not found')) {
                      toast.error('CV storage not set up yet. Please create the recruitment_cvs bucket.')
                    } else {
                      toast.error('Failed to download CV')
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-blue-600 dark:text-blue-400 border border-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CV
              </button>
              <p className="text-xs text-theme-primary/40 mt-2 text-center">
                {candidate.cv_file_path.split('/').pop()}
              </p>
            </div>
          )}

          {/* Source */}
          {candidate.source && (
            <div className="bg-theme-surface border border-theme rounded-xl p-4">
              <h3 className="text-theme-primary font-semibold mb-2 text-sm">Source</h3>
              <p className="text-theme-primary/70 text-sm">{candidate.source}</p>
            </div>
          )}

          {/* Tags */}
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <h3 className="text-theme-primary font-semibold mb-3 text-sm">Tags</h3>
            {candidate.tags && candidate.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {candidate.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-theme-primary/40 text-xs">No tags yet</p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-theme-primary font-semibold text-sm">Internal Notes</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this candidate..."
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-theme rounded-lg text-theme-primary text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex-1 px-3 py-1.5 rounded text-xs bg-module-fg/[0.20] text-module-fg border border-module-fg/[0.30] hover:bg-module-fg/[0.30] disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(candidate.internal_notes || '')
                    }}
                    className="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-white/5 text-theme-primary/70 border border-theme hover:bg-gray-200 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-theme-primary/70 text-sm whitespace-pre-wrap">
                {candidate.internal_notes || 'No notes yet'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSendOffer && selectedApplication && candidate && companyId && profile?.id && (
        <SendOfferModal
          isOpen={showSendOffer}
          onClose={() => {
            setShowSendOffer(false)
            setSelectedApplication(null)
          }}
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            job_id: selectedApplication.job_id,
            job_title: selectedApplication.job.title,
            boh_foh: selectedApplication.job.boh_foh as any,
            pay_type: selectedApplication.job.pay_type as any,
          }}
          companyId={companyId}
          managerId={profile.id}
        />
      )}

      {showOffersManagement && selectedApplication && candidate && companyId && profile?.id && (
        <OffersManagementModal
          isOpen={showOffersManagement}
          onClose={() => {
            setShowOffersManagement(false)
            setSelectedApplication(null)
          }}
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            job_id: selectedApplication.job_id,
            job_title: selectedApplication.job.title,
            boh_foh: selectedApplication.job.boh_foh as any,
            pay_type: selectedApplication.job.pay_type as any,
          }}
          companyId={companyId}
          managerId={profile.id}
          onSuccess={load}
        />
      )}

      {showEditOffer && selectedApplication && selectedOfferId && candidate && companyId && profile?.id && (
        <EditOfferModal
          isOpen={showEditOffer}
          onClose={() => {
            setShowEditOffer(false)
            setSelectedOfferId(null)
            setSelectedApplication(null)
          }}
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            job_id: selectedApplication.job_id,
            job_title: selectedApplication.job.title,
            boh_foh: selectedApplication.job.boh_foh as any,
            pay_type: selectedApplication.job.pay_type as any,
          }}
          offerId={selectedOfferId}
          companyId={companyId}
          managerId={profile.id}
          onSuccess={load}
        />
      )}

      {showScheduleInterview && selectedApplication && candidate && companyId && profile?.id && (
        <ScheduleInterviewModal
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            job_id: selectedApplication.job_id,
            job: {
              title: selectedApplication.job.title,
            },
          }}
          companyId={companyId}
          managerId={profile.id}
          onClose={() => {
            setShowScheduleInterview(false)
            setSelectedApplication(null)
          }}
          onSuccess={load}
        />
      )}

      {showScheduleTrial && selectedApplication && candidate && companyId && profile?.id && (
        <ScheduleTrialModal
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            job_id: selectedApplication.job_id,
            job: {
              title: selectedApplication.job.title,
            },
          }}
          companyId={companyId}
          managerId={profile.id}
          onClose={() => {
            setShowScheduleTrial(false)
            setSelectedApplication(null)
          }}
          onSuccess={load}
        />
      )}

      {showProgressModal && selectedApplication && candidate && companyId && profile?.id && (
        <ProgressApplicationModal
          candidate={{
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
          }}
          application={{
            id: selectedApplication.id,
            status: selectedApplication.status,
            job_id: selectedApplication.job_id,
            job: {
              title: selectedApplication.job.title,
            },
          }}
          companyId={companyId}
          managerId={profile.id}
          mode={progressMode}
          onClose={() => {
            setShowProgressModal(false)
            setSelectedApplication(null)
          }}
          onSuccess={load}
        />
      )}

      {/* TODO: Add EditTrialModal component */}
      {/* {showEditTrialModal && selectedApplication && (
        <EditTrialModal
          applicationId={selectedApplication.id}
          onClose={() => {
            setShowEditTrialModal(false)
            setSelectedApplication(null)
          }}
          onUpdate={load}
        />
      )} */}
    </div>
  )
}
