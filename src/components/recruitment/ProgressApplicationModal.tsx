'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ThumbsUp, ThumbsDown, MessageSquare, Users as UsersIcon, Calendar, Clock, MapPin, User } from '@/components/ui/icons'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import TimePicker from '@/components/ui/TimePicker'

type Props = {
  candidate: {
    id: string
    full_name: string
    email: string
  }
  application: {
    id: string
    status: string
    job_id: string
    job: {
      title: string
    }
  }
  companyId: string
  managerId: string
  mode: 'interview' | 'trial' | 'reject'
  onClose: () => void
  onSuccess: () => void
}

export default function ProgressApplicationModal({ candidate, application, companyId, managerId, mode, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false)
  const [progression, setProgression] = useState<'progress' | 'reject'>('progress')
  const [managerNotes, setManagerNotes] = useState('')
  const [teamFeedback, setTeamFeedback] = useState('')
  const [rating, setRating] = useState<number>(3)
  const [rejectionMessage, setRejectionMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  
  // Trial scheduling fields (for progressing interview to trial)
  const [trialDate, setTrialDate] = useState('')
  const [trialTime, setTrialTime] = useState('09:00')
  const [trialDuration, setTrialDuration] = useState('4')
  const [trialSiteId, setTrialSiteId] = useState('')
  const [trialContactPerson, setTrialContactPerson] = useState('')
  const [trialWhatToBring, setTrialWhatToBring] = useState('')
  const [trialAdditionalInfo, setTrialAdditionalInfo] = useState('')
  const [trialPaymentTerms, setTrialPaymentTerms] = useState<'unpaid' | 'paid' | 'paid_if_hired'>('unpaid')
  const [trialPaymentRate, setTrialPaymentRate] = useState('')
  const [trialPaymentNotes, setTrialPaymentNotes] = useState('')
  const [addToRota, setAddToRota] = useState(true)
  
  // Data for dropdowns
  const [sites, setSites] = useState<Array<{id: string, name: string, address: any}>>([])
  const [siteStaff, setSiteStaff] = useState<Array<{id: string, full_name: string}>>([])
  const [loadingSiteStaff, setLoadingSiteStaff] = useState(false)

  // Load sites on mount
  useEffect(() => {
    if (companyId) {
      loadSites()
    }
  }, [companyId])

  // Load staff when site is selected
  useEffect(() => {
    if (trialSiteId) {
      loadSiteStaff(trialSiteId)
    } else {
      setSiteStaff([])
    }
  }, [trialSiteId])

  const formatAddress = (address: any): string => {
    if (!address) return ''
    if (typeof address === 'string') return address
    
    // Handle JSONB address format
    const parts = []
    if (address.line1) parts.push(address.line1)
    if (address.line2) parts.push(address.line2)
    if (address.city) parts.push(address.city)
    if (address.postcode) parts.push(address.postcode)
    
    return parts.join(', ') || JSON.stringify(address)
  }

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')
      
      if (error) {
        console.error('Supabase error loading sites:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      console.log('Loaded sites:', data)
      setSites(data || [])
      
      if (!data || data.length === 0) {
        console.warn('No sites found for company:', companyId)
      }
    } catch (error: any) {
      console.error('Failed to load sites:', error)
      // Don't show error toast - we have fallback to manual entry
    }
  }

  const loadSiteStaff = async (siteId: string) => {
    setLoadingSiteStaff(true)
    try {
      // Just load all managers/admins from the company
      // (site-specific filtering not available in profiles table)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', companyId)
        .in('app_role', ['Manager', 'Admin', 'Owner', 'Area Manager', 'Ops Manager'])
        .order('full_name')
      
      if (error) throw error
      setSiteStaff(data || [])
    } catch (error) {
      console.error('Failed to load site staff:', error)
    } finally {
      setLoadingSiteStaff(false)
    }
  }

  const titles = {
    interview: 'Post-Interview Assessment',
    trial: 'Post-Trial Assessment',
    reject: 'Reject Application',
  }

  const nextStatuses = {
    interview: { progress: 'trial', reject: 'rejected' },
    trial: { progress: 'offer', reject: 'rejected' },
    reject: { progress: 'rejected', reject: 'rejected' },
  }

  const handleSubmit = async () => {
    if (mode !== 'reject' && progression === 'progress' && !managerNotes.trim()) {
      toast.error('Manager notes are required')
      return
    }

    if (mode === 'reject' && !rejectionMessage.trim()) {
      toast.error('Please provide a rejection message')
      return
    }

    // Validate trial scheduling fields if progressing from interview to trial
    if (mode === 'interview' && progression === 'progress') {
      if (!trialDate || !trialTime || !trialSiteId || !trialContactPerson) {
        toast.error('Please fill in all trial scheduling details')
        return
      }
      if (trialPaymentTerms === 'paid' && !trialPaymentRate) {
        toast.error('Please specify the hourly rate for paid trial')
        return
      }
    }

    setSaving(true)
    try {
      const newStatus = mode === 'reject' ? 'rejected' : nextStatuses[mode][progression]
      
      // Build notes for history
      let historyNotes = ''
      if (mode === 'interview' && progression === 'progress') {
        historyNotes = `Interview completed. Rating: ${rating}/5. ${managerNotes ? 'Notes: ' + managerNotes.substring(0, 100) : ''}`
      } else if (mode === 'interview' && progression === 'reject') {
        historyNotes = `Interview completed - rejected. ${rejectionMessage ? 'Reason: ' + rejectionMessage.substring(0, 100) : ''}`
      } else if (mode === 'trial' && progression === 'progress') {
        historyNotes = `Trial completed. Rating: ${rating}/5. ${teamFeedback ? 'Team feedback: ' + teamFeedback.substring(0, 100) : ''}`
      } else if (mode === 'trial' && progression === 'reject') {
        historyNotes = `Trial completed - rejected. ${rejectionMessage ? 'Reason: ' + rejectionMessage.substring(0, 100) : ''}`
      }
      
      // Update application status with history tracking
      await supabase.rpc('update_application_status', {
        p_application_id: application.id,
        p_new_status: newStatus,
        p_changed_by: managerId,
        p_notes: historyNotes,
      })
      
      // Prepare update data (without status, as it's already updated by RPC)
      const updateData: any = {}

      // Add mode-specific fields
      if (mode === 'interview') {
        updateData.interview_notes = managerNotes
        updateData.interview_rating = rating
        updateData.interview_completed_at = new Date().toISOString()
        
        // If progressing to trial, add trial scheduling
        if (progression === 'progress') {
          updateData.trial_scheduled_at = new Date(`${trialDate}T${trialTime}`).toISOString()
          updateData.trial_confirmation_status = 'pending'
          updateData.trial_payment_terms = trialPaymentTerms
          updateData.trial_payment_rate = trialPaymentRate ? parseFloat(trialPaymentRate) : null
          updateData.trial_payment_notes = trialPaymentNotes || null
          
          // Save trial location details
          updateData.trial_site_id = trialSiteId || null
          updateData.trial_contact_person = trialContactPerson || null
          updateData.trial_location_notes = trialLocationNotes || null
          updateData.trial_what_to_bring = trialWhatToBring || null
          updateData.trial_duration_hours = trialDuration ? parseInt(trialDuration) : 4
          
          // Note: Rota shift will be created automatically when candidate confirms
          // Create rota shift for trial if requested
          if (false && addToRota) {
            try {
              console.log('🔄 Starting rota shift creation...')
              console.log('addToRota:', addToRota)
              console.log('sites.length:', sites.length)
              console.log('trialSiteId:', trialSiteId)
              
              // Get site_id - only proceed if a valid site was selected
              const siteId = sites.find(s => s.id === trialSiteId)?.id
              
              if (!siteId) {
                console.warn('⚠️ No valid site selected - cannot add to rota. Please select a site from the dropdown to add trial to schedule.')
                toast.warning('Trial scheduled! Select a site from dropdown to add to rota.')
              } else {
                console.log('Site ID:', siteId)
                
                // Calculate end time based on duration
                const startDateTime = new Date(`${trialDate}T${trialTime}`)
                const endDateTime = new Date(startDateTime.getTime() + parseInt(trialDuration) * 60 * 60 * 1000)
                const endTime = endDateTime.toTimeString().slice(0, 5)
                
                // Calculate week starting (Monday of the week)
                const trialDateObj = new Date(trialDate)
                const dayOfWeek = trialDateObj.getDay()
                const daysToMonday = (dayOfWeek + 6) % 7 // Days to subtract to get to Monday
                const weekStarting = new Date(trialDateObj)
                weekStarting.setDate(trialDateObj.getDate() - daysToMonday)
                const weekStartingStr = weekStarting.toISOString().split('T')[0]
                
                console.log('Week starting:', weekStartingStr)
                // Get or create a rota for this week/site
                console.log('🔍 Looking for existing rota...')
                const { data: existingRota, error: rotaCheckError } = await supabase
                  .from('rotas')
                  .select('id')
                  .eq('company_id', companyId)
                  .eq('site_id', siteId)
                  .eq('week_starting', weekStartingStr)
                  .maybeSingle()
                
                console.log('Existing rota:', existingRota)
                console.log('Rota check error:', rotaCheckError)
                
                let rotaId = existingRota?.id
                
                // If no rota exists, create one
                if (!rotaId) {
                  console.log('📝 Creating new rota...')
                  const { data: newRota, error: rotaCreateError } = await supabase
                    .from('rotas')
                    .insert({
                      company_id: companyId,
                      site_id: siteId,
                      week_starting: weekStartingStr,
                      status: 'draft'
                    })
                    .select('id')
                    .single()
                  
                  console.log('New rota:', newRota)
                  console.log('Rota create error:', rotaCreateError)
                  
                  if (!rotaCreateError && newRota) {
                    rotaId = newRota.id
                  }
                }
                
                console.log('Final rota ID:', rotaId)
                
                // Create the rota shift for the trial
                if (rotaId) {
                  console.log('➕ Creating rota shift...')
                  const selectedSite = sites.find(s => s.id === trialSiteId)
                  const selectedContact = siteStaff.find(s => s.id === trialContactPerson)
                  const contactName = selectedContact?.full_name || trialContactPerson || 'Manager'
                  
                  const shiftData = {
                    rota_id: rotaId,
                    company_id: companyId,
                    profile_id: null, // Unassigned (candidate not yet an employee)
                    shift_date: trialDate,
                    start_time: trialTime,
                    end_time: endTime,
                    break_minutes: 0,
                    role_required: application.job.title,
                    status: 'scheduled',
                    color: '#D37E91', // Pink for trial shifts
                    notes: `🎯 TRIAL SHIFT - ${candidate.full_name}\nCandidate for: ${application.job.title}\nContact: ${contactName}\nLocation: ${selectedSite?.name || 'Site'}\nPayment: ${trialPaymentTerms === 'unpaid' ? 'Unpaid' : trialPaymentTerms === 'paid' ? `Paid £${trialPaymentRate}/hr` : 'Paid if hired'}`,
                    hourly_rate: trialPaymentTerms === 'paid' && trialPaymentRate ? Math.round(parseFloat(trialPaymentRate) * 100) : null
                  }
                  
                  console.log('Shift data:', shiftData)
                  
                  const { data: rotaShift, error: shiftError } = await supabase
                    .from('rota_shifts')
                    .insert(shiftData)
                    .select('id')
                    .single()
                  
                  console.log('Rota shift result:', rotaShift)
                  console.log('Shift error:', shiftError)
                  
                  if (!shiftError && rotaShift) {
                    updateData.trial_rota_shift_id = rotaShift.id
                    console.log('✅ Trial shift added to rota:', rotaShift.id)
                    toast.success('Trial shift added to rota!')
                  } else if (shiftError) {
                    console.error('❌ Failed to create rota shift:', shiftError)
                    toast.warning('Trial scheduled but could not add to rota')
                  }
                } else {
                  console.warn('⚠️ No rota ID - skipping shift creation')
                }
              }
            } catch (rotaError: any) {
              console.error('Rota shift creation failed:', rotaError)
              // Don't fail the whole operation if rota creation fails
            }
          }
        }
      } else if (mode === 'trial') {
        // Combine manager notes and team feedback into trial_notes
        const combinedNotes = teamFeedback 
          ? `**Manager Notes:**\n${managerNotes}\n\n**Team Feedback:**\n${teamFeedback}`
          : managerNotes
        updateData.trial_notes = combinedNotes
        updateData.trial_rating = rating
        updateData.trial_completed_at = new Date().toISOString()
      }

      // Update application
      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', application.id)

      if (updateError) throw updateError

      // Send email if needed
      if (sendEmail) {
        if (progression === 'reject' || mode === 'reject') {
          // Send rejection email
          await fetch('/api/recruitment/send-rejection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateEmail: candidate.email,
              candidateName: candidate.full_name,
              jobTitle: application.job.title,
              companyId,
              personalMessage: rejectionMessage,
            }),
          })
        } else if (mode === 'interview' && progression === 'progress') {
          // Get confirmation token
          const { data: appData } = await supabase
            .from('applications')
            .select('confirmation_token')
            .eq('id', application.id)
            .single()

          // Send trial invitation email
          const selectedSite = sites.find(s => s.id === trialSiteId)
          const selectedContact = siteStaff.find(s => s.id === trialContactPerson)
          
          // Determine location text (from dropdown or manual entry)
          let locationText = ''
          if (selectedSite) {
            locationText = selectedSite.name
          } else {
            // Manual entry (trialSiteId contains the text)
            locationText = trialSiteId || 'TBC'
          }
          
          // Determine contact person (from dropdown or manual entry)
          let contactPersonText = ''
          if (selectedContact) {
            contactPersonText = selectedContact.full_name
          } else {
            // Manual entry (trialContactPerson contains the text)
            contactPersonText = trialContactPerson || 'the manager'
          }
          
          // Format payment info for email
          let paymentInfo = ''
          if (trialPaymentTerms === 'unpaid') {
            paymentInfo = 'This is an unpaid trial shift.'
          } else if (trialPaymentTerms === 'paid') {
            paymentInfo = `This trial shift is paid at £${trialPaymentRate || 'TBC'} per hour.`
          } else if (trialPaymentTerms === 'paid_if_hired') {
            paymentInfo = 'You will be paid for this trial shift if you are successfully hired.'
          }
          
          if (trialPaymentNotes) {
            paymentInfo += `\n${trialPaymentNotes}`
          }
          
          await fetch('/api/recruitment/send-trial-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateEmail: candidate.email,
              candidateName: candidate.full_name,
              jobTitle: application.job.title,
              companyId,
              trialDate,
              trialTime,
              trialLocation: locationText,
              trialDuration: `${trialDuration} hours`,
              whatToBring: trialWhatToBring,
              additionalInfo: `${trialAdditionalInfo}\n\nYou will meet ${contactPersonText} on arrival.\n\n💰 Payment Terms:\n${paymentInfo}`,
              applicationId: application.id,
              confirmationToken: appData?.confirmation_token,
            }),
          })
        }
      }

      const messages = {
        interview: progression === 'progress' 
          ? 'Interview completed and trial scheduled!' 
          : 'Application rejected',
        trial: progression === 'progress' 
          ? 'Candidate ready for offer!' 
          : 'Application rejected',
        reject: 'Application rejected',
      }

      toast.success(messages[mode])
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Failed to update application:', error)
      toast.error('Failed to update application')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#14161c] border border-theme rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">{titles[mode]}</h2>
            <p className="text-sm text-theme-secondary mt-1">
              {candidate.full_name} - {application.job.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode !== 'reject' && (
            <>
              {/* Progression Decision */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-3">
                  Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProgression('progress')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      progression === 'progress'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
                    <div className="text-theme-primary text-sm font-medium">
                      {mode === 'interview' ? 'Progress to Trial' : 'Send Offer'}
                    </div>
                  </button>
                  <button
                    onClick={() => setProgression('reject')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      progression === 'reject'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <ThumbsDown className="w-6 h-6 mx-auto mb-2 text-red-400" />
                    <div className="text-theme-primary text-sm font-medium">Reject</div>
                  </button>
                </div>
              </div>

              {progression === 'progress' && (
                <>
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                      Overall Rating (1-5)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          onClick={() => setRating(num)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            num <= rating
                              ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                              : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-theme-tertiary hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="ml-2 text-theme-tertiary text-sm">{rating}/5</span>
                    </div>
                  </div>

                  {/* Manager Notes */}
                  <div>
                    <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      Manager Notes *
                    </label>
                    <textarea
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder={`What went well? Any concerns? Key takeaways from the ${mode}...`}
                      rows={4}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] focus:ring-2 focus:ring-[#D37E91]/20 resize-none"
                    />
                  </div>

                  {/* Team Feedback (Trial only) */}
                  {mode === 'trial' && (
                    <div>
                      <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Team Feedback
                      </label>
                      <textarea
                        value={teamFeedback}
                        onChange={(e) => setTeamFeedback(e.target.value)}
                        placeholder="What did the team think? How did they fit in?"
                        rows={3}
                        className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] focus:ring-2 focus:ring-[#D37E91]/20 resize-none"
                      />
                    </div>
                  )}

                  {/* Trial Scheduling (Interview → Trial progression only) */}
                  {mode === 'interview' && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/[0.06]">
                      <h3 className="text-theme-primary font-semibold text-base mb-4">
                        📅 Schedule Trial Shift
                      </h3>
                      <div className="space-y-4">
                        {/* Date and Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              Trial Date *
                            </label>
                            <input
                              type="date"
                              value={trialDate}
                              onChange={(e) => setTrialDate(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Start Time *
                            </label>
                            <TimePicker
                              value={trialTime}
                              onChange={(value) => setTrialTime(value)}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                            Duration (hours)
                          </label>
                          <select
                            value={trialDuration}
                            onChange={(e) => setTrialDuration(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91] [&>option]:bg-white dark:[&>option]:bg-[#1a1d24] [&>option]:text-theme-primary"
                          >
                            <option value="2">2 hours</option>
                            <option value="3">3 hours</option>
                            <option value="4">4 hours</option>
                            <option value="6">6 hours</option>
                            <option value="8">8 hours (full day)</option>
                          </select>
                        </div>

                        {/* Site Selection */}
                        <div>
                          <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Trial Location *
                          </label>
                          {sites.length > 0 ? (
                            <select
                              value={trialSiteId}
                              onChange={(e) => setTrialSiteId(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91] [&>option]:bg-white dark:[&>option]:bg-[#1a1d24] [&>option]:text-theme-primary"
                            >
                              <option value="">Select a site...</option>
                              {sites.map(site => (
                                <option key={site.id} value={site.id}>
                                  {site.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <input
                                type="text"
                                value={trialSiteId}
                                onChange={(e) => setTrialSiteId(e.target.value)}
                                placeholder="e.g., Main Kitchen, 123 High Street, London"
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91]"
                              />
                              <p className="text-xs text-theme-tertiary mt-1">
                                💡 No sites found. Enter location manually or set up sites in your company settings.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Contact Person */}
                        <div>
                          <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                            <User className="w-4 h-4 inline mr-1" />
                            Who Will They Meet? *
                          </label>
                          {loadingSiteStaff ? (
                            <div className="flex items-center gap-2 text-theme-tertiary text-sm py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading staff...
                            </div>
                          ) : sites.length > 0 && siteStaff.length > 0 ? (
                            <select
                              value={trialContactPerson}
                              onChange={(e) => setTrialContactPerson(e.target.value)}
                              disabled={!trialSiteId}
                              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91] disabled:opacity-50 disabled:cursor-not-allowed [&>option]:bg-white dark:[&>option]:bg-[#1a1d24] [&>option]:text-theme-primary"
                            >
                              <option value="">{trialSiteId ? 'Select contact person...' : 'Select a site first'}</option>
                              {siteStaff.map(person => (
                                <option key={person.id} value={person.id}>
                                  {person.full_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <input
                                type="text"
                                value={trialContactPerson}
                                onChange={(e) => setTrialContactPerson(e.target.value)}
                                placeholder="e.g., John Smith (Manager)"
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91]"
                              />
                              {trialSiteId && siteStaff.length === 0 && !loadingSiteStaff && (
                                <p className="text-xs text-theme-tertiary mt-1">
                                  💡 Enter the contact person's name manually
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* What to Bring */}
                        <div>
                          <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                            What to Bring
                          </label>
                          <input
                            type="text"
                            value={trialWhatToBring}
                            onChange={(e) => setTrialWhatToBring(e.target.value)}
                            placeholder="e.g., Black shoes, apron, ID, etc."
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91]"
                          />
                        </div>

                        {/* Additional Info */}
                        <div>
                          <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                            Additional Information
                          </label>
                          <textarea
                            value={trialAdditionalInfo}
                            onChange={(e) => setTrialAdditionalInfo(e.target.value)}
                            placeholder="Parking info, where to enter, what to expect, etc."
                            rows={3}
                            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] focus:ring-2 focus:ring-[#D37E91]/20 resize-none"
                          />
                        </div>

                        {/* Payment Terms Section */}
                        <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                          <h4 className="text-theme-primary font-medium text-sm mb-3">💰 Payment Agreement</h4>
                          
                          {/* Payment Terms Radio */}
                          <div className="space-y-2 mb-4">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 ${
                              trialPaymentTerms === 'unpaid'
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-200 dark:border-white/10'
                            }`}>
                              <input
                                type="radio"
                                name="paymentTerms"
                                value="unpaid"
                                checked={trialPaymentTerms === 'unpaid'}
                                onChange={(e) => setTrialPaymentTerms(e.target.value as any)}
                                className="mt-0.5"
                              />
                              <div>
                                <div className="text-theme-primary text-sm font-medium">Unpaid Trial</div>
                                <div className="text-theme-tertiary text-xs">No payment for trial shift hours</div>
                              </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 ${
                              trialPaymentTerms === 'paid'
                                ? 'border-green-500 bg-green-500/10'
                                : 'border-gray-200 dark:border-white/10'
                            }`}>
                              <input
                                type="radio"
                                name="paymentTerms"
                                value="paid"
                                checked={trialPaymentTerms === 'paid'}
                                onChange={(e) => setTrialPaymentTerms(e.target.value as any)}
                                className="mt-0.5"
                              />
                              <div>
                                <div className="text-theme-primary text-sm font-medium">Paid Trial</div>
                                <div className="text-theme-tertiary text-xs">Candidate will be paid for trial hours</div>
                              </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 ${
                              trialPaymentTerms === 'paid_if_hired'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-200 dark:border-white/10'
                            }`}>
                              <input
                                type="radio"
                                name="paymentTerms"
                                value="paid_if_hired"
                                checked={trialPaymentTerms === 'paid_if_hired'}
                                onChange={(e) => setTrialPaymentTerms(e.target.value as any)}
                                className="mt-0.5"
                              />
                              <div>
                                <div className="text-theme-primary text-sm font-medium">Paid if Hired</div>
                                <div className="text-theme-tertiary text-xs">Payment only if candidate is hired</div>
                              </div>
                            </label>
                          </div>

                          {/* Hourly Rate (if paid) */}
                          {trialPaymentTerms === 'paid' && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                                Hourly Rate (£) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={trialPaymentRate}
                                onChange={(e) => setTrialPaymentRate(e.target.value)}
                                placeholder="e.g., 11.50"
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91]"
                              />
                            </div>
                          )}

                          {/* Payment Notes */}
                          <div>
                            <label className="block text-sm font-medium text-theme-primary/70 mb-2">
                              Payment Notes (Optional)
                            </label>
                            <textarea
                              value={trialPaymentNotes}
                              onChange={(e) => setTrialPaymentNotes(e.target.value)}
                              placeholder="Any additional payment details or conditions..."
                              rows={2}
                              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] focus:ring-2 focus:ring-[#D37E91]/20 resize-none"
                            />
                          </div>
                        </div>

                        {/* Add to Rota Option */}
                        <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addToRota}
                              onChange={(e) => setAddToRota(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 text-[#D37E91] focus:ring-[#D37E91]"
                            />
                            <div>
                              <div className="text-theme-primary text-sm font-medium">
                                📅 Add trial shift to rota
                              </div>
                              <div className="text-theme-tertiary text-xs">
                                Creates a rota entry so managers can see the trial on the schedule
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {progression === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Rejection Message *
                  </label>
                  <textarea
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                    placeholder="Optional personal message to include in rejection email..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] resize-none"
                  />
                </div>
              )}
            </>
          )}

          {mode === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Message to Candidate (Optional)
              </label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="You can add a personal message here, or leave blank for the standard rejection email..."
                rows={4}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] resize-none"
              />
            </div>
          )}

          {/* Send Email Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
            <input
              type="checkbox"
              id="send-rejection-email"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D37E91]"
            />
            <label htmlFor="send-rejection-email" className="text-sm text-theme-secondary cursor-pointer">
              Send email notification to candidate
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-theme-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${
              progression === 'reject' || mode === 'reject'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#D37E91] hover:bg-[#D37E91]/90 text-white'
            }`}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'reject' || progression === 'reject' ? 'Reject Application' : 'Save & Progress'}
          </button>
        </div>
      </div>
    </div>
  )
}
