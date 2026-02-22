'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { X, User, Search, Mail, Plus, Bell } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import type { NotificationConfig, NotificationRecipient } from '@/types/checklist'

interface NotificationConfigSectionProps {
  config: NotificationConfig | null
  onChange: (config: NotificationConfig | null) => void
  companyId: string
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role?: string
  site_name?: string | null
}

const PLACEHOLDERS = [
  { tag: '{task_name}', label: 'Task Name' },
  { tag: '{completed_by}', label: 'Completed By' },
  { tag: '{site_name}', label: 'Site Name' },
  { tag: '{date}', label: 'Date' },
  { tag: '{time}', label: 'Time' },
  { tag: '{company_name}', label: 'Company' },
]

const DEFAULT_SUBJECT = 'Task Completed: {task_name}'
const DEFAULT_MESSAGE = '{completed_by} has completed {task_name} at {site_name}'

export default function NotificationConfigSection({
  config,
  onChange,
  companyId,
}: NotificationConfigSectionProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [externalName, setExternalName] = useState('')
  const [externalEmail, setExternalEmail] = useState('')

  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const enabled = config?.enabled ?? false

  // Fetch company users when enabled
  useEffect(() => {
    if (!enabled || !companyId) return

    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        // Build site lookup
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
        const siteMap: Record<string, string> = {}
        if (sitesData) {
          sitesData.forEach((s) => {
            if (s.id && s.name) siteMap[s.id] = s.name
          })
        }

        // Try RPC first
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_company_profiles',
          { p_company_id: companyId }
        )

        if (rpcData && !rpcError) {
          setUsers(
            rpcData.map((p: any) => ({
              id: p.profile_id,
              full_name: p.full_name,
              email: p.email,
              role: p.app_role,
              site_name: p.home_site ? siteMap[p.home_site] || null : null,
            }))
          )
        } else {
          // Fallback
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, app_role, site_id')
            .eq('company_id', companyId)
            .order('full_name')

          if (data) {
            setUsers(
              data.map((u: any) => ({
                id: u.id,
                full_name: u.full_name,
                email: u.email,
                role: u.app_role,
                site_name: u.site_id ? siteMap[u.site_id] || null : null,
              }))
            )
          }
        }
      } catch (err) {
        console.error('Error fetching users for notification recipients:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [enabled, companyId])

  // Filter users for dropdown
  const filteredUsers = useMemo(() => {
    const selectedUserIds = (config?.recipients || [])
      .filter((r) => r.type === 'user')
      .map((r) => r.user_id)

    return users.filter((u) => {
      if (selectedUserIds.includes(u.id)) return false
      if (!userSearch) return true
      const q = userSearch.toLowerCase()
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      )
    })
  }, [users, userSearch, config?.recipients])

  const updateConfig = (updates: Partial<NotificationConfig>) => {
    const current: NotificationConfig = config || {
      enabled: true,
      trigger: 'on_completion',
      subject: DEFAULT_SUBJECT,
      message: DEFAULT_MESSAGE,
      recipients: [],
    }
    onChange({ ...current, ...updates })
  }

  const handleToggle = () => {
    if (enabled) {
      onChange(null)
    } else {
      onChange({
        enabled: true,
        trigger: 'on_completion',
        subject: DEFAULT_SUBJECT,
        message: DEFAULT_MESSAGE,
        recipients: [],
      })
    }
  }

  const addUserRecipient = (user: UserProfile) => {
    const recipients = [...(config?.recipients || [])]
    recipients.push({
      type: 'user',
      user_id: user.id,
      name: user.full_name || user.email,
    })
    updateConfig({ recipients })
    setUserSearch('')
    setUserDropdownOpen(false)
  }

  const addExternalRecipient = () => {
    if (!externalEmail.trim()) return
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalEmail.trim())) return

    const recipients = [...(config?.recipients || [])]
    recipients.push({
      type: 'external',
      email: externalEmail.trim(),
      name: externalName.trim() || undefined,
    })
    updateConfig({ recipients })
    setExternalName('')
    setExternalEmail('')
  }

  const removeRecipient = (index: number) => {
    const recipients = [...(config?.recipients || [])]
    recipients.splice(index, 1)
    updateConfig({ recipients })
  }

  const insertPlaceholder = (
    tag: string,
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    field: 'subject' | 'message'
  ) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const currentVal = config?.[field] || ''
    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end)
    updateConfig({ [field]: newVal })
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus()
      const newPos = start + tag.length
      el.setSelectionRange(newPos, newPos)
    })
  }

  const userRecipients = (config?.recipients || []).filter((r) => r.type === 'user')
  const externalRecipients = (config?.recipients || []).filter((r) => r.type === 'external')

  return (
    <div className="mb-6 pb-6 border-b border-theme">
      {/* Section Header with Toggle */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D37E91]" />
          <h2 className="text-lg font-semibold text-theme-primary">Notifications</h2>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-[#D37E91]' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <p className="text-sm text-theme-secondary mb-4">
        Send email notifications when tasks from this template are completed
      </p>

      {enabled && (
        <div className="space-y-4">
          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Email Subject
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={config?.subject || ''}
              onChange={(e) => updateConfig({ subject: e.target.value })}
              placeholder={DEFAULT_SUBJECT}
              className="w-full p-2 border border-theme rounded bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => insertPlaceholder(p.tag, subjectRef, 'subject')}
                  className="text-xs px-2 py-0.5 rounded-full bg-[#D37E91]/10 text-[#D37E91] hover:bg-[#D37E91]/20 transition-colors"
                >
                  {p.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">
              Notification Message
            </label>
            <textarea
              ref={messageRef}
              value={config?.message || ''}
              onChange={(e) => updateConfig({ message: e.target.value })}
              placeholder={DEFAULT_MESSAGE}
              rows={3}
              className="w-full p-2 border border-theme rounded bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91] resize-none"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => insertPlaceholder(p.tag, messageRef, 'message')}
                  className="text-xs px-2 py-0.5 rounded-full bg-[#D37E91]/10 text-[#D37E91] hover:bg-[#D37E91]/20 transition-colors"
                >
                  {p.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">
              Recipients
            </label>

            {/* Selected Recipients Pills */}
            {(config?.recipients || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(config?.recipients || []).map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      r.type === 'user'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                    }`}
                  >
                    {r.type === 'user' ? (
                      <User className="w-3 h-3" />
                    ) : (
                      <Mail className="w-3 h-3" />
                    )}
                    {r.name || r.email || 'Unknown'}
                    <button
                      type="button"
                      onClick={() => removeRecipient(i)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Internal User Selector */}
            <div className="mb-3">
              <p className="text-xs text-theme-secondary mb-1.5">Team Members</p>
              <div className="relative">
                <div className="flex items-center border border-theme rounded bg-theme-surface">
                  <Search className="w-4 h-4 text-theme-secondary ml-2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setUserDropdownOpen(true)
                    }}
                    onFocus={() => setUserDropdownOpen(true)}
                    placeholder={loadingUsers ? 'Loading users...' : 'Search team members...'}
                    className="flex-1 p-2 bg-transparent text-theme-primary text-sm focus:outline-none"
                  />
                </div>

                {userDropdownOpen && filteredUsers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-theme-surface border border-theme rounded-lg shadow-lg">
                    {filteredUsers.slice(0, 20).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addUserRecipient(user)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-theme-hover transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#D37E91]/15 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-[#D37E91]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-theme-primary truncate">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-xs text-theme-secondary truncate">
                            {[user.role, user.site_name].filter(Boolean).join(' · ') || user.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* External Email Input */}
            <div>
              <p className="text-xs text-theme-secondary mb-1.5">External Recipients</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-1/3 p-2 border border-theme rounded bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                />
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addExternalRecipient()
                    }
                  }}
                  placeholder="email@example.com"
                  className="flex-1 p-2 border border-theme rounded bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                />
                <button
                  type="button"
                  onClick={addExternalRecipient}
                  disabled={!externalEmail.trim()}
                  className="px-3 py-2 bg-[#D37E91] text-white rounded text-sm font-medium hover:bg-[#c06e81] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Info */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded p-3">
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              Emails are sent when a task created from this template is completed. Recipients will receive a branded email with the message above and a task summary card.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
