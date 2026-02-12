'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, Calendar, Mail, User } from '@/components/ui/icons'
import { toast } from 'sonner'

type ConfirmationResponse = {
  id: string
  application_id: string
  response_type: 'interview' | 'trial' | 'offer'
  action: 'confirm' | 'decline' | 'reschedule'
  requested_date: string | null
  requested_time: string | null
  requested_start_date: string | null
  reschedule_reason: string | null
  decline_reason: string | null
  responded_at: string
  processed: boolean
  candidate: {
    id: string
    full_name: string
    email: string
  }
  application: {
    job: {
      title: string
    }
  }
}

export default function ConfirmationsPage() {
  const { profile } = useAppContext()
  const companyId = profile?.company_id

  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<ConfirmationResponse[]>([])
  const [filter, setFilter] = useState<'all' | 'unprocessed'>('unprocessed')

  useEffect(() => {
    if (companyId) {
      load()
    }
  }, [companyId, filter])

  const load = async () => {
    if (!companyId) return

    setLoading(true)
    try {
      let query = supabase
        .from('application_confirmation_responses')
        .select(`
          id,
          application_id,
          response_type,
          action,
          requested_date,
          requested_time,
          requested_start_date,
          reschedule_reason,
          decline_reason,
          responded_at,
          processed,
          candidates!inner (
            id,
            full_name,
            email,
            company_id
          ),
          applications!inner (
            jobs!inner (
              title
            )
          )
        `)
        .eq('candidates.company_id', companyId)
        .order('responded_at', { ascending: false })

      if (filter === 'unprocessed') {
        query = query.eq('processed', false)
      }

      const { data, error } = await query

      if (error) throw error

      setResponses((data || []) as any)
    } catch (error) {
      console.error('Failed to load responses:', error)
      toast.error('Failed to load responses')
    } finally {
      setLoading(false)
    }
  }

  const markProcessed = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('application_confirmation_responses')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processed_by: profile?.id
        })
        .eq('id', responseId)

      if (error) throw error

      toast.success('Marked as processed')
      load()
    } catch (error) {
      console.error('Failed to mark processed:', error)
      toast.error('Failed to update')
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'confirm':
        return <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">✓ Confirmed</span>
      case 'decline':
        return <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30">✗ Declined</span>
      case 'reschedule':
        return <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">🔄 Reschedule</span>
      default:
        return null
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'interview':
        return <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">📅 Interview</span>
      case 'trial':
        return <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">👔 Trial</span>
      case 'offer':
        return <span className="px-2 py-1 text-xs rounded bg-module-fg/[0.25] text-module-fg border border-module-fg/[0.30]">💼 Offer</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-primary mb-2">Confirmation Responses</h1>
        <p className="text-theme-primary/60">
          Candidate responses to interview, trial, and offer invitations
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter('unprocessed')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            filter === 'unprocessed'
              ? 'bg-module-fg/[0.20] text-module-fg border border-module-fg/[0.30]'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          Unprocessed ({responses.filter(r => !r.processed).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            filter === 'all'
              ? 'bg-module-fg/[0.20] text-module-fg border border-module-fg/[0.30]'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          All ({responses.length})
        </button>
      </div>

      {/* Responses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-theme-primary/40 animate-spin" />
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
          <Mail className="w-12 h-12 text-theme-primary/30 mx-auto mb-4" />
          <div className="text-theme-primary font-semibold text-lg">No responses yet</div>
          <div className="text-theme-primary/60 text-sm mt-2">
            Candidate responses will appear here when they click confirmation links in emails
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <div
              key={response.id}
              className={`bg-theme-surface border rounded-xl p-5 ${
 response.processed ? 'border-gray-200 opacity-60' : 'border-theme'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/dashboard/people/recruitment/candidates/${(response.candidate as any).id}`}
                      className="text-theme-primary font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {(response.candidate as any).full_name}
                    </Link>
                    {getTypeBadge(response.response_type)}
                    {getActionBadge(response.action)}
                  </div>
                  <div className="text-theme-primary/60 text-sm">
                    {(response.application as any).jobs.title}
                  </div>
                  <div className="text-theme-primary/40 text-xs mt-1">
                    Responded: {new Date(response.responded_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Response Details */}
              {response.action === 'reschedule' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                  <div className="text-amber-400 font-medium text-sm mb-2">
                    🔄 Reschedule Request
                  </div>
                  {response.requested_date && (
                    <div className="text-theme-primary/70 text-sm">
                      Preferred Date: <strong>{new Date(response.requested_date).toLocaleDateString('en-GB')}</strong>
                      {response.requested_time && ` at ${response.requested_time}`}
                    </div>
                  )}
                  {response.requested_start_date && (
                    <div className="text-theme-primary/70 text-sm">
                      Preferred Start Date: <strong>{new Date(response.requested_start_date).toLocaleDateString('en-GB')}</strong>
                    </div>
                  )}
                  {response.reschedule_reason && (
                    <div className="text-theme-primary/60 text-sm mt-2">
                      Reason: {response.reschedule_reason}
                    </div>
                  )}
                </div>
              )}

              {response.action === 'decline' && response.decline_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="text-red-400 font-medium text-sm mb-2">
                    ✗ Decline Reason
                  </div>
                  <div className="text-theme-primary/70 text-sm">
                    {response.decline_reason}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!response.processed && (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/people/recruitment/candidates/${(response.candidate as any).id}`}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-module-fg/[0.30] hover:bg-blue-100 dark:hover:bg-module-fg/10"
                  >
                    View Candidate
                  </Link>
                  <button
                    onClick={() => markProcessed(response.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10"
                  >
                    Mark as Processed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
