'use client';

import { AlertTriangle } from '@/components/ui/icons';
import type { OffboardingFormData } from '@/types/offboarding';
import { TERMINATION_REASON_LABELS, DISMISSAL_SUB_REASON_LABELS } from '@/types/offboarding';
import type { DismissalSubReason } from '@/types/offboarding';
import type { TerminationReason } from '@/types/teamly';
import { getACASGuidance } from '@/lib/people/acas-guidance';

interface ReasonStepProps {
  formData: OffboardingFormData;
  onChange: (updates: Partial<OffboardingFormData>) => void;
}

export function ReasonStep({ formData, onChange }: ReasonStepProps) {
  const guidance = formData.termination_reason
    ? getACASGuidance(formData.termination_reason, formData.termination_sub_reason)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form — left side */}
      <div className="lg:col-span-3 space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Reason for termination <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={formData.termination_reason || ''}
            onChange={(e) =>
              onChange({
                termination_reason: e.target.value as TerminationReason,
                termination_sub_reason: null,
              })
            }
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teamly-dark/40 dark:focus:ring-teamly/40 focus:border-teamly-dark dark:focus:border-teamly transition-colors"
          >
            <option value="">Select a reason...</option>
            {(Object.entries(TERMINATION_REASON_LABELS) as [TerminationReason, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Sub-reason for dismissals */}
        {formData.termination_reason === 'dismissed' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Dismissal reason <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={formData.termination_sub_reason || ''}
              onChange={(e) =>
                onChange({ termination_sub_reason: (e.target.value || null) as DismissalSubReason | null })
              }
              className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teamly-dark/40 dark:focus:ring-teamly/40 focus:border-teamly-dark dark:focus:border-teamly transition-colors"
            >
              <option value="">Select dismissal reason...</option>
              {(Object.entries(DISMISSAL_SUB_REASON_LABELS) as [DismissalSubReason, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Notes / additional detail
          </label>
          <textarea
            value={formData.termination_notes || ''}
            onChange={(e) => onChange({ termination_notes: e.target.value })}
            rows={4}
            placeholder="Add any relevant context, circumstances, or notes about this termination..."
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teamly-dark/40 dark:focus:ring-teamly/40 focus:border-teamly-dark dark:focus:border-teamly resize-none transition-colors"
          />
        </div>
      </div>

      {/* ACAS Guidance — right side */}
      <div className="lg:col-span-2">
        {guidance ? (
          <div className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{guidance.title}</h4>
            </div>

            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300/80 mb-1.5">Required steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                {guidance.required_steps.map((step, i) => (
                  <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {guidance.warnings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300/80 mb-1.5">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  {guidance.warnings.slice(0, 4).map((warning, i) => (
                    <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guidance.documents_needed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300/80 mb-1.5">Documents needed:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {guidance.documents_needed.map((doc, i) => (
                    <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-amber-200 dark:border-amber-500/20">
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 leading-relaxed">
                {guidance.legal_references.join(' \u00B7 ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Select a termination reason to see procedural guidance based on UK employment law
              and the ACAS Code of Practice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
