'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import TimePicker from '@/components/ui/TimePicker'

type Application = {
  id: string
  status: string
  interview_scheduled_at: string | null
  trial_scheduled_at: string | null
  candidate: {
    full_name: string
    email: string
  }
  job: {
    title: string
    company: {
      name: string
    }
  }
}

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [application, setApplication] = useState<Application | null>(null)
  const [confirmationType, setConfirmationType] = useState<'interview' | 'trial' | 'offer'>('interview')
  const [action, setAction] = useState<'confirm' | 'decline' | 'reschedule'>('confirm')
  const [requestedDate, setRequestedDate] = useState('')
  const [requestedTime, setRequestedTime] = useState('')
  const [requestedStartDate, setRequestedStartDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    loadApplication()
  }, [token])

  const loadApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          interview_scheduled_at,
          trial_scheduled_at,
          candidates!inner (
            id,
            full_name,
            email
          ),
          jobs!inner (
            title,
            companies!inner (
              name
            )
          )
        `)
        .eq('confirmation_token', token)
        .single()

      if (error) throw error

      if (!data) {
        toast.error('Invalid confirmation link')
        return
      }

      // Determine what they're confirming
      if (data.status === 'interview' && data.interview_scheduled_at) {
        setConfirmationType('interview')
      } else if (data.status === 'trial' && data.trial_scheduled_at) {
        setConfirmationType('trial')
      } else if (data.status === 'offer') {
        setConfirmationType('offer')
      }

      setApplication(data as any)
    } catch (error) {
      console.error('Failed to load application:', error)
      toast.error('Failed to load confirmation details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (action === 'reschedule') {
      if (confirmationType === 'offer' && !requestedStartDate) {
        toast.error('Please provide your preferred start date')
        return
      } else if (confirmationType !== 'offer' && (!requestedDate || !requestedTime)) {
        toast.error('Please provide your preferred date and time')
        return
      }
    }

    if (action === 'decline' && !reason.trim()) {
      toast.error('Please let us know why you need to decline')
      return
    }

    setSubmitting(true)
    try {
      // Get the candidate ID from the nested structure
      const candidateId = (application!.candidates as any)?.id
      
      if (!candidateId) {
        throw new Error('Candidate ID not found')
      }

      const { error } = await supabase
        .from('application_confirmation_responses')
        .insert({
          application_id: application!.id,
          candidate_id: candidateId,
          response_type: confirmationType,
          action,
          requested_date: action === 'reschedule' && confirmationType !== 'offer' ? requestedDate : null,
          requested_time: action === 'reschedule' && confirmationType !== 'offer' ? requestedTime : null,
          requested_start_date: action === 'reschedule' && confirmationType === 'offer' ? requestedStartDate : null,
          reschedule_reason: action === 'reschedule' ? reason : null,
          decline_reason: action === 'decline' ? reason : null,
        })

      if (error) throw error

      // Update application confirmation status
      const updateData: any = {}
      if (confirmationType === 'interview') {
        updateData.interview_confirmation_status = action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : 'rescheduled'
        updateData.interview_confirmation_at = new Date().toISOString()
        if (action === 'reschedule') {
          updateData.interview_reschedule_reason = reason
        }
      } else if (confirmationType === 'trial') {
        updateData.trial_confirmation_status = action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : 'rescheduled'
        updateData.trial_confirmation_at = new Date().toISOString()
        if (action === 'reschedule') {
          updateData.trial_reschedule_reason = reason
        }
      } else if (confirmationType === 'offer') {
        // For offers, update application status
        if (action === 'confirm') {
          updateData.status = 'accepted'
        } else if (action === 'decline') {
          updateData.status = 'rejected'
          updateData.rejection_reason = 'Candidate declined offer'
          updateData.rejection_notes = reason
        }
        // Reschedule requests don't change status, manager reviews
      }

      await supabase
        .from('applications')
        .update(updateData)
        .eq('id', application!.id)

      setSubmitted(true)
      
      if (action === 'confirm') {
        if (confirmationType === 'offer') {
          toast.success('Offer accepted! We\'ll be in touch soon!')
        } else {
          toast.success('Confirmed! See you there!')
        }
      } else if (action === 'decline') {
        toast.info('Response recorded. We\'ll be in touch.')
      } else {
        toast.success('Request received. We\'ll contact you soon.')
      }
    } catch (error) {
      console.error('Failed to submit response:', error)
      toast.error('Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1117] to-[#1a1d24] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1117] to-[#1a1d24] flex items-center justify-center p-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-white/60 text-sm">
            This confirmation link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1117] to-[#1a1d24] flex items-center justify-center p-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-white text-2xl font-semibold mb-2">Thank You!</h1>
          <p className="text-white/70 mb-4">
            {action === 'confirm' && 'Your attendance has been confirmed.'}
            {action === 'decline' && 'We appreciate you letting us know.'}
            {action === 'reschedule' && 'We\'ll review your request and get back to you shortly.'}
          </p>
          <p className="text-white/50 text-sm">
            You can close this window.
          </p>
        </div>
      </div>
    )
  }

  const scheduledAt = confirmationType === 'interview' 
    ? application.interview_scheduled_at 
    : application.trial_scheduled_at

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1117] to-[#1a1d24] flex items-center justify-center p-4">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-semibold mb-2">
            {confirmationType === 'interview' && '📅 Interview Confirmation'}
            {confirmationType === 'trial' && '👨‍🍳 Trial Shift Confirmation'}
            {confirmationType === 'offer' && '🌟 Job Offer Response'}
          </h1>
          <p className="text-white/60">
            {(application.jobs as any)?.companies?.name || 'Company'}
          </p>
        </div>

        {/* Details */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-6 mb-6">
          <div className="grid gap-3">
            <div>
              <span className="text-white/50 text-sm">Candidate:</span>
              <div className="text-white font-medium">{(application.candidates as any)?.full_name || 'Candidate'}</div>
            </div>
            <div>
              <span className="text-white/50 text-sm">Position:</span>
              <div className="text-white font-medium">{(application.jobs as any)?.title || 'Position'}</div>
            </div>
            {scheduledAt && (
              <div>
                <span className="text-white/50 text-sm">Scheduled:</span>
                <div className="text-white font-medium">
                  {new Date(scheduledAt).toLocaleString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Selection */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* All Options Visible */}
          <div className="space-y-6">
            {/* Main Confirm Button */}
            <button
              type="button"
              onClick={() => setAction('confirm')}
              className={`w-full font-bold py-6 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-xl ${
                action === 'confirm'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_8px_40px_rgba(34,197,94,0.5)] ring-2 ring-green-400/50'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-[0_8px_30px_rgba(34,197,94,0.3)] hover:shadow-[0_8px_40px_rgba(34,197,94,0.4)]'
              }`}
            >
              <CheckCircle className="w-8 h-8" />
              <span>Confirm Attendance</span>
              {action === 'confirm' && <span className="ml-auto text-sm">✓ Selected</span>}
            </button>
            
            {/* Divider with text */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#1a1d24] px-4 text-white/40 uppercase tracking-wider">Or</span>
              </div>
            </div>
            
            {/* Secondary Options - Always Visible */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAction('reschedule')}
                className={`font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  action === 'reschedule'
                    ? 'bg-amber-500/30 border-2 border-amber-500/70 text-amber-200 ring-2 ring-amber-400/30'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-500/50 hover:border-amber-500/70 text-amber-300'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Request Changes</span>
                {action === 'reschedule' && <span className="text-xs">✓ Selected</span>}
              </button>
              <button
                type="button"
                onClick={() => setAction('decline')}
                className={`font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  action === 'decline'
                    ? 'bg-red-500/30 border-2 border-red-500/70 text-red-200 ring-2 ring-red-400/30'
                    : 'bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 hover:border-red-500/70 text-red-300'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span className="text-sm">Decline</span>
                {action === 'decline' && <span className="text-xs">✓ Selected</span>}
              </button>
            </div>
          </div>

          {/* Reschedule Fields */}
          {action === 'reschedule' && (
            <div className="space-y-4 border-t border-white/[0.06] pt-6">
              {confirmationType === 'offer' ? (
                // For offer: request different start date
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Preferred Start Date *
                  </label>
                  <input
                    type="date"
                    value={requestedStartDate}
                    onChange={(e) => setRequestedStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-[#1a1d24] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
                  />
                </div>
              ) : (
                // For interview/trial: request different date and time
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-[#1a1d24] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Preferred Time *
                    </label>
                    <TimePicker
                      value={requestedTime}
                      onChange={(value) => setRequestedTime(value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {confirmationType === 'offer' ? 'Reason for Different Start Date' : 'Reason for Rescheduling'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={confirmationType === 'offer' ? 'Why do you need a different start date?' : 'Please let us know why you need to reschedule...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1a1d24] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] resize-none"
                />
              </div>
            </div>
          )}

          {/* Decline Reason */}
          {action === 'decline' && (
            <div className="border-t border-white/[0.06] pt-6">
              <label className="block text-sm font-medium text-white/70 mb-2">
                Reason for Declining *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you need to decline..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1d24] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] resize-none"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 rounded-lg bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Response'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
