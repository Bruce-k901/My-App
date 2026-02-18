// @salsa - SALSA Compliance: Reusable recall create/edit form
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2 } from '@/components/ui/icons';

interface RecallFormProps {
  onSubmit: (data: {
    recall_code: string;
    title: string;
    description: string;
    recall_type: 'recall' | 'withdrawal';
    severity: 'class_1' | 'class_2' | 'class_3';
    reason: string;
  }) => Promise<void>;
  loading?: boolean;
  initialData?: {
    recall_code?: string;
    title?: string;
    description?: string;
    recall_type?: string;
    severity?: string;
    reason?: string;
  };
}

export default function RecallForm({ onSubmit, loading, initialData }: RecallFormProps) {
  const [recallCode, setRecallCode] = useState(initialData?.recall_code || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [recallType, setRecallType] = useState<'recall' | 'withdrawal'>((initialData?.recall_type as any) || 'recall');
  const [severity, setSeverity] = useState<'class_1' | 'class_2' | 'class_3'>((initialData?.severity as any) || 'class_2');
  const [reason, setReason] = useState(initialData?.reason || '');

  // @salsa — Auto-generate recall code
  function generateCode() {
    const date = new Date();
    const code = `RC-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setRecallCode(code);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ recall_code: recallCode, title, description, recall_type: recallType, severity, reason });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Recall code */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-1">Recall Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={recallCode}
            onChange={(e) => setRecallCode(e.target.value)}
            required
            placeholder="RC-2026-0218-001"
            className="flex-1 px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          />
          <Button type="button" variant="outline" size="sm" onClick={generateCode}>
            Generate
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Brief description of the recall"
          className="w-full px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
        />
      </div>

      {/* Type + Severity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-primary mb-1">Type</label>
          <select
            value={recallType}
            onChange={(e) => setRecallType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            <option value="recall">Recall (consumer level — safety issue)</option>
            <option value="withdrawal">Withdrawal (trade level — quality issue)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-primary mb-1">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            <option value="class_1">Class 1 — Serious health risk</option>
            <option value="class_2">Class 2 — May cause illness</option>
            <option value="class_3">Class 3 — Unlikely health risk</option>
          </select>
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-1">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Why is this recall being initiated?"
          className="w-full px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Additional details about the recall..."
          className="w-full px-3 py-2 rounded-lg border border-theme-border bg-theme-bg-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !recallCode || !title}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Recall
        </Button>
      </div>
    </form>
  );
}
