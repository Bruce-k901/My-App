'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'

type SendOfferModalProps = {
  isOpen: boolean
  onClose: () => void
  candidate: {
    id: string
    full_name: string
    email: string
  }
  application: {
    id: string
    job_id: string
    job_title: string
    boh_foh: 'FOH' | 'BOH' | 'BOTH'
    pay_type: 'hourly' | 'salaried'
  }
  companyId: string
  managerId: string
}

export default function SendOfferModal({
  isOpen,
  onClose,
  candidate,
  application,
  companyId,
  managerId,
}: SendOfferModalProps) {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  // Form state
  const [startDate, setStartDate] = useState('')
  const [payRate, setPayRate] = useState('')
  const [contractHours, setContractHours] = useState('')
  const [contractType, setContractType] = useState<'permanent' | 'fixed_term' | 'zero_hours' | 'casual'>('permanent')

  const handleSend = async () => {
    if (!startDate || !payRate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSending(true)
    try {
      // Generate unique token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      // Create offer letter
      const { data: offer, error: offerError } = await supabase
        .from('offer_letters')
        .insert({
          application_id: application.id,
          candidate_id: candidate.id,
          job_id: application.job_id,
          company_id: companyId,
          position_title: application.job_title,
          start_date: startDate,
          pay_rate: parseFloat(payRate),
          pay_frequency: application.pay_type === 'hourly' ? 'hourly' : 'annual',
          contract_hours: contractHours ? parseFloat(contractHours) : null,
          contract_type: contractType,
          boh_foh: application.boh_foh,
          pay_type: application.pay_type,
          offer_token: token,
          status: 'sent',
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_by: managerId,
        })
        .select()
        .single()

      if (offerError) throw offerError

      // Update application status to 'offer'
      await supabase.rpc('update_application_status', {
        p_application_id: application.id,
        p_new_status: 'offer',
        p_changed_by: managerId,
        p_notes: `Offer sent for £${payRate}${application.pay_type === 'hourly' ? '/hr' : '/year'}`,
      })

      // Get confirmation token
      const { data: appData } = await supabase
        .from('applications')
        .select('confirmation_token')
        .eq('id', application.id)
        .single()

      // Send email with offer link
      const offerUrl = `${window.location.origin}/recruitment/offers/${token}`
      
      try {
        const emailResponse = await fetch('/api/recruitment/send-offer-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateEmail: candidate.email,
            candidateName: candidate.full_name,
            jobTitle: application.job_title,
            companyId: companyId,
            offerUrl,
            startDate,
            payRate,
            payFrequency: application.pay_type === 'hourly' ? 'hourly' : 'annual',
            contractType,
            contractHours,
            applicationId: application.id,
            confirmationToken: appData?.confirmation_token,
          }),
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to send email')
        }

        const emailResult = await emailResponse.json()
        
        // Check if email was actually sent or just logged
        if (emailResult.skipped) {
          toast.warning('Offer created, but email service not configured')
          toast.info(`Share this link manually: ${offerUrl}`, { duration: 15000 })
          console.warn('Email skipped - Resend not configured. Set RESEND_API_KEY and RESEND_FROM environment variables.')
        } else {
          toast.success(`Offer sent to ${candidate.email}!`)
        }
      } catch (emailError: any) {
        console.error('Email send failed:', emailError)
        toast.warning('Offer created, but email failed to send')
        toast.info(`Share this link manually: ${offerUrl}`, { duration: 15000 })
      }

      onClose()
      router.refresh()
      
      // Trigger a custom event to notify parent components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offer-created', { detail: { applicationId: application.id } }))
      }
    } catch (error: any) {
      console.error('Failed to send offer:', error)
      toast.error(`Failed to send offer: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14161c] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-xl font-semibold text-white">Send Offer Letter</h2>
            <p className="text-sm text-white/60 mt-1">
              To {candidate.full_name} for {application.job_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Position Summary */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
            <div className="text-xs text-white/50 mb-2">Position Details</div>
            <div className="text-white font-medium">{application.job_title}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {application.boh_foh}
              </span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                {application.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
              </span>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs text-white/50 block mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
          </div>

          {/* Pay Rate */}
          <div>
            <label className="text-xs text-white/50 block mb-1">
              Pay Rate * (£{application.pay_type === 'hourly' ? '/hour' : '/year'})
            </label>
            <input
              type="number"
              step="0.01"
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              placeholder={application.pay_type === 'hourly' ? '12.50' : '28000'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 block mb-1">Contract Type</label>
              <Select
                value={contractType}
                onValueChange={(v) => setContractType(v as any)}
                options={[
                  { label: 'Permanent', value: 'permanent' },
                  { label: 'Fixed Term', value: 'fixed_term' },
                  { label: 'Zero Hours', value: 'zero_hours' },
                  { label: 'Casual', value: 'casual' },
                ]}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 block mb-1">
                Contract Hours (per week)
              </label>
              <input
                type="number"
                step="0.5"
                value={contractHours}
                onChange={(e) => setContractHours(e.target.value)}
                placeholder="40"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <div className="text-xs text-blue-300 font-medium mb-2">📋 Offer Summary</div>
            <div className="text-sm text-white/70 space-y-1">
              <div>Position: <strong>{application.job_title}</strong></div>
              <div>Start Date: <strong>{startDate || 'Not set'}</strong></div>
              <div>
                Pay: <strong>£{payRate || '0'}{application.pay_type === 'hourly' ? '/hour' : '/year'}</strong>
              </div>
              <div>Contract: <strong>{contractType}{contractHours && ` (${contractHours} hrs/week)`}</strong></div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-200/80">
            💡 The candidate will receive an email with a link to accept this offer. Once accepted, their profile will be automatically created and they'll be sent to onboarding.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !startDate || !payRate}
            className="px-4 py-2 rounded-lg text-sm bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Offer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
