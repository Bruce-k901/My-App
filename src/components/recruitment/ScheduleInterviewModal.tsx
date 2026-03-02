'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, Video, Phone, Building2, Loader2 } from '@/components/ui/icons'
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
    job_id: string
    job: {
      title: string
    }
  }
  companyId: string
  managerId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ScheduleInterviewModal({ candidate, application, companyId, managerId, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false)
  const [interviewType, setInterviewType] = useState<'in-person' | 'video' | 'phone'>('in-person')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [sendEmail, setSendEmail] = useState(true)

  const handleSubmit = async () => {
    if (!date) {
      toast.error('Interview date is required')
      return
    }

    setSaving(true)
    try {
      // Update application status with history tracking
      await supabase.rpc('update_application_status', {
        p_application_id: application.id,
        p_new_status: 'interview',
        p_changed_by: managerId,
        p_notes: `Interview scheduled for ${date} at ${time || '09:00'}`,
      })

      // Update application with interview details
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          interview_scheduled_at: new Date(`${date}T${time || '09:00'}`).toISOString(),
          interview_confirmation_status: 'pending', // Set to pending when scheduled
        })
        .eq('id', application.id)

      if (updateError) throw updateError

      // Get confirmation token
      const { data: appData } = await supabase
        .from('applications')
        .select('confirmation_token')
        .eq('id', application.id)
        .single()

      // Send invitation email
      if (sendEmail) {
        const emailResponse = await fetch('/api/recruitment/send-interview-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateEmail: candidate.email,
            candidateName: candidate.full_name,
            jobTitle: application.job.title,
            companyId,
            interviewDate: date,
            interviewTime: time,
            interviewLocation: location,
            interviewType,
            additionalInfo,
            applicationId: application.id,
            confirmationToken: appData?.confirmation_token,
          }),
        })

        const emailResult = await emailResponse.json()
        
        if (emailResult.error) {
          toast.warning('Interview scheduled, but email notification failed')
        } else {
          toast.success('Interview scheduled and invitation sent!')
        }
      } else {
        toast.success('Interview scheduled!')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Failed to schedule interview:', error)
      toast.error('Failed to schedule interview')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#14161c] border border-theme rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme sticky top-0 bg-white dark:bg-[#14161c] z-10">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">Schedule Interview</h2>
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
          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-3">
              Interview Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setInterviewType('in-person')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  interviewType === 'in-person'
                    ? 'border-[#D37E91] bg-[#D37E91]/10'
                    : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <Building2 className="w-6 h-6 mx-auto mb-2 text-theme-secondary" />
                <div className="text-theme-primary text-sm font-medium">In-Person</div>
              </button>
              <button
                onClick={() => setInterviewType('video')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  interviewType === 'video'
                    ? 'border-[#D37E91] bg-[#D37E91]/10'
                    : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <Video className="w-6 h-6 mx-auto mb-2 text-theme-secondary" />
                <div className="text-theme-primary text-sm font-medium">Video Call</div>
              </button>
              <button
                onClick={() => setInterviewType('phone')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  interviewType === 'phone'
                    ? 'border-[#D37E91] bg-[#D37E91]/10'
                    : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <Phone className="w-6 h-6 mx-auto mb-2 text-theme-secondary" />
                <div className="text-theme-primary text-sm font-medium">Phone</div>
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </label>
              <TimePicker
                value={time}
                onChange={(value) => setTime(value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location / Meeting Link
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={interviewType === 'video' ? 'Zoom/Teams link' : interviewType === 'phone' ? 'We will call you' : 'Office address'}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91]"
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Additional Information
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="e.g., What to bring, who will interview you, parking info..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-theme-primary placeholder:text-theme-disabled focus:outline-none focus:border-[#D37E91] resize-none"
            />
          </div>

          {/* Send Email Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
            <input
              type="checkbox"
              id="send-email"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D37E91]"
            />
            <label htmlFor="send-email" className="text-sm text-theme-secondary cursor-pointer">
              Send email invitation to candidate
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
            className="px-4 py-2 rounded-lg text-sm bg-[#D37E91] hover:bg-[#D37E91]/90 text-white font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule Interview
          </button>
        </div>
      </div>
    </div>
  )
}
