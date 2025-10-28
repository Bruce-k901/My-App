'use client'

import { X } from 'lucide-react'
import { TaskTemplate } from '@/types/checklist-types'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface CloneTemplateDialogProps {
  template: TaskTemplate
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CloneTemplateDialog({
  template,
  isOpen,
  onClose,
  onSuccess
}: CloneTemplateDialogProps) {
  const router = useRouter()
  const [newName, setNewName] = useState(template.name)
  const [customizeAfter, setCustomizeAfter] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClone() {
    if (!newName.trim()) {
      setError('Template name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // Generate slug from name
      const slug = newName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50)

      // Clone template
      const { data: clonedTemplate, error: cloneError } = await supabase
        .from('task_templates')
        .insert({
          company_id: profile.company_id,
          name: newName,
          slug,
          description: template.description,
          category: template.category,
          audit_category: template.audit_category,
          frequency: template.frequency,
          recurrence_pattern: template.recurrence_pattern,
          time_of_day: template.time_of_day,
          dayparts: template.dayparts,
          assigned_to_role: template.assigned_to_role,
          compliance_standard: template.compliance_standard,
          is_critical: template.is_critical,
          is_template_library: false, // Custom template
          is_active: true
        })
        .select('id')
        .single()

      if (cloneError) throw cloneError
      if (!clonedTemplate) throw new Error('Clone failed')

      // Clone fields
      const { data: originalFields, error: fieldsError } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', template.id)

      if (!fieldsError && originalFields) {
        const fieldsToInsert = originalFields.map(field => ({
          ...field,
          id: undefined, // Remove ID for new insert
          template_id: clonedTemplate.id
        }))

        const { error: insertFieldsError } = await supabase
          .from('template_fields')
          .insert(fieldsToInsert)

        if (insertFieldsError) throw insertFieldsError
      }

      // Clone repeatable labels
      const { data: originalLabels } = await supabase
        .from('template_repeatable_labels')
        .select('*')
        .eq('template_id', template.id)

      if (originalLabels) {
        const labelsToInsert = originalLabels.map(label => ({
          ...label,
          id: undefined,
          template_id: clonedTemplate.id
        }))

        await supabase
          .from('template_repeatable_labels')
          .insert(labelsToInsert)
      }

      onSuccess()

      if (customizeAfter) {
        router.push(`/dashboard/checklists/templates/${clonedTemplate.id}/edit`)
      }

      onClose()
    } catch (error) {
      console.error('Clone error:', error)
      setError(error instanceof Error ? error.message : 'Failed to clone template')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800/95 border border-neutral-700 rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">Clone Template</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-neutral-400 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-neutral-400 mb-2">From template:</p>
            <p className="px-3 py-2 bg-neutral-700/30 rounded text-white text-sm">
              {template.name}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Clone as name *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-magenta-400 disabled:opacity-50"
              placeholder="Template name"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={customizeAfter}
              onChange={(e) => setCustomizeAfter(e.target.checked)}
              disabled={loading}
              className="rounded border-neutral-600"
            />
            <span className="text-sm text-neutral-300">Customize immediately after cloning</span>
          </label>

          {error && (
            <div className="px-3 py-2 bg-red-600/20 border border-red-600/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-neutral-500 italic">
            Your original templates will not be affected. This creates an editable copy for your operation.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-neutral-800 border-t border-neutral-700 p-6 flex gap-3">
          <button
            onClick={handleClone}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium disabled:opacity-50"
          >
            {loading ? 'Cloning...' : 'Clone Template'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
