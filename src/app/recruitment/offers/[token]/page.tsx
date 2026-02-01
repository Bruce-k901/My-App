'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, X, Building2, Calendar, DollarSign, Clock, FileText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type Offer = {
  id: string
  position_title: string
  start_date: string
  pay_rate: number
  pay_frequency: string
  contract_hours: number | null
  contract_type: string
  boh_foh: string
  pay_type: string
  status: string
  expires_at: string
  candidate: {
    full_name: string
    email: string
  }
  company: {
    name: string
  }
}

export default function OfferAcceptancePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Acceptance
  const [accepting, setAccepting] = useState(false)
  const [signature, setSignature] = useState('')

  useEffect(() => {
    loadOffer()
  }, [token])

  const loadOffer = async () => {
    if (!token) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('offer_letters')
        .select(`
          *,
          candidate:candidates(full_name, email),
          company:companies(name)
        `)
        .eq('offer_token', token)
        .single()

      if (error) throw error

      if (!data) {
        setError('Offer not found')
        return
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This offer has expired')
        return
      }

      // Check if already accepted/declined
      if (data.status === 'accepted') {
        setError('This offer has already been accepted')
        return
      }

      if (data.status === 'declined') {
        setError('This offer has been declined')
        return
      }

      setOffer(data as any)
    } catch (error: any) {
      console.error('Failed to load offer:', error)
      setError('Failed to load offer')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!offer || !signature.trim()) {
      toast.error('Please enter your full name as a signature')
      return
    }

    setAccepting(true)
    try {
      // Call the acceptance API endpoint (we'll create this)
      const response = await fetch('/api/recruitment/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature: signature.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept offer')
      }

      const result = await response.json()

      toast.success('Offer accepted! Redirecting to onboarding...')
      
      // Redirect to onboarding (with the onboarding token)
      setTimeout(() => {
        window.location.href = `/onboarding/${result.onboardingToken}`
      }, 2000)
    } catch (error: any) {
      console.error('Failed to accept offer:', error)
      toast.error(error.message || 'Failed to accept offer')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D13] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0D13] via-[#0f1117] to-[#1a1d24] flex items-center justify-center p-4">
        <div className="bg-white/[0.03] border-2 border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Unable to Load Job Offer</h1>
          <p className="text-white/60 text-sm mb-4">{error || 'Offer not found'}</p>
          <p className="text-white/40 text-xs">
            This link may have expired or the offer may have been withdrawn. Please contact {offer?.company?.name || 'the company'} for assistance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0D13] via-[#0f1117] to-[#1a1d24] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#EC4899]/10 border border-[#EC4899]/30 rounded-full">
            <Sparkles className="w-4 h-4 text-[#EC4899]" />
            <span className="text-xs font-semibold text-[#EC4899] uppercase tracking-wide">Final Step: Job Offer</span>
          </div>
        </div>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#EC4899]/20 via-purple-500/20 to-blue-500/20 border-2 border-[#EC4899]/30 rounded-xl p-8 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#EC4899]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EC4899] via-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(236,72,153,0.5)]">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div className="mb-3">
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-[#EC4899]/30 text-[#EC4899] border border-[#EC4899]/50 rounded-full mb-3">
                🎉 JOB OFFER
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Congratulations, {offer.candidate.full_name}!</h1>
            <p className="text-white/80 text-lg font-medium mb-1">
              {offer.company.name} wants you on their team!
            </p>
            <p className="text-white/60 text-sm">
              Review your offer details below and accept to begin your journey with us
            </p>
          </div>
        </div>

        {/* Offer Details */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-[#EC4899]" />
            <h2 className="text-xl font-semibold text-white">Your Job Offer Details</h2>
          </div>
          
          <div className="space-y-6">
            {/* Position */}
            <div>
              <div className="text-xs text-white/50 mb-1">Position</div>
              <div className="text-white font-semibold text-lg">{offer.position_title}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {offer.boh_foh}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {offer.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                </span>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-xs text-white/50">Start Date</div>
                <div className="text-white">
                  {new Date(offer.start_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Pay */}
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-xs text-white/50">Pay Rate</div>
                <div className="text-white text-lg font-semibold">
                  £{offer.pay_rate.toFixed(2)} {offer.pay_frequency === 'hourly' ? 'per hour' : 'per year'}
                </div>
              </div>
            </div>

            {/* Contract Hours */}
            {offer.contract_hours && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-xs text-white/50">Contract Hours</div>
                  <div className="text-white">{offer.contract_hours} hours per week</div>
                </div>
              </div>
            )}

            {/* Contract Type */}
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-white/40" />
              <div>
                <div className="text-xs text-white/50">Contract Type</div>
                <div className="text-white capitalize">{offer.contract_type.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* E-Signature */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <Check className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Accept Your Job Offer</h2>
          </div>
          
          <p className="text-white/70 text-base mb-2 font-medium">
            Ready to join {offer.company.name}?
          </p>
          <p className="text-white/60 text-sm mb-6">
            By typing your full name below, you accept this job offer and agree to the terms stated above. This will serve as your electronic signature.
          </p>

          <div>
            <label className="text-xs text-white/50 block mb-2">Type your full name *</label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base"
            />
            <p className="text-xs text-white/40 mt-2">This will serve as your electronic signature</p>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleAccept}
              disabled={accepting || !signature.trim()}
              className="flex-1 px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:shadow-[0_8px_40px_rgba(34,197,94,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Accepting Your Offer...</span>
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  <span>Accept Job Offer</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-white/40 text-center mt-4">
            Offer expires on {new Date(offer.expires_at).toLocaleDateString()}
          </p>
        </div>

        {/* What's Next */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-lg">What Happens After You Accept?</h3>
          </div>
          <ol className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold text-xs">1</span>
              <span><strong className="text-white">Accept the offer</strong> by signing above - you're officially joining the team!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold text-xs">2</span>
              <span><strong className="text-white">Complete onboarding</strong> - set up your profile (takes 15-20 minutes)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold text-xs">3</span>
              <span><strong className="text-white">Upload documents</strong> - ID, certificates, and required paperwork</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold text-xs">4</span>
              <span><strong className="text-white">Manager review</strong> - your manager will approve everything</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-300 font-semibold text-xs">5</span>
              <span><strong className="text-white">Start your new role!</strong> You're ready for your first shift! 🎉</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
