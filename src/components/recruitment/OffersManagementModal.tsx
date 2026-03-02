'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Edit, Send, Loader2, FileText, Calendar, DollarSign, Briefcase, Plus } from '@/components/ui/icons'
import { toast } from 'sonner'
import EditOfferModal from './EditOfferModal'
import SendOfferModal from './SendOfferModal'

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
  position_title: string
  site_id: string | null
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

type OffersManagementModalProps = {
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
  onSuccess: () => void
}

export default function OffersManagementModal({
  isOpen,
  onClose,
  candidate,
  application,
  companyId,
  managerId,
  onSuccess,
}: OffersManagementModalProps) {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<OfferLetter[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSendOfferModal, setShowSendOfferModal] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [resendingOfferId, setResendingOfferId] = useState<string | null>(null)

  const loadOffers = async () => {
    setLoading(true)
    try {
      // Try multiple approaches to load offers
      let offersData: OfferLetter[] = []

      // Approach 1: Direct query
      const { data: directOffers, error: directError } = await supabase
        .from('offer_letters')
        .select('*, site:sites(name, address, postcode)')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false })

      if (!directError && directOffers && directOffers.length > 0) {
        offersData = directOffers as OfferLetter[]
        console.log('✅ Loaded offers via direct query:', offersData.length)
      } else if (directError) {
        console.error('Direct query error:', directError)
        
        // Approach 2: Try through application relationship
        console.log('Trying application relationship query...')
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select(`
            offer_letters!offer_letters_application_id_fkey (
              id,
              application_id,
              status,
              start_date,
              pay_rate,
              pay_frequency,
              contract_type,
              contract_hours,
              offer_token,
              created_at,
              sent_at,
              accepted_at,
              declined_at,
              position_title
            )
          `)
          .eq('id', application.id)
          .single()

        if (!appError && appData?.offer_letters) {
          const offersList = Array.isArray(appData.offer_letters) 
            ? appData.offer_letters 
            : [appData.offer_letters].filter(Boolean)
          offersData = offersList as OfferLetter[]
          console.log('✅ Loaded offers via relationship query:', offersData.length)
        } else {
          console.error('Application relationship query error:', appError)
          
          // Show helpful error message
          if (directError?.code === 'PGRST116' || directError?.message?.includes('406') || appError?.code === 'PGRST116') {
            toast.error('RLS policy is blocking offer access')
            toast.error('Please run: supabase/sql/fix_offer_letters_rls.sql in Supabase SQL Editor', { duration: 15000 })
            console.error('RLS Error Details:', {
              directError: directError?.message,
              appError: appError?.message,
              code: directError?.code || appError?.code
            })
          } else {
            toast.error(`Failed to load offers: ${directError?.message || appError?.message || 'Unknown error'}`)
          }
        }
      } else if (!directOffers || directOffers.length === 0) {
        console.log('No offers found in direct query (no error, just empty)')
        // Try relationship query as fallback
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select(`
            offer_letters!offer_letters_application_id_fkey (
              id,
              application_id,
              status,
              start_date,
              pay_rate,
              pay_frequency,
              contract_type,
              contract_hours,
              offer_token,
              created_at,
              sent_at,
              accepted_at,
              declined_at,
              position_title
            )
          `)
          .eq('id', application.id)
          .single()

        if (!appError && appData?.offer_letters) {
          const offersList = Array.isArray(appData.offer_letters) 
            ? appData.offer_letters 
            : [appData.offer_letters].filter(Boolean)
          offersData = offersList as OfferLetter[]
          console.log('✅ Loaded offers via relationship query (fallback):', offersData.length)
        }
      }

      setOffers(offersData)
    } catch (error: any) {
      console.error('Failed to load offers:', error)
      toast.error(`Failed to load offers: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadOffers()
    }
  }, [isOpen, application.id])

  // Listen for offer creation events
  useEffect(() => {
    const handleOfferCreated = (event: CustomEvent) => {
      if (event.detail?.applicationId === application.id) {
        // Reload offers when a new one is created
        setTimeout(() => {
          loadOffers()
        }, 1000)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('offer-created', handleOfferCreated as EventListener)
      return () => {
        window.removeEventListener('offer-created', handleOfferCreated as EventListener)
      }
    }
  }, [application.id])

  const handleResendOffer = async (offer: OfferLetter) => {
    setResendingOfferId(offer.id)
    try {
      // Get confirmation token
      const { data: appData } = await supabase
        .from('applications')
        .select('confirmation_token')
        .eq('id', application.id)
        .single()

      const siteName = offer.site?.name || ''
      const siteAddress = offer.site ? formatAddress(offer.site.address, offer.site.postcode) : ''

      const response = await fetch('/api/recruitment/send-offer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateEmail: candidate.email,
          candidateName: candidate.full_name,
          jobTitle: application.job_title,
          companyId,
          offerUrl: `${window.location.origin}/recruitment/offers/${offer.offer_token}`,
          startDate: offer.start_date,
          payRate: offer.pay_rate,
          payFrequency: offer.pay_frequency,
          contractType: offer.contract_type,
          contractHours: offer.contract_hours,
          applicationId: application.id,
          confirmationToken: appData?.confirmation_token,
          siteName,
          siteAddress,
          department: application.boh_foh,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.skipped) {
          toast.warning('Offer email service not configured')
          toast.info(`Share this link manually: ${window.location.origin}/recruitment/offers/${offer.offer_token}`, { duration: 15000 })
        } else {
          toast.success('Offer email resent!')
        }
        await loadOffers()
      } else {
        throw new Error('Failed to send')
      }
    } catch (error: any) {
      console.error('Failed to resend offer:', error)
      toast.error('Failed to resend offer email')
    } finally {
      setResendingOfferId(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#14161c] border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/[0.06] sticky top-0 bg-white dark:bg-[#14161c] z-10">
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">Manage Offers</h2>
              <p className="text-sm text-theme-tertiary mt-1">
                {candidate.full_name} - {application.job_title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSendOfferModal(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#D37E91]/10 text-[#D37E91] border border-[#D37E91]/30 hover:bg-[#D37E91]/20 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New Offer
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-theme-tertiary hover:text-theme-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-theme-tertiary animate-spin" />
            </div>
          ) : offers.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-theme-disabled mx-auto mb-4" />
              <div className="text-theme-primary font-semibold text-lg mb-2">No Offers Found</div>
              <div className="text-theme-tertiary text-sm mb-4">
                No offer letters have been created for this application yet.
              </div>
              <button
                onClick={() => setShowSendOfferModal(true)}
                className="px-4 py-2 rounded-lg bg-[#D37E91]/10 text-[#D37E91] border border-[#D37E91]/30 hover:bg-[#D37E91]/20 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create First Offer
              </button>
              <div className="text-theme-tertiary text-xs mt-4">
                If you expected to see offers here, this may be due to RLS policies.
                <br />
                Please ensure you have run: <code className="bg-gray-100 dark:bg-white/5 px-1 rounded">supabase/sql/fix_offer_letters_rls.sql</code>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-2.5 py-1 text-xs rounded font-medium ${
                            offer.status === 'accepted' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : offer.status === 'declined'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : offer.status === 'sent'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : offer.status === 'viewed'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-theme-surface-elevated0/20 text-theme-tertiary border border-gray-500/30'
                          }`}>
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </span>
                          <span className="text-xs text-theme-tertiary">
                            Created {new Date(offer.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-theme-secondary">
                            <Calendar className="w-4 h-4 text-theme-tertiary" />
                            <span className="text-theme-tertiary">Start:</span>
                            <strong className="text-theme-primary">{offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-GB') : 'Not set'}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-theme-secondary">
                            <DollarSign className="w-4 h-4 text-theme-tertiary" />
                            <span className="text-theme-tertiary">Pay:</span>
                            <strong className="text-theme-primary">£{offer.pay_rate}{offer.pay_frequency === 'hourly' ? '/hr' : '/year'}</strong>
                          </div>
                          {offer.contract_type && (
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Briefcase className="w-4 h-4 text-theme-tertiary" />
                              <span className="text-theme-tertiary">Contract:</span>
                              <strong className="text-theme-primary">{offer.contract_type.replace('_', ' ')}{offer.contract_hours ? ` (${offer.contract_hours}h/week)` : ''}</strong>
                            </div>
                          )}
                          {offer.sent_at && (
                            <div className="text-xs text-theme-tertiary">
                              Sent: {new Date(offer.sent_at).toLocaleDateString('en-GB')}
                            </div>
                          )}
                          {offer.accepted_at && (
                            <div className="text-xs text-green-400">
                              ✓ Accepted: {new Date(offer.accepted_at).toLocaleDateString('en-GB')}
                            </div>
                          )}
                          {offer.declined_at && (
                            <div className="text-xs text-red-400">
                              ✗ Declined: {new Date(offer.declined_at).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </div>

                        {offer.offer_token && (
                          <div className="mt-3 p-2 bg-gray-50 dark:bg-white/[0.02] rounded text-xs">
                            <span className="text-theme-tertiary">Offer Link: </span>
                            <code className="text-[#D37E91] break-all">
                              {window.location.origin}/recruitment/offers/{offer.offer_token}
                            </code>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setSelectedOfferId(offer.id)
                            setShowEditModal(true)
                          }}
                          className="px-3 py-1.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-2"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        {offer.status === 'sent' && (
                          <button
                            onClick={() => handleResendOffer(offer)}
                            disabled={resendingOfferId === offer.id}
                            className="px-3 py-1.5 text-xs rounded bg-[#D37E91]/15 text-[#D37E91] border border-[#D37E91]/30 hover:bg-[#D37E91]/25 flex items-center gap-2 disabled:opacity-50"
                          >
                            {resendingOfferId === offer.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Resend
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send New Offer Modal */}
      {showSendOfferModal && (
        <SendOfferModal
          isOpen={showSendOfferModal}
          onClose={() => {
            setShowSendOfferModal(false)
          }}
          candidate={candidate}
          application={application}
          companyId={companyId}
          managerId={managerId}
        />
      )}

      {/* Edit Offer Modal */}
      {showEditModal && selectedOfferId && (
        <EditOfferModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedOfferId(null)
          }}
          candidate={candidate}
          application={application}
          offerId={selectedOfferId}
          companyId={companyId}
          managerId={managerId}
          onSuccess={() => {
            loadOffers()
            onSuccess()
          }}
        />
      )}
    </>
  )
}
