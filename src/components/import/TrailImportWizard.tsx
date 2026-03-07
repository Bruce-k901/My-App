'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { History, Clock, ArrowRight, ChevronDown, ChevronRight, Trash2 } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UploadStep } from './steps/UploadStep';
import { ReviewMapStep } from './steps/ReviewMapStep';
import { SiteAssignmentStep } from './steps/SiteAssignmentStep';
import { ImportResultsStep } from './steps/ImportResultsStep';
import type { TrailTemplate, TrailParseResult, TrailImportResult } from '@/lib/trail-import';

type WizardStep = 'upload' | 'review' | 'sites' | 'results';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload CSV' },
  { key: 'review', label: 'Review & Map' },
  { key: 'sites', label: 'Link Sites' },
  { key: 'results', label: 'Import' },
];

const SESSION_KEY = 'trail-import-wizard';

function loadSessionState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSessionState(data: Record<string, any>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

function clearSessionState() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function TrailImportWizard() {
  const { companyId } = useAppContext();
  const saved = typeof window !== 'undefined' ? loadSessionState() : null;

  const [step, setStep] = useState<WizardStep>(saved?.step || 'upload');
  const [templates, setTemplates] = useState<TrailTemplate[]>(saved?.templates || []);
  const [totalRows, setTotalRows] = useState(saved?.totalRows || 0);
  const [dateRange, setDateRange] = useState<{ earliest: string; latest: string } | null>(saved?.dateRange || null);
  const [siteName, setSiteName] = useState(saved?.siteName || '');
  const [warnings, setWarnings] = useState<string[]>(saved?.warnings || []);
  const [selectedSites, setSelectedSites] = useState<string[]>(saved?.selectedSites || []);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<TrailImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [complianceTemplates, setComplianceTemplates] = useState<Array<{id: string, slug: string, name: string}>>([]);
  const [previousImports, setPreviousImports] = useState<Array<{ date: string; templates: Array<{ id: string; name: string; category: string; frequency: string }> }>>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [deletingImport, setDeletingImport] = useState(false);
  const router = useRouter();

  // Persist wizard state to sessionStorage on changes
  useEffect(() => {
    // Don't persist the results step — user should re-import if they refresh there
    if (step === 'results') return;
    if (step === 'upload' && templates.length === 0) {
      clearSessionState();
      return;
    }
    saveSessionState({ step, templates, totalRows, dateRange, siteName, warnings, selectedSites });
  }, [step, templates, totalRows, dateRange, siteName, warnings, selectedSites]);

  const currentStepIdx = STEPS.findIndex(s => s.key === step);
  const includedTemplates = templates.filter(t => t.included);

  // Load existing template names for duplicate detection + compliance templates for mapping
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      // Existing names for duplicate check
      const { data } = await supabase
        .from('task_templates')
        .select('name')
        .eq('company_id', companyId);
      if (data) {
        setExistingNames(new Set(data.map((t: any) => t.name?.toLowerCase().trim())));
      }

      // Compliance library templates for manual mapping
      const { data: library } = await supabase
        .from('task_templates')
        .select('id, slug, name')
        .eq('is_template_library', true)
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order('name');
      if (library) {
        setComplianceTemplates(library);
      }

      // Previous imports — templates still tagged trail_import
      const { data: imported } = await supabase
        .from('task_templates')
        .select('id, name, category, frequency, created_at')
        .eq('company_id', companyId)
        .contains('tags', ['trail_import'])
        .order('created_at', { ascending: false });

      if (imported && imported.length > 0) {
        // Group by import batch (templates created within 2 minutes of each other)
        const batches: Array<{ date: string; templates: Array<{ id: string; name: string; category: string; frequency: string }> }> = [];
        let currentBatch: typeof batches[0] | null = null;

        for (const t of imported) {
          const ts = new Date(t.created_at).getTime();
          const batchTs = currentBatch ? new Date(currentBatch.date).getTime() : 0;

          if (!currentBatch || Math.abs(ts - batchTs) > 2 * 60 * 1000) {
            currentBatch = { date: t.created_at, templates: [] };
            batches.push(currentBatch);
          }
          currentBatch.templates.push({ id: t.id, name: t.name, category: t.category, frequency: t.frequency });
        }

        setPreviousImports(batches);
      } else {
        setPreviousImports([]);
      }
    })();
  }, [companyId]);

  const handleParsed = useCallback((result: TrailParseResult) => {
    // Mark templates that already exist as excluded, add duplicate flag
    const withDuplicateCheck = result.templates.map(t => ({
      ...t,
      isDuplicate: existingNames.has(t.name.toLowerCase().trim()),
      included: t.included && !existingNames.has(t.name.toLowerCase().trim()),
    }));

    const dupeCount = withDuplicateCheck.filter(t => t.isDuplicate).length;
    const updatedWarnings = [...result.warnings];
    if (dupeCount > 0) {
      updatedWarnings.push(`${dupeCount} task(s) already exist in Opsly and have been deselected. You can still include them if needed.`);
    }

    setTemplates(withDuplicateCheck);
    setTotalRows(result.totalRows);
    setDateRange(result.dateRange);
    setSiteName(result.siteName);
    setWarnings(updatedWarnings);
    setStep('review');
  }, [existingNames]);

  const handleImport = useCallback(async () => {
    if (!companyId || selectedSites.length === 0 || includedTemplates.length === 0) return;

    setStep('results');
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    setImportProgress({ current: 0, total: includedTemplates.length });

    try {
      const payload = {
        company_id: companyId,
        site_ids: selectedSites,
        templates: includedTemplates.map(t => ({
          name: t.name,
          category: t.inferredCategory,
          frequency: t.inferredFrequency,
          checklistItems: t.checklistItems,
          detectedFields: t.detectedFields,
          matchedTemplateSlug: t.matchedTemplateSlug,
          overrideEvidenceTypes: t.overrideEvidenceTypes,
        })),
      };

      const res = await fetch('/api/tasks/import/trail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setImportError(data.error || 'Import failed. Please try again.');
      } else {
        setImportResult(data);
        setImportProgress({ current: data.imported + data.failed, total: includedTemplates.length });
        clearSessionState();
      }
    } catch (err: any) {
      setImportError(err?.message || 'Network error. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, [companyId, selectedSites, includedTemplates]);

  const handleDeleteBatch = useCallback(async (batchDate: string) => {
    const batch = previousImports.find(b => b.date === batchDate);
    if (!batch || !companyId) return;

    const confirmed = window.confirm(`Delete ${batch.templates.length} imported template(s) from this batch? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingImport(true);
    try {
      const templateIds = batch.templates.map(t => t.id);

      // Delete associated data first
      await supabase.from('template_site_assignments').delete().in('template_id', templateIds);
      await supabase.from('site_checklists').delete().in('template_id', templateIds);

      const { error } = await supabase.from('task_templates').delete().in('id', templateIds);

      if (error) {
        toast.error('Failed to delete: ' + error.message);
      } else {
        setPreviousImports(prev => prev.filter(b => b.date !== batchDate));
        toast.success(`Deleted ${batch.templates.length} template(s)`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete import batch');
    } finally {
      setDeletingImport(false);
    }
  }, [previousImports, companyId]);

  const formatCategory = (cat: string) => {
    const labels: Record<string, string> = {
      food_safety: 'Food Safety',
      h_and_s: 'Health & Safety',
      fire: 'Fire Safety',
      cleaning: 'Cleaning',
      compliance: 'Compliance',
    };
    return labels[cat] || cat;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < currentStepIdx
                  ? 'bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916]'
                  : i === currentStepIdx
                    ? 'bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916]'
                    : 'bg-theme-muted text-theme-tertiary'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${
                i === currentStepIdx ? 'text-theme-primary font-medium' : 'text-theme-tertiary'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-2 ${
                i < currentStepIdx ? 'bg-checkly-dark dark:bg-checkly' : 'bg-theme-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
        {step === 'upload' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Import from Trail</h2>
            <p className="text-sm text-theme-secondary mb-6">
              Upload a Trail task report CSV to import your compliance tasks into Checkly.
            </p>
            <UploadStep onParsed={handleParsed} companyId={companyId} />
          </>
        )}

        {step === 'review' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Review & Map Tasks</h2>
            <p className="text-sm text-theme-secondary mb-4">
              Check the detected tasks, adjust categories and frequencies, then continue.
            </p>
            <ReviewMapStep
              templates={templates}
              onTemplatesChange={setTemplates}
              onNext={() => setStep('sites')}
              onBack={() => setStep('upload')}
              totalRows={totalRows}
              dateRange={dateRange}
              siteName={siteName}
              warnings={warnings}
              complianceTemplates={complianceTemplates}
            />
          </>
        )}

        {step === 'sites' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Link to Sites</h2>
            <p className="text-sm text-theme-secondary mb-4">
              Select which sites to pre-link these templates to. You can change this when scheduling.
            </p>
            <SiteAssignmentStep
              selectedSites={selectedSites}
              onSitesChange={setSelectedSites}
              onNext={handleImport}
              onBack={() => setStep('review')}
              includedCount={includedTemplates.length}
              trailSiteName={siteName}
            />
          </>
        )}

        {step === 'results' && (
          <ImportResultsStep
            isImporting={isImporting}
            progress={importProgress}
            result={importResult}
            error={importError}
            onBack={() => setStep('sites')}
          />
        )}
      </div>

      {/* Previous Imports */}
      {previousImports.length > 0 && step === 'upload' && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-theme-tertiary" />
            <h3 className="text-sm font-medium text-theme-primary">Previous Imports</h3>
            <span className="text-xs text-theme-tertiary">
              ({previousImports.reduce((sum, b) => sum + b.templates.length, 0)} pending review)
            </span>
          </div>

          <div className="space-y-2">
            {previousImports.map(batch => {
              const isExpanded = expandedBatch === batch.date;
              const categories = [...new Set(batch.templates.map(t => t.category))];

              return (
                <div
                  key={batch.date}
                  className="bg-theme-surface-elevated border border-theme rounded-lg overflow-hidden"
                >
                  {/* Batch header */}
                  <button
                    type="button"
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.date)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-theme-hover transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-theme-tertiary shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-theme-tertiary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-theme-primary">
                          {batch.templates.length} template{batch.templates.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-theme-tertiary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(batch.date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {categories.map(cat => (
                          <span
                            key={cat}
                            className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-theme-muted text-theme-secondary"
                          >
                            {formatCategory(cat)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      Needs Review
                    </span>
                  </button>

                  {/* Expanded template list */}
                  {isExpanded && (
                    <div className="border-t border-theme">
                      <div className="max-h-64 overflow-y-auto divide-y divide-theme/50">
                        {batch.templates.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                            <span className="flex-1 text-theme-secondary truncate">{t.name}</span>
                            <span className="text-[10px] text-theme-tertiary shrink-0">{t.frequency}</span>
                          </div>
                        ))}
                      </div>

                      {/* Batch actions */}
                      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-theme bg-theme-surface/50">
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.date)}
                          disabled={deletingImport}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Batch
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push('/dashboard/my_templates')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916] hover:opacity-90 transition-colors"
                        >
                          Review Templates
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
