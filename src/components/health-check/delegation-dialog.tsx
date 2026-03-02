'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { HealthCheckItem } from '@/types/health-check'

interface DelegationDialogProps {
  open: boolean
  onClose: () => void
  item: HealthCheckItem | null
  companyId: string
  siteId: string | null
  onDelegated: () => void
}

interface StaffMember {
  id: string
  full_name: string
  app_role: string
}

export function DelegationDialog({ open, onClose, item, companyId, siteId, onDelegated }: DelegationDialogProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !companyId) return

    const loadStaff = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, app_role')
        .eq('company_id', companyId)
        .not('app_role', 'eq', 'Owner')
        .order('full_name')

      setStaff(data ?? [])
      setLoading(false)
    }

    loadStaff()
  }, [open, companyId])

  useEffect(() => {
    if (open && item) {
      setMessage(`Please review and fix: ${item.title} — ${item.description}`)
      setSelectedStaff('')
      setDueDate('')
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!item || !selectedStaff || !message.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/health-check/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          delegated_to: selectedStaff,
          message: message.trim(),
          due_date: dueDate || undefined,
          company_id: companyId,
          site_id: siteId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delegation failed')
      }

      onDelegated()
      onClose()
    } catch (err: any) {
      console.error('Delegation failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const staffOptions = staff.map(s => ({
    label: `${s.full_name} (${s.app_role})`,
    value: s.id,
  }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delegate Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {item && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
              <p className="text-sm font-medium text-theme-primary">{item.title}</p>
              <p className="text-xs text-theme-tertiary mt-1">{item.record_name}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-theme-secondary/60 mb-1">Assign to</label>
            <Select
              value={selectedStaff}
              onValueChange={setSelectedStaff}
              placeholder={loading ? 'Loading staff...' : 'Select team member'}
              options={staffOptions}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-secondary/60 mb-1">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add context or instructions..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-secondary/60 mb-1">Due date (optional)</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!selectedStaff || !message.trim()}
          >
            Delegate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
