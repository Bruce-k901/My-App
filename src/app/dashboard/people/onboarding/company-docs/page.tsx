'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import { FileText, ExternalLink, Loader2, Upload } from '@/components/ui/icons'
import { toast } from 'sonner'
import UploadGlobalDocModal from '@/components/modals/UploadGlobalDocModal'

type GlobalDocRow = {
  id: string
  company_id: string
  category: string | null
  name: string | null
  version: string | null
  expiry_date: string | null
  notes: string | null
  file_path: string | null
  created_at: string | null
  is_archived?: boolean | null
  is_placeholder?: boolean | null
  doc_key?: string | null
}

function formatUnknownError(e: unknown): string {
  if (!e) return 'Unknown error'
  if (typeof e === 'string') return e
  if (typeof e === 'number') return String(e)
  const anyE = e as any
  const msg = anyE?.message || anyE?.error?.message || anyE?.details || anyE?.hint
  const code = anyE?.code || anyE?.status
  let extra = ''
  try {
    const json = JSON.stringify(anyE)
    if (json && json !== '{}' && json !== '[]') extra = json
  } catch {
    // ignore
  }
  return [msg || 'Unknown error', code ? `(${code})` : null, extra || null].filter(Boolean).join(' ')
}

function isPlaceholderFilePath(filePath: unknown): boolean {
  if (!filePath) return true
  if (typeof filePath !== 'string') return true
  return filePath.includes('/_onboarding_placeholders/')
}

function getIsManagerLike(profile: any | null): boolean {
  const roleText = String(profile?.app_role || profile?.role || '').toLowerCase()
  return (
    roleText.includes('owner') ||
    roleText.includes('admin') ||
    roleText.includes('manager') ||
    roleText.includes('super')
  )
}

