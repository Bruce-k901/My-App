'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Package, FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'

type Pack = {
  id: string
  name: string
  description: string | null
  boh_foh: 'FOH' | 'BOH' | 'BOTH'
  pay_type: 'hourly' | 'salaried'
  is_active: boolean
}

type PackDoc = {
  id: string
  pack_id: string
  global_document_id: string
  required: boolean
  sort_order: number
  global_documents: {
    id: string
    name: string
    category: string | null
    file_path: string | null
  } | null
}

type GlobalDoc = {
  id: string
  name: string | null
  category: string | null
  file_path: string | null
}

function formatUnknownError(e: unknown): string {
  if (!e) return 'Unknown error'
  const anyE = e as any
  return anyE?.message || anyE?.error?.message || 'Unknown error'
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

export default function OnboardingPacksPage() {
  const { profile } = useAppContext()
  const companyId = profile?.company_id as string | undefined
  const isManagerLike = getIsManagerLike(profile)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [packs, setPacks] = useState<Pack[]>([])
  const [packDocs, setPackDocs] = useState<PackDoc[]>([])
  const [globalDocs, setGlobalDocs] = useState<GlobalDoc[]>([])
  const [selectedPackId, setSelectedPackId] = useState<string>('')
  const [expandedPackIds, setExpandedPackIds] = useState<Set<string>>(new Set())

  // Create pack state
  const [creatingPack, setCreatingPack] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPackName, setNewPackName] = useState('')
  const [newPackDescription, setNewPackDescription] = useState('')
  const [newPackBohFoh, setNewPackBohFoh] = useState<'FOH' | 'BOH' | 'BOTH'>('FOH')
  const [newPackPayType, setNewPackPayType] = useState<'hourly' | 'salaried'>('hourly')

  // Add doc to pack
  const [addingDoc, setAddingDoc] = useState(false)
  const [docToAdd, setDocToAdd] = useState<string>('')

  const load = async () => {
    if (!companyId) {
      setErrorMsg('Missing company context')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      // Load packs
      const { data: packData, error: packErr } = await supabase
        .from('company_onboarding_packs')
        .select('id, name, description, boh_foh, pay_type, is_active')
        .eq('company_id', companyId)
        .order('name')
      if (packErr) throw packErr
      setPacks((packData || []) as Pack[])

      // Load pack documents with global document details
      const { data: pdData, error: pdErr } = await supabase
        .from('company_onboarding_pack_documents')
        .select('id, pack_id, global_document_id, required, sort_order, global_documents(id, name, category, file_path)')
        .order('sort_order')
      if (pdErr) throw pdErr
      setPackDocs((pdData || []) as PackDoc[])

      // Load only onboarding documents (filter out general company docs)
      const { data: gdData, error: gdErr } = await supabase
        .from('global_documents')
        .select('id, name, category, file_path')
        .eq('company_id', companyId)
        .order('name')
      if (gdErr) throw gdErr
      
      // Filter to only include onboarding documents
      // Accept both new format ("Onboarding - Contracts") and old format ("Contracts")
      const onboardingCategories = [
        'Contracts', 'Policies', 'Forms', 'Compliance', 'Training',
        'Onboarding - Contracts', 'Onboarding - Policies', 
        'Onboarding - Forms', 'Onboarding - Training'
      ]
      const onboardingDocs = (gdData || []).filter((doc: any) => 
        doc.category && onboardingCategories.includes(doc.category)
      )
      setGlobalDocs(onboardingDocs as GlobalDoc[])

      // Auto-select first pack
      if ((packData || []).length > 0 && !selectedPackId) {
        setSelectedPackId((packData![0] as Pack).id)
      }
    } catch (e: any) {
      console.error('Failed to load:', e)
      setErrorMsg(formatUnknownError(e))
    } finally {
      setLoading(false)
    }
  }

  const createPack = async () => {
    if (!companyId || !newPackName.trim()) {
      toast.error('Please enter a pack name')
      return
    }

    setCreatingPack(true)
    try {
      const { error } = await supabase.from('company_onboarding_packs').insert({
        company_id: companyId,
        name: newPackName.trim(),
        description: newPackDescription.trim() || null,
        boh_foh: newPackBohFoh,
        pay_type: newPackPayType,
        is_active: true,
      })

      if (error) throw error

      toast.success('Pack created!')
      setNewPackName('')
      setNewPackDescription('')
      setShowCreateForm(false)
      await load()
    } catch (e: any) {
      console.error('Failed to create pack:', e)
      toast.error(`Failed to create pack: ${formatUnknownError(e)}`)
    } finally {
      setCreatingPack(false)
    }
  }

  const addDocToPack = async () => {
    if (!selectedPackId || !docToAdd) {
      toast.error('Please select a document')
      return
    }

    setAddingDoc(true)
    try {
      const { error } = await supabase.from('company_onboarding_pack_documents').insert({
        pack_id: selectedPackId,
        global_document_id: docToAdd,
        required: true,
        sort_order: packDocs.filter((pd) => pd.pack_id === selectedPackId).length,
      })

      if (error) throw error

      toast.success('Document added to pack!')
      setDocToAdd('')
      await load()
    } catch (e: any) {
      console.error('Failed to add document:', e)
      toast.error(`Failed to add document: ${formatUnknownError(e)}`)
    } finally {
      setAddingDoc(false)
    }
  }

  const removeDocFromPack = async (docId: string) => {
    if (!window.confirm('Remove this document from the pack?')) return

    try {
      const { error } = await supabase.from('company_onboarding_pack_documents').delete().eq('id', docId)
      if (error) throw error
      toast.success('Document removed')
      await load()
    } catch (e: any) {
      console.error('Failed to remove document:', e)
      toast.error(`Failed to remove: ${formatUnknownError(e)}`)
    }
  }

  const toggleRequired = async (docId: string, currentRequired: boolean) => {
    try {
      const { error } = await supabase
        .from('company_onboarding_pack_documents')
        .update({ required: !currentRequired })
        .eq('id', docId)
      if (error) throw error
      toast.success(currentRequired ? 'Marked as optional' : 'Marked as required')
      await load()
    } catch (e: any) {
      console.error('Failed to update:', e)
      toast.error(`Failed to update: ${formatUnknownError(e)}`)
    }
  }

  useEffect(() => {
    if (companyId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  if (!profile?.id) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile…
        </div>
      </div>
    )
  }

  if (!isManagerLike) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Onboarding Packs</h1>
          <p className="text-sm text-white/60">This page is for managers/admins only.</p>
        </div>
        <Link href="/dashboard/people/onboarding/my-docs" className="text-sm text-[#EC4899] hover:underline">
          View My Onboarding Docs
        </Link>
      </div>
    )
  }

  const selectedPack = packs.find((p) => p.id === selectedPackId)
  const selectedPackDocs = packDocs.filter((pd) => pd.pack_id === selectedPackId)
  const availableDocsToAdd = globalDocs.filter(
    (gd) => !selectedPackDocs.some((pd) => pd.global_document_id === gd.id)
  )

  const togglePackExpanded = (packId: string) => {
    const newExpanded = new Set(expandedPackIds)
    if (newExpanded.has(packId)) {
      newExpanded.delete(packId)
    } else {
      newExpanded.add(packId)
    }
    setExpandedPackIds(newExpanded)
  }

  const getPackDocCount = (packId: string) => {
    return packDocs.filter((pd) => pd.pack_id === packId).length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Onboarding Packs</h1>
          <p className="text-sm text-white/60">Create and manage onboarding document packs for different roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/people/onboarding/company-docs"
            className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-lg"
          >
            Manage Docs
          </Link>
          <Link href="/dashboard/people/onboarding" className="text-sm text-[#EC4899] hover:underline">
            Back
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">{errorMsg}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* Create Pack Button/Form */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 rounded-lg text-sm bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Pack
            </button>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Onboarding Pack</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Pack Name *</label>
                  <input
                    type="text"
                    value={newPackName}
                    onChange={(e) => setNewPackName(e.target.value)}
                    placeholder="e.g., FOH - Hourly Staff"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Description</label>
                  <input
                    type="text"
                    value={newPackDescription}
                    onChange={(e) => setNewPackDescription(e.target.value)}
                    placeholder="e.g., For front-of-house hourly employees"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">BOH/FOH</label>
                  <Select
                    value={newPackBohFoh}
                    onValueChange={(v) => setNewPackBohFoh(v as 'FOH' | 'BOH' | 'BOTH')}
                    options={[
                      { label: 'FOH (Front of House)', value: 'FOH' },
                      { label: 'BOH (Back of House)', value: 'BOH' },
                      { label: 'BOTH', value: 'BOTH' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Pay Type</label>
                  <Select
                    value={newPackPayType}
                    onValueChange={(v) => setNewPackPayType(v as 'hourly' | 'salaried')}
                    options={[
                      { label: 'Hourly', value: 'hourly' },
                      { label: 'Salaried', value: 'salaried' },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => void createPack()}
                  disabled={creatingPack || !newPackName.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-transparent text-[#EC4899] border border-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50"
                >
                  {creatingPack ? 'Creating…' : 'Create Pack'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Packs List & Editor */}
          {packs.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <div className="text-white font-semibold text-lg">No onboarding packs yet</div>
              <div className="text-white/60 text-sm mt-2">
                Create a starter kit or add your first pack to get started
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pack List with Expandable Documents */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <h2 className="text-white font-semibold mb-3">Packs ({packs.length})</h2>
                <div className="space-y-3">
                  {packs.map((p) => {
                    const packDocsList = packDocs.filter((pd) => pd.pack_id === p.id)
                    const isExpanded = expandedPackIds.has(p.id)
                    const docCount = getPackDocCount(p.id)

                    return (
                      <div
                        key={p.id}
                        className="border border-white/[0.05] rounded-lg bg-white/[0.02] overflow-hidden"
                      >
                        {/* Pack Header */}
                        <div className="flex items-center justify-between p-3">
                          <button
                            onClick={() => togglePackExpanded(p.id)}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-white/50 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-white">{p.name}</div>
                              <div className="text-xs text-white/50 mt-0.5">
                                {p.boh_foh} • {p.pay_type} • {docCount} {docCount === 1 ? 'doc' : 'docs'}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => setSelectedPackId(p.id)}
                            className="px-3 py-1.5 rounded text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                          >
                            Edit
                          </button>
                        </div>

                        {/* Expandable Document List */}
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-3 bg-white/[0.02] space-y-2">
                            {packDocsList.length === 0 ? (
                              <div className="text-xs text-white/40 text-center py-2">
                                No documents yet
                              </div>
                            ) : (
                              packDocsList.map((pd) => {
                                const gd = pd.global_documents
                                return (
                                  <div
                                    key={pd.id}
                                    className="flex items-center gap-2 p-2 rounded bg-white/[0.02] border border-white/[0.03]"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-white truncate">
                                        {gd?.name || 'Unnamed'}
                                      </div>
                                      <div className="text-[10px] text-white/40">
                                        {pd.required ? 'Required' : 'Optional'}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pack Editor */}
              <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                {selectedPack ? (
                  <>
                    <div className="mb-6">
                      <h2 className="text-white font-semibold text-lg">{selectedPack.name}</h2>
                      {selectedPack.description && (
                        <p className="text-white/60 text-sm mt-1">{selectedPack.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                          {selectedPack.boh_foh}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                          {selectedPack.pay_type}
                        </span>
                      </div>
                    </div>

                    {/* Add Document */}
                    <div className="mb-6">
                      <label className="text-sm text-white/70 block mb-2">Add Document to Pack</label>
                      <div className="flex gap-2">
                        <Select
                          value={docToAdd}
                          onValueChange={setDocToAdd}
                          options={availableDocsToAdd.map((gd) => ({
                            label: gd.name || 'Unnamed',
                            value: gd.id,
                          }))}
                          placeholder="Select a document…"
                          className="flex-1"
                        />
                        <button
                          onClick={() => void addDocToPack()}
                          disabled={!docToAdd || addingDoc}
                          className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/15 border border-white/10 text-white disabled:opacity-50"
                        >
                          {addingDoc ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {/* Documents in Pack */}
                    <div>
                      <div className="text-sm text-white/70 mb-2">
                        Documents in Pack ({selectedPackDocs.length})
                      </div>
                      {selectedPackDocs.length === 0 ? (
                        <div className="text-center py-8 text-white/60 text-sm">
                          No documents in this pack yet. Add some above!
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedPackDocs.map((pd) => {
                            const gd = pd.global_documents
                            return (
                              <div
                                key={pd.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <FileText className="w-4 h-4 text-white/40 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white text-sm font-medium truncate">
                                      {gd?.name || 'Unnamed'}
                                    </div>
                                    <div className="text-xs text-white/50">
                                      {gd?.category || 'Uncategorized'} •{' '}
                                      {pd.required ? 'Required' : 'Optional'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => void toggleRequired(pd.id, pd.required)}
                                    className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                                  >
                                    {pd.required ? 'Make Optional' : 'Make Required'}
                                  </button>
                                  <button
                                    onClick={() => void removeDocFromPack(pd.id)}
                                    className="px-2 py-1 rounded text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-white/60">Select a pack to edit</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
