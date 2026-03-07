'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Users, Package, CheckCircle } from '@/components/ui/icons'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'

type Assignment = {
  id: string
  profile_id: string
  pack_id: string
  sent_at: string
  sent_by: string | null
}

type Pack = {
  id: string
  name: string
  staff_type?: 'head_office' | 'site_staff'
  boh_foh: 'FOH' | 'BOH' | 'BOTH'
  pay_type: 'hourly' | 'salaried'
}

type Employee = {
  id: string
  full_name: string | null
  email: string | null
}

function formatUnknownError(e: unknown): string {
  if (!e) return 'Unknown error'
  if (typeof e === 'string') return e
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

export default function PeopleToOnboardPage() {
  const { profile, companyId } = useAppContext()
  const isManagerLike = getIsManagerLike(profile)
  const searchParams = useSearchParams()
  const initialEmployeeId = searchParams.get('employeeId')

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [packs, setPacks] = useState<Pack[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [ackCounts, setAckCounts] = useState<Record<string, { total: number; acknowledged: number }>>({})

  // Assign pack state
  const [assigning, setAssigning] = useState(false)
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>(initialEmployeeId || '')
  const [assignPackId, setAssignPackId] = useState<string>('')
  const [assignMessage, setAssignMessage] = useState<string>('')

  const load = async () => {
    if (!companyId) {
      setErrorMsg('Missing company context')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      // Load employees
      const { data: empData, error: empErr } = await supabase.rpc('get_company_profiles', { p_company_id: companyId })
      if (empErr) throw empErr
      // Map profile_id to id to match Employee type
      const mappedEmployees = (empData || []).map((emp: any) => ({
        id: emp.profile_id,
        full_name: emp.full_name,
        email: emp.email,
      }))
      setEmployees(mappedEmployees)

      // Load packs
      const { data: packData, error: packErr } = await supabase
        .from('company_onboarding_packs')
        .select('id, name, staff_type, boh_foh, pay_type')
        .eq('company_id', companyId)
        .order('name')
      if (packErr) throw packErr
      // Map with fallback for existing records
      const mappedPacks = (packData || []).map((p: any) => ({
        ...p,
        staff_type: p.staff_type || 'site_staff',
      }))
      setPacks(mappedPacks as Pack[])

      // Load assignments
      const { data: asData, error: asErr } = await supabase
        .from('employee_onboarding_assignments')
        .select('id, profile_id, pack_id, sent_at, sent_by')
        .eq('company_id', companyId)
        .order('sent_at', { ascending: false })
      if (asErr) throw asErr
      setAssignments((asData || []) as Assignment[])

      // Load acknowledgment counts
      const assignmentIds = (asData || []).map((a: any) => a.id)
      if (assignmentIds.length > 0) {
        const { data: ackData, error: ackErr } = await supabase
          .from('employee_document_acknowledgements')
          .select('assignment_id')
          .in('assignment_id', assignmentIds)
        
        if (!ackErr) {
          const counts: Record<string, { total: number; acknowledged: number }> = {}
          for (const a of asData || []) {
            const ackCount = (ackData || []).filter((ack: any) => ack.assignment_id === (a as any).id).length
            counts[(a as any).id] = { total: 0, acknowledged: ackCount }
          }
          setAckCounts(counts)
        }
      }
    } catch (e: any) {
      console.error('Failed to load:', e)
      setErrorMsg(formatUnknownError(e))
    } finally {
      setLoading(false)
    }
  }

  const assignPack = async () => {
    if (!companyId || !assignEmployeeId || !assignPackId) {
      toast.error('Please select an employee and pack')
      return
    }

    setAssigning(true)
    try {
      const { error } = await supabase.from('employee_onboarding_assignments').insert({
        company_id: companyId,
        profile_id: assignEmployeeId,
        pack_id: assignPackId,
        sent_by: profile?.id,
        message: assignMessage || null,
      })

      if (error) throw error

      toast.success('Onboarding pack assigned!')
      setAssignEmployeeId('')
      setAssignPackId('')
      setAssignMessage('')
      await load()
    } catch (e: any) {
      console.error('Failed to assign pack:', e)
      toast.error(`Failed to assign pack: ${formatUnknownError(e)}`)
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    if (companyId) void load()
     
  }, [companyId])

  if (!profile?.id) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-theme-tertiary">
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
          <h1 className="text-xl font-semibold text-theme-primary">People to Onboard</h1>
          <p className="text-sm text-theme-primary/60">This page is for managers/admins only.</p>
        </div>
        <Link href="/dashboard/people/onboarding/my-docs" className="text-sm text-module-fg hover:underline">
          View My Onboarding Docs
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-theme-primary">People to Onboard</h1>
          <p className="text-sm text-theme-primary/60">Assign onboarding packs to employees and track their progress</p>
        </div>
        <Link href="/dashboard/people" className="text-sm text-module-fg hover:underline">
          Back to People
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">{errorMsg}</div>
      )}

      {/* Quick Links */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/people/onboarding/company-docs"
 className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-theme-muted border border-theme text-theme-primary/80 rounded-lg"
        >
          Manage Docs
        </Link>
        <Link
          href="/dashboard/people/onboarding/packs"
 className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-theme-muted border border-theme text-theme-primary/80 rounded-lg"
        >
          Manage Packs
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-theme-tertiary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* Assign Pack Section */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-module-fg" />
              <h2 className="text-lg font-semibold text-theme-primary">Assign Onboarding Pack</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-theme-primary/50 block mb-1">Employee</label>
                <Select
                  value={assignEmployeeId}
                  onValueChange={setAssignEmployeeId}
                  options={employees
                    .filter((e) => e.id) // Filter out employees without IDs
                    .map((e) => ({
                      label: e.full_name || e.email || 'Unknown',
                      value: e.id,
                    }))}
                  placeholder="Select employee…"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-theme-primary/50 block mb-1">Onboarding Pack</label>
                  <Select
                    value={assignPackId}
                    onValueChange={setAssignPackId}
                    options={packs.map((p) => {
                      const staffTypeLabel = p.staff_type === 'head_office' ? 'Head Office' : 'Site Staff'
                      const bohFohLabel = p.staff_type === 'site_staff' ? `${p.boh_foh} ` : ''
                      return {
                        label: `${p.name} (${staffTypeLabel}${bohFohLabel}${p.pay_type})`,
                        value: p.id,
                      }
                    })}
                    placeholder="Select pack…"
                    className="w-full"
                  />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => void assignPack()}
                  disabled={!assignEmployeeId || !assignPackId || assigning}
                  className="w-full px-4 py-2 rounded-lg text-sm bg-transparent text-module-fg border border-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning…' : 'Assign Pack'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs text-theme-primary/50 block mb-1">Optional Message (sent with pack)</label>
              <textarea
                value={assignMessage}
                onChange={(e) => setAssignMessage(e.target.value)}
                placeholder="e.g., Welcome to the team! Please review these documents..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-theme rounded-lg text-theme-primary text-sm placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary"
              />
            </div>
          </div>

          {/* Assignments List */}
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-module-fg" />
              <h2 className="text-lg font-semibold text-theme-primary">Assigned Onboarding ({assignments.length})</h2>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-8 text-theme-primary/60">
                No onboarding assignments yet. Assign a pack to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const employee = employees.find((e) => e.id === a.profile_id)
                  const pack = packs.find((p) => p.id === a.pack_id)
                  const counts = ackCounts[a.id] || { total: 0, acknowledged: 0 }

                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:bg-white dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-theme-primary font-medium">
                          {employee?.full_name || employee?.email || 'Unknown Employee'}
                        </div>
                        <div className="text-xs text-theme-primary/50 mt-1">
                          {pack?.name || 'Unknown Pack'} • Assigned {new Date(a.sent_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {counts.acknowledged > 0 && (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{counts.acknowledged} acknowledged</span>
                          </div>
                        )}
                        <Link
                          href={`/dashboard/people/onboarding?employeeId=${a.profile_id}`}
                          className="text-sm text-module-fg hover:underline"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
