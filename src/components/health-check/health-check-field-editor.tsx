'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import type { HealthCheckItem } from '@/types/health-check'

interface FieldEditorProps {
  item: HealthCheckItem
  onSave: (value: unknown) => Promise<void>
  onCancel: () => void
}

export function HealthCheckFieldEditor({ item, onSave, onCancel }: FieldEditorProps) {
  const [value, setValue] = useState<any>(item.current_value ?? '')
  const [multiValues, setMultiValues] = useState<string[]>(
    Array.isArray(item.current_value) ? item.current_value : []
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const submitValue = item.field_type === 'multiselect' ? multiValues
        : item.field_type === 'number' ? Number(value)
        : item.field_type === 'boolean' ? Boolean(value)
        : value
      await onSave(submitValue)
    } finally {
      setSaving(false)
    }
  }

  const options = Array.isArray(item.field_options)
    ? item.field_options.map((o: any) => typeof o === 'string' ? { label: o, value: o } : o)
    : []

  return (
    <div className="space-y-3">
      {/* AI suggestion */}
      {item.ai_suggestion && (
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30">
          <p className="text-xs font-medium text-purple-800 dark:text-purple-300 mb-1">AI Suggestion</p>
          <p className="text-sm text-purple-700 dark:text-purple-200">
            {typeof item.ai_suggestion === 'string' ? item.ai_suggestion : JSON.stringify(item.ai_suggestion)}
          </p>
          {item.ai_confidence != null && (
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
              Confidence: {Math.round(item.ai_confidence)}%
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-2 text-xs"
            onClick={() => {
              if (item.field_type === 'multiselect' && Array.isArray(item.ai_suggestion)) {
                setMultiValues(item.ai_suggestion as string[])
              } else {
                setValue(item.ai_suggestion)
              }
            }}
          >
            Use suggestion
          </Button>
        </div>
      )}

      {/* Field editor based on type */}
      {item.field_type === 'text' && (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${item.field_label || item.field_name}`}
        />
      )}

      {item.field_type === 'number' && (
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${item.field_label || item.field_name}`}
        />
      )}

      {item.field_type === 'date' && (
        <Input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {item.field_type === 'select' && (
        <Select
          value={value}
          onValueChange={setValue}
          placeholder={`Select ${item.field_label || item.field_name}`}
          options={options}
        />
      )}

      {item.field_type === 'multiselect' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {options.map((opt: { label: string; value: string }) => (
            <Checkbox
              key={opt.value}
              checked={multiValues.includes(opt.value)}
              onCheckedChange={(checked) => {
                setMultiValues(prev =>
                  checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value)
                )
              }}
              label={opt.label}
            />
          ))}
        </div>
      )}

      {item.field_type === 'json' && (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${item.field_label || item.field_name}`}
          rows={4}
        />
      )}

      {item.field_type === 'boolean' && (
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => setValue(checked)}
          label={item.field_label || item.field_name}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save Fix
        </Button>
      </div>
    </div>
  )
}
