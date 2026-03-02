'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import EntityPageLayout from '@/components/layouts/EntityPageLayout';
import VisitFormModal from '@/components/pest-control/VisitFormModal';
import ServiceReportUpload from '@/components/pest-control/ServiceReportUpload';
import { Calendar, AlertTriangle, Check, FileText, Upload, Sparkle, Eye } from '@/components/ui/icons';

const VISIT_TYPE_LABELS: Record<string, string> = {
  routine: 'Routine',
  reactive: 'Reactive',
  emergency: 'Emergency',
  follow_up: 'Follow-up',
};

export default function PestControlVisitsPage() {
  const { companyId, siteId } = useAppContext();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (companyId) fetchVisits();
  }, [companyId, siteId]);

  async function fetchVisits() {
    try {
      setLoading(true);
      let query = supabase
        .from('pest_control_visits')
        .select('*, contractor:contractors(name)')
        .eq('company_id', companyId)
        .order('visit_date', { ascending: false });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;
      if (error && (error as any).code !== '42P01') throw error;
      setVisits(data || []);
    } catch (err: any) {
      if ((err as any).code === '42P01') {
        setVisits([]);
      } else {
        console.error('Error fetching visits:', err);
        toast.error('Failed to load visits');
        setVisits([]);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredVisits = visits.filter(v => {
    const matchesSearch = !searchTerm ||
      (v.contractor?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.technician_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || v.visit_type === typeFilter;
    return matchesSearch && matchesType;
  });

  function handleExtracted(data: any, fileUrl: string) {
    // Pre-fill the visit form with AI-extracted data
    setEditingVisit({
      _aiExtracted: true,
      visit_date: data.visit_date || new Date().toISOString().split('T')[0],
      visit_type: 'routine',
      technician_name: data.technician_name || '',
      visit_duration_minutes: data.visit_duration_minutes || null,
      evidence_found: data.evidence_found ?? false,
      evidence_type: data.evidence_type || [],
      affected_areas: data.affected_areas || [],
      pest_types: data.pest_types || [],
      treatments_applied: data.treatments_applied || [],
      chemicals_used: data.chemicals_used || [],
      devices_serviced: data.devices_serviced || null,
      devices_replaced: data.devices_replaced || null,
      baits_replenished: data.baits_replenished || null,
      proofing_required: data.proofing_required ?? false,
      proofing_details: data.proofing_details || '',
      hygiene_issues_noted: data.hygiene_issues_noted || '',
      follow_up_required: data.follow_up_required ?? false,
      follow_up_date: data.follow_up_date || null,
      visit_cost: data.visit_cost || null,
      materials_cost: data.materials_cost || null,
      total_cost: data.total_cost || null,
      invoice_reference: data.invoice_reference || '',
      service_report_file: fileUrl,
      notes: data.recommendations || '',
    });
    setShowModal(true);
  }

  function exportCsv() {
    const headers = ['Date', 'Type', 'Contractor', 'Technician', 'Evidence', 'Pest Types', 'Treatments', 'Cost', 'Invoice Ref'];
    const rows = filteredVisits.map(v => [
      v.visit_date,
      v.visit_type,
      v.contractor?.name || '',
      v.technician_name || '',
      v.evidence_found ? 'Yes' : 'No',
      (v.pest_types || []).join('; '),
      (v.treatments_applied || []).join('; '),
      v.total_cost || '',
      v.invoice_reference || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pest_control_visits_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <EntityPageLayout
        title="Pest Control Visits"
        onSearch={setSearchTerm}
        searchPlaceholder="Search visits..."
        onAdd={() => { setEditingVisit(null); setShowModal(true); }}
        onDownload={exportCsv}
        customActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 rounded-lg text-xs sm:text-sm font-medium border border-[#D37E91]/40 text-[#D37E91] hover:bg-[#D37E91]/10 transition-colors"
            >
              <Sparkle className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Report</span>
              <span className="sm:hidden">AI</span>
            </button>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-9 sm:h-10 px-2 rounded-md border border-theme bg-transparent text-xs sm:text-sm text-theme-primary"
            >
              <option value="all">All Types</option>
              <option value="routine">Routine</option>
              <option value="reactive">Reactive</option>
              <option value="emergency">Emergency</option>
              <option value="follow_up">Follow-up</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-12">
            <p className="text-theme-secondary">Loading visits...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
            <p className="text-theme-secondary font-medium">No visit records found</p>
            <p className="text-sm text-theme-tertiary mt-1">Log your first pest control visit or upload a service report.</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark hover:opacity-90"
              >
                <Sparkle className="w-4 h-4" />
                Upload Service Report
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
              >
                Log Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map(v => (
              <div
                key={v.id}
                onClick={() => { setEditingVisit(v); setShowModal(true); }}
                className="bg-theme-surface rounded-xl border border-theme p-4 hover:border-checkly-dark/30 dark:hover:border-checkly/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-theme-primary">{v.visit_date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        v.visit_type === 'routine' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        v.visit_type === 'emergency' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                        v.visit_type === 'reactive' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      }`}>
                        {VISIT_TYPE_LABELS[v.visit_type] || v.visit_type}
                      </span>
                      {v.ai_extracted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#D37E91]/10 text-[#D37E91]">
                          AI Extracted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-theme-secondary">
                      {v.contractor?.name || 'Unknown contractor'}
                      {v.technician_name ? ` — ${v.technician_name}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {v.evidence_found ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" /> Evidence found
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" /> No evidence
                        </span>
                      )}
                      {v.treatments_applied?.length > 0 && (
                        <span className="text-xs text-theme-tertiary">
                          {v.treatments_applied.length} treatment{v.treatments_applied.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {v.proofing_required && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Proofing needed</span>
                      )}
                      {v.follow_up_required && (
                        <span className="text-xs text-purple-600 dark:text-purple-400">Follow-up: {v.follow_up_date || 'TBC'}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {v.total_cost && (
                      <p className="text-sm font-semibold text-theme-primary">£{Number(v.total_cost).toFixed(2)}</p>
                    )}
                    {v.service_report_file && (
                      <span className="flex items-center gap-1 text-xs text-checkly-dark dark:text-checkly mt-1">
                        <FileText className="w-3 h-3" /> Report
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </EntityPageLayout>

      <VisitFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingVisit(null); }}
        onSaved={fetchVisits}
        visit={editingVisit}
      />

      <ServiceReportUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onExtracted={handleExtracted}
      />
    </>
  );
}