export default function OnboardingDocsPage() {
  const { profile, companyId } = useAppContext()
  const isManagerLike = getIsManagerLike(profile)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [docs, setDocs] = useState<GlobalDocRow[]>([])
  const [filterNote, setFilterNote] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [replaceDoc, setReplaceDoc] = useState<GlobalDocRow | null>(null)

  const load = async () => {
    if (!companyId) {
      setDocs([])
      setFilterNote(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setFilterNote(null)

    try {
      const baseSelect = 'id, company_id, category, name, version, expiry_date, notes, file_path, created_at'
      const selectWithAll = `${baseSelect}, is_archived, is_placeholder, doc_key`
      const selectNoArchive = `${baseSelect}, is_placeholder, doc_key`
      const selectLegacy = baseSelect

      let { data, error } = await supabase
        .from('global_documents')
        .select(selectWithAll)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error && (error.message?.includes('is_archived') || error.code === 'PGRST204')) {
        const retry = await supabase
          .from('global_documents')
          .select(selectNoArchive)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        data = retry.data
        error = retry.error
      }

      if (
        error &&
        (String((error as any)?.message || '').includes('is_placeholder') ||
          String((error as any)?.message || '').includes('doc_key') ||
          (error as any)?.code === 'PGRST204')
      ) {
        const retry = await supabase
          .from('global_documents')
          .select(selectLegacy)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        data = retry.data
        error = retry.error
      }

      if (error) throw error

      const all = (data || []) as GlobalDocRow[]
      let list = all.filter((d) => !(d as any).is_archived)

      // Prefer to show seeded onboarding kit docs (doc_key/is_placeholder), otherwise show HR/People-ish categories.
      const hasSeedCols = list.some((d) => d.doc_key || d.is_placeholder)
      const beforeFilterCount = list.length
      if (hasSeedCols) {
        list = list.filter((d) => Boolean(d.doc_key) || Boolean(d.is_placeholder))
      } else {
        const allowedCategories = new Set([
          'HR & People',
          'Contracts & Letters',
          'Payroll & Pay',
          'Data & IT',
          'Health & Safety',
          'Training & Development',
          'Operations',
        ])
        list = list.filter((d) => (d.category ? allowedCategories.has(d.category) : false))
      }

      // If our onboarding-focused filter removes everything but there ARE company docs, fall back to showing them.
      if (list.length === 0 && beforeFilterCount > 0) {
        list = all.filter((d) => !(d as any).is_archived)
        setFilterNote(
          'No onboarding-tagged docs found (seed columns missing or not seeded yet). Showing all company docs instead.'
        )
      }

      setDocs(list)
    } catch (e: any) {
      console.error('Failed to load onboarding docs:', e)
      setErrorMsg(formatUnknownError(e))
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  const seedStarterKit = async () => {
    if (!companyId) {
      toast.error('Company context not loaded yet')
      return
    }

    setSeeding(true)
    try {
      const { data, error } = await supabase.rpc('seed_company_wfm_starter_kit', { p_company_id: companyId })
      if (error) throw error
      const anyData = data as any
      toast.success(`Starter kit created: ${anyData?.docs_inserted ?? 0} docs, ${anyData?.packs_inserted ?? 0} packs`)
      await load()
    } catch (e: any) {
      console.error('Seed starter kit failed:', e)
      toast.error(`Failed to create starter kit: ${formatUnknownError(e)}`)
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    void load()
     
  }, [companyId])

  const counts = useMemo(() => {
    const total = docs.length
    const uploaded = docs.filter((d) => d.file_path && !isPlaceholderFilePath(d.file_path)).length
    const placeholders = total - uploaded
    return { total, uploaded, placeholders }
  }, [docs])

  const openDoc = async (doc: GlobalDocRow) => {
    if (!doc.file_path) return
    try {
      const { data, error } = await supabase.storage.from('global_docs').createSignedUrl(doc.file_path, 60)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      console.error('Open doc failed:', e)
      toast.error(`Could not open document: ${formatUnknownError(e)}`)
    }
  }

  if (!profile?.id) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-theme-secondary">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          Loading profile…
        </div>
      </div>
    )
  }

  if (!isManagerLike) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-theme-primary">Onboarding docs</h1>
          <p className="text-sm text-theme-primary/60">This page is for managers/admins to manage company onboarding documents.</p>
        </div>
        <Link href="/dashboard/people/onboarding" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Back to onboarding
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-theme-primary">Company Onboarding Documents</h1>
          <p className="text-sm text-theme-primary/60 mt-1">
            Manage the document library for employee onboarding (contracts, forms, policies)
          </p>
          <p className="text-xs text-theme-secondary/40 mt-1">
            💡 For general company compliance documents (insurance, HACCP), upload them on the main <strong>Documents</strong> page
          </p>
            <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
              <div className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-1">📘 Quick Start Guide</div>
              <ol className="text-xs text-blue-800 dark:text-blue-200/80 space-y-1 ml-4 list-decimal">
                <li>Click <strong>"Create starter kit"</strong> to generate 13 essential document placeholders</li>
                <li>Upload your own versions: <strong>Contracts (FOH/BOH × Hourly/Salaried)</strong>, Staff Handbook, Forms</li>
                <li>Go to <strong>Onboarding Packs</strong> to customize which documents appear in each pack</li>
                <li>Go to <strong>People to Onboard</strong> to assign packs to employees</li>
              </ol>
              <div className="text-xs text-blue-700 dark:text-blue-200/60 mt-2 italic">
                💡 Tip: Focus on uploading your employment contracts and staff handbook first
              </div>
            </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={() => void seedStarterKit()}
            disabled={seeding || !companyId}
            className="px-4 py-2 rounded-lg text-sm bg-module-fg hover:bg-module-fg/90 text-white transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-sm dark:shadow-none"
            title="Generate recommended onboarding document placeholders and starter packs"
          >
            {seeding ? 'Creating…' : '✨ Create starter kit'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-theme-secondary hover:text-theme-primary/60 border border-theme"
              title="Refresh"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/people/onboarding/packs"
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-theme-secondary hover:text-theme-primary/60 border border-theme rounded-lg"
              >
                Manage Packs
              </Link>
              <Link href="/dashboard/people/onboarding" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-sm text-red-900 dark:text-red-200">{errorMsg}</div>
      )}

      {!companyId && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-200">
          Company context is not loaded yet. If this stays stuck, it usually means the profile/company lookup hasn’t
          finished or the user isn’t attached to a company.
        </div>
      )}

      {filterNote && (
        <div className="bg-theme-surface border border-theme rounded-lg p-3 text-sm text-theme-primary/70">
          {filterNote}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-theme-surface border border-theme rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-theme-secondary/50 mb-1">Total Documents</div>
              <div className="text-theme-primary font-bold text-2xl">{counts.total}</div>
            </div>
            <FileText className="w-8 h-8 text-theme-tertiary/20" />
          </div>
        </div>
        <div className="bg-green-50 dark:bg-gradient-to-br dark:from-green-500/10 dark:to-green-500/5 border border-green-200 dark:border-green-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-600 dark:text-green-400/70 mb-1">Ready to Use</div>
              <div className="text-green-600 dark:text-green-400 font-bold text-2xl">{counts.uploaded}</div>
              <div className="text-xs text-green-600 dark:text-green-400/60 mt-1">
                {counts.total > 0 ? Math.round((counts.uploaded / counts.total) * 100) : 0}% complete
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-400/20 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-700 dark:text-amber-400/70 mb-1">Need Upload</div>
              <div className="text-amber-600 dark:text-amber-400 font-bold text-2xl">{counts.placeholders}</div>
              {counts.placeholders > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400/60 mt-1">Upload these to complete setup</div>
              )}
            </div>
            <Upload className="w-8 h-8 text-amber-600 dark:text-amber-400/40" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-theme-secondary">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          Loading docs…
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-theme-primary/30 mx-auto mb-4" />
          <div className="text-theme-primary font-semibold text-lg">No onboarding documents yet</div>
          <div className="text-theme-secondary text-sm mt-2 max-w-md mx-auto">
            Click <strong>"Create starter kit"</strong> above to generate a complete set of recommended onboarding document placeholders.
            You can then upload your own documents to replace them.
          </div>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-theme text-xs font-medium text-theme-secondary/50 bg-gray-50 dark:bg-white/[0.02]">
            <div className="col-span-5">Document Name & Description</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {docs.map((d) => {
              const hasFile = Boolean(d.file_path) && !isPlaceholderFilePath(d.file_path)
              return (
                <div key={d.id} className={`grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50 dark:bg-white/[0.02] transition-colors ${!hasFile ? 'bg-amber-500/5' : ''}`}>
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${hasFile ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-theme-primary font-medium text-sm">{d.name || 'Document'}</div>
                        {d.notes && <div className="text-xs text-theme-secondary/50 mt-1 line-clamp-2">{d.notes}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-theme-secondary border border-theme">
                      {d.category || 'Other'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {hasFile ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
                        Uploaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse"></span>
                        Needs upload
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    {hasFile && (
                      <button
                        onClick={() => openDoc(d)}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-theme-secondary hover:text-theme-primary/60 border border-theme rounded-lg flex items-center gap-1.5 transition-all"
                        title="Open and view document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setReplaceDoc(d)
                        setUploadOpen(true)
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                        hasFile 
                          ? 'bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-theme-secondary hover:text-theme-primary/60 border border-theme' 
                          : 'bg-module-fg hover:bg-module-fg/90 text-white font-medium shadow-sm dark:shadow-none'
                      }`}
                      title={hasFile ? 'Replace this document with a new version' : 'Upload your document to replace this placeholder'}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {hasFile ? 'Replace' : 'Upload'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <UploadGlobalDocModal
            existingDocumentId={replaceDoc?.id}
            initialCategory={replaceDoc?.category || ''}
            initialName={replaceDoc?.name || ''}
            initialNotes={replaceDoc?.notes || ''}
            onClose={() => {
              setUploadOpen(false)
              setReplaceDoc(null)
            }}
            onSuccess={() => {
              setUploadOpen(false)
              setReplaceDoc(null)
              void load()
            }}
          />
        </div>
      )}
    </div>
  )
}

