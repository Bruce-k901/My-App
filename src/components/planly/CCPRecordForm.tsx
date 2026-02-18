// @salsa - SALSA Compliance: CCP record form for production batches
'use client';

import { useState } from 'react';
import { CCPType } from '@/lib/types/stockly';
import { Thermometer, CheckCircle, AlertTriangle } from '@/components/ui/icons';

const CCP_TYPE_OPTIONS: { value: CCPType; label: string; defaultUnit: string; defaultTarget?: string }[] = [
  { value: 'cooking_temp', label: 'Cooking Temperature', defaultUnit: '°C', defaultTarget: '75' },
  { value: 'cooling_temp', label: 'Cooling Temperature', defaultUnit: '°C', defaultTarget: '8' },
  { value: 'cooling_time', label: 'Cooling Time', defaultUnit: 'mins', defaultTarget: '90' },
  { value: 'metal_detection', label: 'Metal Detection', defaultUnit: '', defaultTarget: 'Pass' },
  { value: 'ph_level', label: 'pH Level', defaultUnit: 'pH' },
  { value: 'other', label: 'Other', defaultUnit: '' },
];

interface CCPRecordFormProps {
  productionBatchId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CCPRecordForm({ productionBatchId, onSaved, onCancel }: CCPRecordFormProps) {
  const [ccpType, setCcpType] = useState<CCPType>('cooking_temp');
  const [targetValue, setTargetValue] = useState('75');
  const [actualValue, setActualValue] = useState('');
  const [unit, setUnit] = useState('°C');
  const [isWithinSpec, setIsWithinSpec] = useState<boolean | null>(null);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (type: CCPType) => {
    setCcpType(type);
    const option = CCP_TYPE_OPTIONS.find(o => o.value === type);
    if (option) {
      setUnit(option.defaultUnit);
      setTargetValue(option.defaultTarget || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/ccp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ccp_type: ccpType,
          target_value: targetValue || null,
          actual_value: actualValue || null,
          unit: unit || null,
          is_within_spec: isWithinSpec,
          corrective_action: correctiveAction || null,
        }),
      });
      if (res.ok) {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">CCP Type</label>
        <select
          value={ccpType}
          onChange={(e) => handleTypeChange(e.target.value as CCPType)}
          className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
        >
          {CCP_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">
            Target {unit && `(${unit})`}
          </label>
          <input
            type="text"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
            placeholder="e.g. 75"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">
            Actual {unit && `(${unit})`}
          </label>
          <input
            type="text"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
            placeholder="e.g. 78"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">Result</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsWithinSpec(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
              isWithinSpec === true
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                : 'border-theme-border text-theme-tertiary hover:bg-theme-bg-secondary'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Pass
          </button>
          <button
            type="button"
            onClick={() => setIsWithinSpec(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
              isWithinSpec === false
                ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
                : 'border-theme-border text-theme-tertiary hover:bg-theme-bg-secondary'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Fail
          </button>
        </div>
      </div>

      {isWithinSpec === false && (
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Corrective Action</label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
            placeholder="Describe the corrective action taken..."
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !actualValue}
          className="flex-1 px-4 py-2 bg-planly-dark dark:bg-planly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Record CCP'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-theme-border rounded-lg text-sm text-theme-secondary hover:bg-theme-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
