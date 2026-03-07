'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Loader2, Trash, CheckCircle, Clock, AlertTriangle, X,
  MessageCircle, Plus, Eye,
} from '@/components/ui/icons';
import { toast } from 'sonner';

// ============================================================================
// WhatsApp Template List
// Displays all templates (system + custom) with Meta approval status.
// ============================================================================

interface Template {
  id: string;
  name: string;
  display_name: string;
  category: string;
  language: string;
  body_text: string;
  header_text: string | null;
  footer_text: string | null;
  meta_status: string;
  meta_rejection_reason: string | null;
  is_system: boolean;
  created_at: string;
}

interface TemplateListProps {
  onCreateNew: () => void;
}

function MetaStatusBadge({ status }: { status: string }) {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3" /> Pending Review
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <X className="w-3 h-3" /> Rejected
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
          Draft
        </span>
      );
  }
}

export default function TemplateList({ onCreateNew }: TemplateListProps) {
  const { companyId } = useAppContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [companyId]);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(template: Template) {
    if (template.is_system) return;
    if (!confirm(`Delete template "${template.display_name}"? This will also remove it from Meta.`)) return;

    setDeleting(template.id);
    try {
      const params = new URLSearchParams({ id: template.id, name: template.name });
      const res = await fetch(`/api/whatsapp/templates?${params}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Template deleted');
        setTemplates(t => t.filter(x => x.id !== template.id));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-tertiary mx-auto mb-2" />
        <p className="text-theme-secondary text-sm">Loading templates...</p>
      </div>
    );
  }

  const systemTemplates = templates.filter(t => t.is_system);
  const customTemplates = templates.filter(t => !t.is_system);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">Message Templates</h3>
          <p className="text-sm text-theme-secondary">
            {templates.length} template{templates.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-theme-secondary mb-3 uppercase tracking-wider">
            System Templates
          </h4>
          <div className="space-y-2">
            {systemTemplates.map(template => (
              <TemplateRow
                key={template.id}
                template={template}
                expanded={expandedId === template.id}
                onToggle={() => setExpandedId(expandedId === template.id ? null : template.id)}
                onDelete={handleDelete}
                deleting={deleting === template.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Templates */}
      <div>
        <h4 className="text-sm font-medium text-theme-secondary mb-3 uppercase tracking-wider">
          Custom Templates
        </h4>
        {customTemplates.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-theme rounded-xl">
            <MessageCircle className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
            <p className="text-sm text-theme-secondary">No custom templates yet</p>
            <button
              onClick={onCreateNew}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {customTemplates.map(template => (
              <TemplateRow
                key={template.id}
                template={template}
                expanded={expandedId === template.id}
                onToggle={() => setExpandedId(expandedId === template.id ? null : template.id)}
                onDelete={handleDelete}
                deleting={deleting === template.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TemplateRow({
  template,
  expanded,
  onToggle,
  onDelete,
  deleting,
}: {
  template: Template;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (t: Template) => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-theme-hover transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-theme-primary truncate">
                {template.display_name}
              </p>
              {template.is_system && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  SYSTEM
                </span>
              )}
            </div>
            <p className="text-xs text-theme-tertiary truncate">
              {template.name} &middot; {template.category} &middot; {template.language}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <MetaStatusBadge status={template.meta_status} />
          <Eye className={`w-4 h-4 text-theme-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-theme">
          <div className="mt-3 space-y-3">
            {template.header_text && (
              <div>
                <p className="text-xs font-medium text-theme-secondary mb-1">Header</p>
                <p className="text-sm text-theme-primary">{template.header_text}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-theme-secondary mb-1">Body</p>
              <p className="text-sm text-theme-primary whitespace-pre-wrap font-mono bg-theme-muted p-3 rounded-lg">
                {template.body_text}
              </p>
            </div>
            {template.footer_text && (
              <div>
                <p className="text-xs font-medium text-theme-secondary mb-1">Footer</p>
                <p className="text-sm text-theme-tertiary">{template.footer_text}</p>
              </div>
            )}

            {template.meta_status === 'REJECTED' && template.meta_rejection_reason && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection Reason</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{template.meta_rejection_reason}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            {!template.is_system && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(template); }}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
