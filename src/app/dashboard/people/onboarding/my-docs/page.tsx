'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, FileText, CheckCircle, ExternalLink, Package } from 'lucide-react'
import { toast } from 'sonner'

type Assignment = {
  id: string
  pack_id: string
  sent_at: string
  message: string | null
}

type Pack = {
  id: string
  name: string
  staff_type?: 'head_office' | 'site_staff'
  boh_foh: 'FOH' | 'BOH' | 'BOTH'
  pay_type: 'hourly' | 'salaried'
}

type PackDoc = {
  id: string
  pack_id: string
  global_document_id: string
  required: boolean
  global_documents: {
    id: string
    name: string
    category: string | null
    version: string | null
    file_path: string | null
  } | null
}

type Acknowledgement = {
  assignment_id: string
  global_document_id: string
  acknowledged_at: string
}

function formatUnknownError(e: unknown): string {
  if (!e) return 'Unknown error'
  const anyE = e as any
  return anyE?.message || anyE?.error?.message || 'Unknown error'
}

function isPlaceholderFilePath(filePath: unknown): boolean {
  if (!filePath) return true
  if (typeof filePath !== 'string') return true
  return filePath.includes('/_placeholders/')
}

export default function MyOnboardingDocsPage() {
  const { profile } = useAppContext()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [packsById, setPacksById] = useState<Record<string, Pack>>({})
  const [docsByAssignment, setDocsByAssignment] = useState<Record<string, PackDoc[]>>({})
  const [acks, setAcks] = useState<Acknowledgement[]>([])
  
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)
  const [ackingKey, setAckingKey] = useState<string | null>(null)

  const ackSet = useMemo(() => {
    const s = new Set<string>()
    for (const a of acks) s.add(`${a.assignment_id}:${a.global_document_id}`)
    return s
  }, [acks])

  const loadAll = async () => {
    if (!profile?.id) {
      setErrorMsg('Profile not loaded')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      // Load assignments
      const { data: asData, error: asErr } = await supabase
        .from('employee_onboarding_assignments')
        .select('id, pack_id, sent_at, message')
        .eq('profile_id', profile.id)
        .order('sent_at', { ascending: false })
      if (asErr) throw asErr
      const assignmentsLocal = (asData || []) as Assignment[]
      setAssignments(assignmentsLocal)

      // Load packs
      const packIds = Array.from(new Set(assignmentsLocal.map((a) => a.pack_id)))
      if (packIds.length > 0) {
        const { data: packData, error: packErr } = await supabase
          .from('company_onboarding_packs')
          .select('id, name, staff_type, boh_foh, pay_type')
          .in('id', packIds)
        if (packErr) throw packErr

        const packsMap: Record<string, Pack> = {}
        for (const p of (packData || []) as Pack[]) {
          packsMap[p.id] = p
        }
        setPacksById(packsMap)

        // Load pack documents
        const { data: pdData, error: pdErr } = await supabase
          .from('company_onboarding_pack_documents')
          .select('id, pack_id, global_document_id, required, global_documents(id, name, category, version, file_path)')
          .in('pack_id', packIds)
          .order('sort_order')
        if (pdErr) throw pdErr

        const docsByAssignmentLocal: Record<string, PackDoc[]> = {}
        for (const a of assignmentsLocal) {
          docsByAssignmentLocal[a.id] = ((pdData || []) as PackDoc[]).filter((pd) => pd.pack_id === a.pack_id)
        }
        setDocsByAssignment(docsByAssignmentLocal)
      }

      // Load acknowledgements
      const assignmentIds = assignmentsLocal.map((a) => a.id)
      if (assignmentIds.length > 0) {
        const { data: ackData, error: ackErr } = await supabase
          .from('employee_document_acknowledgements')
          .select('assignment_id, global_document_id, acknowledged_at')
          .in('assignment_id', assignmentIds)
        if (ackErr) throw ackErr
        setAcks((ackData || []) as Acknowledgement[])
      }
    } catch (e: any) {
      console.error('Failed to load:', e)
      setErrorMsg(formatUnknownError(e))
    } finally {
      setLoading(false)
    }
  }

  const openDoc = async (doc: PackDoc) => {
    const gd = doc.global_documents
    if (!gd?.file_path || !gd?.id) return

    setOpeningDocId(gd.id)
    try {
      const { data, error } = await supabase.storage.from('global_docs').createSignedUrl(gd.file_path, 60)
      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (e: any) {
      console.error('Failed to open doc:', e)
      toast.error(`Failed to open document: ${formatUnknownError(e)}`)
    } finally {
      setOpeningDocId(null)
    }
  }

  const acknowledge = async (assignment: Assignment, doc: PackDoc) => {
    const gd = doc.global_documents
    if (!gd?.id || !profile?.id || !profile?.company_id) {
      toast.error('Missing required information')
      return
    }

    const key = `${assignment.id}:${gd.id}`
    setAckingKey(key)

    try {
      const { error } = await supabase.from('employee_document_acknowledgements').insert({
        company_id: profile.company_id,
        assignment_id: assignment.id,
        global_document_id: gd.id,
        profile_id: profile.id,
      })

      if (error) throw error

      toast.success('Document acknowledged')
      await loadAll()
    } catch (e: any) {
      console.error('Failed to acknowledge:', e)
      toast.error(`Failed to acknowledge: ${formatUnknownError(e)}`)
    } finally {
      setAckingKey(null)
    }
  }

  useEffect(() => {
    void loadAll()
     
  }, [profile?.id])

  if (!profile?.id) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-500 dark:text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile…
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Onboarding Documents</h1>
          <p className="text-sm text-gray-900 dark:text-white/60">Review and acknowledge your onboarding documents</p>
        </div>
        <Link href="/dashboard/people" className="text-sm text-[#EC4899] hover:underline">
          Back
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">{errorMsg}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 dark:text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your documents…
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-gray-900 dark:text-white/30 mx-auto mb-4" />
          <div className="text-gray-900 dark:text-white font-semibold text-lg">No onboarding packs assigned yet</div>
          <div className="text-gray-900 dark:text-white/60 text-sm mt-2">
            Your manager will assign an onboarding pack when you start. Check back soon!
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map((a) => {
            const pack = packsById[a.pack_id]
            const docs = docsByAssignment[a.id] || []
            const totalDocs = docs.length
            const acknowledgedDocs = docs.filter((d) =>
              ackSet.has(`${a.id}:${d.global_documents?.id}`)
            ).length

            return (
              <div key={a.id} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
                {/* Pack Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-[#EC4899] flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-gray-900 dark:text-white font-semibold text-lg">{pack?.name || 'Onboarding Pack'}</h2>
                      <div className="text-xs text-gray-900 dark:text-white/50 mt-1">
                        Assigned {new Date(a.sent_at).toLocaleDateString()}
                      </div>
                      {a.message && (
                        <div className="text-sm text-gray-900 dark:text-white/70 mt-2 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] rounded-lg">
                          {a.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#EC4899]">
                      {totalDocs > 0 ? Math.round((acknowledgedDocs / totalDocs) * 100) : 0}%
                    </div>
                    <div className="text-xs text-gray-900 dark:text-white/50">
                      {acknowledgedDocs}/{totalDocs} acknowledged
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#EC4899] to-[#EC4899]/70 transition-all duration-500"
                      style={{ width: `${totalDocs > 0 ? (acknowledgedDocs / totalDocs) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <div className="text-sm text-gray-900 dark:text-white/70 mb-3">Documents to Review ({totalDocs})</div>
                  {docs.length === 0 ? (
                    <div className="text-sm text-gray-900 dark:text-white/60 text-center py-4">
                      No documents found for this pack.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((d) => {
                        const gd = d.global_documents
                        const isAvailable = Boolean(gd?.file_path) && !isPlaceholderFilePath(gd?.file_path)
                        const key = `${a.id}:${gd?.id}`
                        const isAck = ackSet.has(key)

                        return (
                          <div
                            key={d.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText
                                className={`w-5 h-5 flex-shrink-0 ${isAck ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white/40'}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-900 dark:text-white font-medium">{gd?.name || 'Document'}</div>
                                <div className="text-xs text-gray-900 dark:text-white/50 mt-1">
                                  {gd?.category || 'Uncategorized'}
                                  {gd?.version ? ` • ${gd.version}` : ''}
                                  {!isAvailable ? ' • Not uploaded yet' : ''}
                                  {d.required ? ' • Required' : ' • Optional'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openDoc(d)}
                                disabled={!isAvailable || openingDocId === gd?.id}
                                className="text-sm text-[#EC4899] hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ExternalLink className="w-4 h-4" />
                                {openingDocId === gd?.id ? 'Opening…' : 'Open'}
                              </button>

                              {isAck ? (
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Acknowledged
                                </div>
                              ) : (
                                <button
                                  onClick={() => acknowledge(a, d)}
                                  disabled={!gd?.id || ackingKey === key || !isAvailable}
                                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {ackingKey === key ? 'Saving…' : "I've Read"}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
