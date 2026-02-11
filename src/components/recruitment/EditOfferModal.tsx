'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, Save, Send, Loader2, Edit } from '@/components/ui/icons'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'

type EditOfferModalProps = {
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
  offerId: string
  companyId: string
  managerId: string
  onSuccess: () => void
}

export default function EditOfferModal({
  isOpen,
  onClose,
  candidate,
  application,
  offerId,
  companyId,
  managerId,
  onSuccess,
}: EditOfferModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  // Form state
  const [startDate, setStartDate] = useState('')
  const [payRate, setPayRate] = useState('')
  const [contractHours, setContractHours] = useState('')
  const [contractType, setContractType] = useState<'permanent' | 'fixed_term' | 'zero_hours' | 'casual'>('permanent')
  const [offerStatus, setOfferStatus] = useState<string>('sent')

  // Load existing offer data
  useEffect(() => {
    if (isOpen && offerId) {
      loadOffer()
    }
  }, [isOpen, offerId])

  const loadOffer = async () => {
    setLoading(true)
    try {
      const { data: offer, error } = await supabase
        .from('offer_letters')
        .select('*')
        .eq('id', offerId)
        .single()

      if (error) throw error

      if (offer) {
        // Format date for input (YYYY-MM-DD)
        // Handle both date strings and Date objects
        let dateStr = ''
        if (offer.start_date) {
          try {
            const date = typeof offer.start_date === 'string' 
              ? new Date(offer.start_date) 
              : offer.start_date
            dateStr = date.toISOString().split('T')[0]
          } catch (e) {
            console.error('Error parsing date:', e)
          }
        }
        setStartDate(dateStr)
        setPayRate(offer.pay_rate?.toString() || '')
        setContractHours(offer.contract_hours?.toString() || '')
        setContractType(offer.contract_type || 'permanent')
        setOfferStatus(offer.status || 'sent')
      } else {
        toast.error('Offer not found')
        onClose()
      }
    } catch (error: any) {
      console.error('Failed to load offer:', error)
      toast.error('Failed to load offer details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (resendEmail: boolean = false) => {
    if (!startDate || !payRate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (resendEmail) {
      setSending(true)
    } else {
      setSaving(true)
    }

    try {
      // Update offer letter
      const { error: updateError } = await supabase
        .from('offer_letters')
        .update({
          start_date: startDate,
          pay_rate: parseFloat(payRate),
          contract_hours: contractHours ? parseFloat(contractHours) : null,
          contract_type: contractType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)

      if (updateError) throw updateError

      if (resendEmail) {
        // Get confirmation token
        const { data: appData } = await supabase
          .from('applications')
          .select('confirmation_token')
          .eq('id', application.id)
          .single()

        // Get updated offer to get the token
        const { data: updatedOffer } = await supabase
          .from('offer_letters')
          .select('offer_token')
          .eq('id', offerId)
          .single()

        const offerUrl = `${window.location.origin}/recruitment/offers/${updatedOffer?.offer_token}`

        // Send email
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

        const emailResult = await emailResponse.json()

        if (!emailResponse.ok) {
          throw new Error(emailResult.error || 'Failed to send email')
        }

        if (emailResult.skipped) {
          toast.warning('Offer updated, but email service not configured')
          toast.info(`Share this link manually: ${offerUrl}`, { duration: 15000 })
        } else {
          toast.success(`Offer updated and resent to ${candidate.email}!`)
        }
      } else {
        toast.success('Offer updated successfully!')
      }

      onSuccess()
      onClose()
      router.refresh()
    } catch (error: any) {
      console.error('Failed to update offer:', error)
      toast.error(`Failed to update offer: ${error.message}`)
    } finally {
      setSaving(false)
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
            <h2 className="text-xl font-semibold text-white">Edit Offer Letter</h2>
            <p className="text-sm text-white/60 mt-1">
              For {candidate.full_name} - {application.job_title}
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
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : (
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
              <div className="text-xs text-blue-300 font-medium mb-2">📋 Updated Offer Summary</div>
              <div className="text-sm text-white/70 space-y-1">
                <div>Position: <strong>{application.job_title}</strong></div>
                <div>Start Date: <strong>{startDate || 'Not set'}</strong></div>
                <div>
                  Pay: <strong>£{payRate || '0'}{application.pay_type === 'hourly' ? '/hour' : '/year'}</strong>
                </div>
                <div>Contract: <strong>{contractType}{contractHours && ` (${contractHours} hrs/week)`}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            disabled={saving || sending}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || sending || loading || !startDate || !payRate}
            className="px-4 py-2 rounded-lg text-sm bg-transparent text-blue-400 border border-blue-400 hover:shadow-[0_0_12px_rgba(59,130,246,0.7)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || sending || loading || !startDate || !payRate}
            className="px-4 py-2 rounded-lg text-sm bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Save & Resend
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
