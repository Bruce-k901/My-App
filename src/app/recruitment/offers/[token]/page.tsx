'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from '@/components/ui/icons'
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
  site: {
    name: string
    address: any
    postcode: string | null
  } | null
}

function formatAddress(address: any, postcode?: string | null): string {
  if (!address && !postcode) return ''
  if (typeof address === 'string') return address

  const parts: string[] = []
  if (address?.line1) parts.push(address.line1)
  if (address?.line2) parts.push(address.line2)
  if (address?.city) parts.push(address.city)
  if (address?.postcode) parts.push(address.postcode)
  else if (postcode) parts.push(postcode)

  return parts.join(', ')
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
          company:companies(name),
          site:sites(name, address, postcode)
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

  // Derived values
  const firstName = offer?.candidate?.full_name?.split(' ')[0] || ''
  const fullName = offer?.candidate?.full_name || ''
  const companyName = offer?.company?.name || ''
  const siteName = offer?.site?.name || null
  const siteAddress = offer?.site ? formatAddress(offer.site.address, offer.site.postcode) : ''
  const heroSubtitle = siteName ? `${companyName} — ${siteName}` : companyName

  const payText = offer
    ? `£${offer.pay_rate.toFixed(2)} ${offer.pay_frequency === 'hourly' ? 'per hour' : 'per year'}`
    : ''

  const formattedStartDate = offer
    ? new Date(offer.start_date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const formattedContractType = offer?.contract_type
    ? offer.contract_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : ''

  const formattedHours = offer?.contract_hours ? `${offer.contract_hours} hours/week` : ''

  const expiryDate = offer?.expires_at
    ? new Date(offer.expires_at).toLocaleDateString('en-GB')
    : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF5F6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#b0607a] animate-spin" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-[#FAF5F6] flex items-center justify-center p-4" style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>
        <div className="bg-white border border-[rgba(176,96,122,0.12)] rounded-2xl p-8 max-w-md text-center shadow-[0_1px_4px_rgba(176,96,122,0.08)]">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            {/* X icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" className="ph-duotone">
              <circle cx="128" cy="128" r="88" fill="#EF4444" opacity="0.2"/>
              <path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32Z" fill="#EF4444"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#2D2D2D] mb-2">Unable to Load Job Offer</h1>
          <p className="text-[#7A7A7A] text-sm mb-4">{error || 'Offer not found'}</p>
          <p className="text-[#A0A0A0] text-xs">
            This link may have expired or the offer may have been withdrawn. Please contact {offer?.company?.name || 'the company'} for assistance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Phosphor duotone opacity CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .ph-duotone { --ph-duotone-opacity: 0.25; }
      `}</style>

      <div className="min-h-screen bg-[#FAF5F6] py-8 px-4" style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>
        <div className="max-w-[640px] mx-auto space-y-5">

          {/* Progress Strip */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(176,96,122,0.1)] border border-[rgba(176,96,122,0.2)] rounded-full">
              {/* Sparkle icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" className="ph-duotone">
                <path d="M208,144a80,80,0,0,1-80,80,80,80,0,0,1,80-80,80,80,0,0,1-80-80A80,80,0,0,1,208,144Z" fill="#b0607a" opacity="0.2"/>
                <path d="M208,144a80,80,0,0,1-80,80,80,80,0,0,1,80-80,80,80,0,0,1-80-80A80,80,0,0,1,208,144Z" fill="none" stroke="#b0607a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
              </svg>
              <span className="text-xs font-semibold text-[#b0607a] uppercase tracking-wide">Final Step: Job Offer</span>
            </div>
          </div>

          {/* Hero Card */}
          <div className="bg-white border border-[rgba(176,96,122,0.12)] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(176,96,122,0.08)]">
            <div className="bg-gradient-to-br from-[#FDF2F4] via-[#F9E4E9] to-[#F3D5DC] px-8 py-10 text-center">
              {/* Company icon circle */}
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-[0_2px_8px_rgba(176,96,122,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" className="ph-duotone">
                  <rect x="32" y="48" width="192" height="176" rx="8" fill="#b0607a" opacity="0.2"/>
                  <path d="M232,224H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,56H192V224H160V184a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v40H64Zm80,168H112V192h32ZM88,104a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,104Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,104ZM88,144a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,144Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,144Z" fill="#b0607a"/>
                </svg>
              </div>

              {/* Badge */}
              <div className="mb-3">
                <span className="inline-block px-3 py-1 text-[11px] font-bold bg-[rgba(176,96,122,0.15)] text-[#b0607a] rounded-full uppercase tracking-wider">
                  Job Offer
                </span>
              </div>

              <h1 className="text-[26px] font-bold text-[#2D2D2D] mb-1 leading-tight">
                Congratulations, {fullName}!
              </h1>
              <p className="text-[15px] text-[#7A7A7A] font-medium">
                {heroSubtitle}
              </p>
            </div>
          </div>

          {/* Offer Details Card */}
          <div className="bg-white border border-[rgba(176,96,122,0.12)] rounded-2xl p-6 sm:p-8 shadow-[0_1px_4px_rgba(176,96,122,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              {/* File icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0">
                <path d="M208,88H152V32Z" fill="#b0607a" opacity="0.2"/>
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48Z" fill="#b0607a"/>
              </svg>
              <div>
                <div className="text-[11px] font-bold text-[#b0607a] uppercase tracking-[1.5px]">YOUR OFFER DETAILS</div>
              </div>
            </div>

            {/* Position + Tags */}
            <div className="mb-5">
              <div className="text-xl font-bold text-[#2D2D2D] mb-2">{offer.position_title}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#F3E8EB] text-[#b0607a]">
                  {offer.boh_foh}
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#F3E8EB] text-[#b0607a]">
                  {offer.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                </span>
              </div>
            </div>

            {/* Location tile (full width) */}
            {siteName && (
              <div className="bg-[#FDF8F9] rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  {/* Map pin icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0 mt-0.5">
                    <circle cx="128" cy="104" r="48" fill="#b0607a" opacity="0.2"/>
                    <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.36,134.39a8,8,0,0,0,9.28,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" fill="#b0607a"/>
                  </svg>
                  <div>
                    <div className="text-[11px] font-semibold text-[#b0607a] uppercase tracking-[0.5px] mb-1">Location</div>
                    <div className="text-[15px] font-semibold text-[#2D2D2D]">{siteName}</div>
                    {siteAddress && (
                      <div className="text-[13px] text-[#7A7A7A] mt-0.5">{siteAddress}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2x2 Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start Date */}
              <div className="bg-[#FDF8F9] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0 mt-0.5">
                    <rect x="40" y="40" width="176" height="176" rx="8" fill="#b0607a" opacity="0.2"/>
                    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V80H208Z" fill="#b0607a"/>
                  </svg>
                  <div>
                    <div className="text-[11px] text-[#A0A0A0] font-semibold uppercase tracking-[0.5px] mb-1">Start Date</div>
                    <div className="text-sm font-semibold text-[#2D2D2D]">{formattedStartDate}</div>
                  </div>
                </div>
              </div>

              {/* Pay Rate */}
              <div className="bg-[#FDF8F9] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0 mt-0.5">
                    <circle cx="128" cy="128" r="80" fill="#b0607a" opacity="0.2"/>
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-112H136V88a8,8,0,0,0-16,0v16h-8a24,24,0,0,0,0,48h8v16H104a8,8,0,0,0,0,16h16v8a8,8,0,0,0,16,0v-8h8a24,24,0,0,0,0-48h-8V120h8a8,8,0,0,0,0-16Zm-32,32h-8a8,8,0,0,1,0-16h8Zm32,32a8,8,0,0,1-8,8h-8V152h8A8,8,0,0,1,144,168Z" fill="#b0607a"/>
                  </svg>
                  <div>
                    <div className="text-[11px] text-[#A0A0A0] font-semibold uppercase tracking-[0.5px] mb-1">Pay Rate</div>
                    <div className="text-sm font-bold text-[#b0607a]">{payText}</div>
                  </div>
                </div>
              </div>

              {/* Contract Type */}
              <div className="bg-[#FDF8F9] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0 mt-0.5">
                    <rect x="32" y="64" width="192" height="144" rx="8" fill="#b0607a" opacity="0.2"/>
                    <path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,200H40V72H216Z" fill="#b0607a"/>
                  </svg>
                  <div>
                    <div className="text-[11px] text-[#A0A0A0] font-semibold uppercase tracking-[0.5px] mb-1">Contract</div>
                    <div className="text-sm font-semibold text-[#2D2D2D]">{formattedContractType}</div>
                  </div>
                </div>
              </div>

              {/* Hours */}
              {formattedHours && (
                <div className="bg-[#FDF8F9] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0 mt-0.5">
                      <circle cx="128" cy="128" r="88" fill="#b0607a" opacity="0.2"/>
                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" fill="#b0607a"/>
                    </svg>
                    <div>
                      <div className="text-[11px] text-[#A0A0A0] font-semibold uppercase tracking-[0.5px] mb-1">Hours</div>
                      <div className="text-sm font-semibold text-[#2D2D2D]">{formattedHours}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accept Card */}
          <div className="bg-white border border-[rgba(16,185,129,0.2)] rounded-2xl p-6 sm:p-8 shadow-[0_1px_4px_rgba(176,96,122,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              {/* Check circle icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0">
                <circle cx="128" cy="128" r="88" fill="#10B981" opacity="0.2"/>
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-109.66a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L128,132.69l34.34-34.35A8,8,0,0,1,173.66,106.34Z" fill="#10B981"/>
              </svg>
              <h2 className="text-xl font-semibold text-[#2D2D2D]">Accept Your Job Offer</h2>
            </div>

            <p className="text-[#2D2D2D] text-base mb-1 font-medium">
              Ready to join {companyName}?
            </p>
            <p className="text-[#7A7A7A] text-sm mb-6">
              By typing your full name below, you accept this job offer and agree to the terms stated above. This will serve as your electronic signature.
            </p>

            <div>
              <label className="text-xs text-[#7A7A7A] block mb-2 font-medium">Type your full name *</label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-[#FDF8F9] border border-[rgba(176,96,122,0.15)] rounded-xl text-[#2D2D2D] text-base placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#10B981] transition-all"
              />
              <p className="text-xs text-[#A0A0A0] mt-2">This will serve as your electronic signature</p>
            </div>

            <button
              onClick={handleAccept}
              disabled={accepting || !signature.trim()}
              className="w-full mt-6 px-8 py-4 rounded-xl text-base font-bold bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Accepting Your Offer...</span>
                </>
              ) : (
                <>
                  {/* Check icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="white">
                    <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/>
                  </svg>
                  <span>Accept Job Offer</span>
                </>
              )}
            </button>

            <p className="text-xs text-[#A0A0A0] text-center mt-4">
              Offer expires on {expiryDate}
            </p>
          </div>

          {/* Next Steps Card */}
          <div className="bg-white border border-[rgba(176,96,122,0.12)] rounded-2xl p-6 sm:p-8 shadow-[0_1px_4px_rgba(176,96,122,0.08)]">
            <div className="flex items-center gap-3 mb-5">
              {/* List checks icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="ph-duotone flex-shrink-0">
                <rect x="40" y="40" width="176" height="176" rx="8" fill="#b0607a" opacity="0.2"/>
                <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208Z" fill="#b0607a"/>
              </svg>
              <h3 className="text-lg font-semibold text-[#2D2D2D]">What Happens After You Accept?</h3>
            </div>
            <ol className="space-y-4">
              {[
                { num: '1', text: 'Accept the offer', desc: "by signing above — you're officially joining the team!" },
                { num: '2', text: 'Complete onboarding', desc: '— set up your profile (takes 15-20 minutes)' },
                { num: '3', text: 'Upload documents', desc: '— ID, certificates, and required paperwork' },
                { num: '4', text: 'Start your new role!', desc: "— you're ready for your first shift!" },
              ].map((step) => (
                <li key={step.num} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F3E8EB] flex items-center justify-center text-[#b0607a] font-semibold text-xs">
                    {step.num}
                  </span>
                  <span className="text-sm text-[#7A7A7A] pt-1">
                    <strong className="text-[#2D2D2D]">{step.text}</strong> {step.desc}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Powered by Opsly Footer */}
          <div className="py-6 text-center">
            {/* Bar mark */}
            <div className="flex gap-[2px] items-end justify-center h-5 mb-3">
              <div className="w-1 h-4 bg-[#1B2624] rounded-sm"></div>
              <div className="w-1 h-[13px] bg-[#8B2E3E] rounded-sm"></div>
              <div className="w-1 h-[15px] bg-[#D9868C] rounded-sm"></div>
              <div className="w-1 h-[14px] bg-[#5D8AA8] rounded-sm"></div>
              <div className="w-1 h-4 bg-[#87B0D6] rounded-sm"></div>
              <div className="w-1 h-[15px] bg-[#9AC297] rounded-sm"></div>
            </div>
            <p className="text-xs text-[#A0A0A0] mb-1">
              Powered by <strong className="text-[#7A7A7A]">opsly</strong>
            </p>
            <p className="text-[11px] text-[#A0A0A0]">
              Recruitment &amp; Operations Management
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
