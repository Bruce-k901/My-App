'use client'

import { X, AlertCircle } from 'lucide-react'
import { TaskTemplate, TemplateWithDetails, LABELS } from '@/types/checklist-types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TemplateDetailModalProps {
  template: TaskTemplate
  isOpen: boolean
  onClose: () => void
  onClone: () => void
}

export default function TemplateDetailModal({
  template,
  isOpen,
  onClose,
  onClone
}: TemplateDetailModalProps) {
  const [detailed, setDetailed] = useState<TemplateWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchTemplateDetails()
    }
  }, [isOpen])

  async function fetchTemplateDetails() {
    try {
      const { data: fields, error: fieldsError } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('field_order')

      const { data: labels, error: labelsError } = await supabase
        .from('template_repeatable_labels')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order')

      if (!fieldsError && !labelsError) {
        setDetailed({
          ...template,
          fields: fields || [],
          repeatable_labels: labels || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch template details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800/95 border border-neutral-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-800 border-b border-neutral-700 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{template.name}</h2>
            <p className="text-sm text-neutral-400 mt-1">{template.compliance_standard}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-neutral-400">Loading...</div>
          ) : (
            <>
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-700/30 rounded p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Category</p>
                  <p className="text-white font-semibold">{template.category}</p>
                </div>
                <div className="bg-neutral-700/30 rounded p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Frequency</p>
                  <p className="text-white font-semibold">{template.frequency}</p>
                </div>
                <div className="bg-neutral-700/30 rounded p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Critical</p>
                  <p className="text-white font-semibold">
                    {template.is_critical ? (
                      <span className="text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Yes
                      </span>
                    ) : (
                      'No'
                    )}
                  </p>
                </div>
                <div className="bg-neutral-700/30 rounded p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Audit Category</p>
                  <p className="text-white font-semibold">{template.audit_category || 'N/A'}</p>
                </div>
              </div>

              {/* Description */}
              {template.description && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-2">
                    Description
                  </h3>
                  <p className="text-neutral-400">{template.description}</p>
                </div>
              )}

              {/* Fields */}
              {detailed?.fields && detailed.fields.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">
                    Fields ({detailed.fields.length})
                  </h3>
                  <div className="space-y-2">
                    {detailed.fields.map(field => (
                      <div key={field.id} className="bg-neutral-700/20 border border-neutral-700/50 rounded p-3">
                        <p className="font-medium text-white">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">Type: {field.field_type}</p>
                        {field.help_text && (
                          <p className="text-xs text-neutral-500 mt-2 italic">{field.help_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repeatable Labels */}
              {detailed?.repeatable_labels && detailed.repeatable_labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-3">
                    Repeatable Options
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detailed.repeatable_labels.map(label => (
                      <span
                        key={label.id}
                        className={`px-3 py-1 rounded text-sm ${
                          label.is_default
                            ? 'bg-magenta-600/30 text-magenta-300'
                            : 'bg-neutral-700/30 text-neutral-400'
                        }`}
                      >
                        {label.label}
                        {label.is_default && ' (default)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-800 border-t border-neutral-700 p-6 flex gap-3">
          <button
            onClick={onClone}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium"
          >
            Clone Template
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
