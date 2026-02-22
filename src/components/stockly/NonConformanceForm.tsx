// @salsa - SALSA Compliance: Non-conformance create/edit form
'use client';

import { useState } from 'react';
import { NonConformanceCategory, NonConformanceSeverity, NonConformanceSource } from '@/lib/types/stockly';

const CATEGORIES: { value: NonConformanceCategory; label: string }[] = [
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'allergen', label: 'Allergen' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'traceability', label: 'Traceability' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'labelling', label: 'Labelling' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: NonConformanceSeverity; label: string }[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

const SOURCES: { value: NonConformanceSource; label: string }[] = [
  { value: 'internal_audit', label: 'Internal Audit' },
  { value: 'external_audit', label: 'External Audit' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'staff_observation', label: 'Staff Observation' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'other', label: 'Other' },
];

interface NonConformanceFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: NonConformanceCategory;
    severity: NonConformanceSeverity;
    source: NonConformanceSource;
    source_reference: string;
    corrective_action_due: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function NonConformanceForm({ onSubmit, onCancel, loading }: NonConformanceFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NonConformanceCategory>('other');
  const [severity, setSeverity] = useState<NonConformanceSeverity>('minor');
  const [source, setSource] = useState<NonConformanceSource>('staff_observation');
  const [sourceReference, setSourceReference] = useState('');
  const [correctiveActionDue, setCorrectiveActionDue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      source,
      source_reference: sourceReference.trim(),
      corrective_action_due: correctiveActionDue,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          placeholder="Brief description of the non-conformance"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          placeholder="Detailed description of what was observed..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as NonConformanceCategory)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Severity</label>
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value as NonConformanceSeverity)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            {SEVERITIES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value as NonConformanceSource)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            {SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Source Reference</label>
          <input
            type="text"
            value={sourceReference}
            onChange={e => setSourceReference(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
            placeholder="e.g., audit report ref, incident ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Corrective Action Due</label>
          <input
            type="date"
            value={correctiveActionDue}
            onChange={e => setCorrectiveActionDue(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Non-Conformance'}
        </button>
      </div>
    </form>
  );
}
