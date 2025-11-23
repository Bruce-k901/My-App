"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertTriangle, CheckCircle, Calendar, Edit, FileBox, FileText, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function RiskAssessmentsPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    loadRiskAssessments();
  }, [companyId]);

  const loadRiskAssessments = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      // Get all RAs (excluding archived)
      // Note: version_number column may not exist if migration hasn't run yet
      const { data: allRAs, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'Archived')
        .order('ref_code', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter to get only the latest version of each RA base
      // Since ref_code increments (RA-GEN-BESH-001 -> RA-GEN-BESH-002), we group by base pattern
      const latestVersions = new Map();
      (allRAs || []).forEach((ra: any) => {
        // Extract base pattern from ref_code (e.g., RA-GEN-BESH-001 -> RA-GEN-BESH)
        const refCode = ra.ref_code;
        const baseMatch = refCode.match(/^(.+)-\d+$/);
        const basePattern = baseMatch ? baseMatch[1] : refCode;
        
        if (!latestVersions.has(basePattern)) {
          latestVersions.set(basePattern, ra);
        } else {
          const existing = latestVersions.get(basePattern);
          // Keep the one with higher version_number (or higher ref_code number if version_number is same)
          const existingVersion = existing.version_number || 1;
          const currentVersion = ra.version_number || 1;
          
          if (currentVersion > existingVersion) {
            latestVersions.set(basePattern, ra);
          } else if (currentVersion === existingVersion) {
            // If version numbers are equal, compare ref_code numbers
            const existingNum = parseInt(existing.ref_code.match(/-(\d+)$/)?.[1] || '0', 10);
            const currentNum = parseInt(refCode.match(/-(\d+)$/)?.[1] || '0', 10);
            if (currentNum > existingNum) {
              latestVersions.set(basePattern, ra);
            }
          }
        }
      });
      
      // Convert map to array and sort by created_at
      const latestRAs = Array.from(latestVersions.values()).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setRiskAssessments(latestRAs);
    } catch (error) {
      console.error('Error loading risk assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssessments = riskAssessments.filter(ra => {
    const matchesSearch = ra.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ra.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ra.status === filterStatus;
    const matchesType = filterType === 'all' || ra.template_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const isOverdue = (reviewDate) => {
    return new Date(reviewDate) < new Date();
  };

  const getRiskBadge = (assessment) => {
    // Check if there are any high/very high risks in the assessment data
    if (assessment.assessment_data?.hazards) {
      const highRisks = assessment.assessment_data.hazards.filter(h => {
        const scoreAfter = h.likelihoodAfter * h.severityAfter;
        return scoreAfter >= 10;
      });
      
      if (highRisks.length > 0) {
        const veryHigh = highRisks.filter(h => {
          const score = h.likelihoodAfter * h.severityAfter;
          return score >= 16;
        });
        
        if (veryHigh.length > 0) return { text: 'Very High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/40' };
        return { text: 'High Risk', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
      }
    }
    return null;
  };

  const stats = {
    total: riskAssessments.length,
    overdue: riskAssessments.filter(ra => isOverdue(ra.review_date)).length,
    highRisk: riskAssessments.filter(ra => getRiskBadge(ra)?.text === 'High Risk' || getRiskBadge(ra)?.text === 'Very High Risk').length,
    published: riskAssessments.filter(ra => ra.status === 'Published').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - Improved Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-white/[0.1] rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:border-magenta-500/30 group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-neutral-400 text-sm font-medium">Total RAs</div>
            <FileText className="w-5 h-5 text-neutral-500 group-hover:text-magenta-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-neutral-500 mt-1">Active assessments</div>
        </div>
        
        <div className={`bg-gradient-to-br ${stats.overdue > 0 ? 'from-red-500/10 to-red-600/5' : 'from-neutral-800/50 to-neutral-900/50'} border ${stats.overdue > 0 ? 'border-red-500/30' : 'border-white/[0.1]'} rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] group`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${stats.overdue > 0 ? 'text-red-300' : 'text-neutral-400'}`}>Overdue</div>
            <AlertTriangle className={`w-5 h-5 transition-colors ${stats.overdue > 0 ? 'text-red-400' : 'text-neutral-500 group-hover:text-red-400'}`} />
          </div>
          <div className={`text-3xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {stats.overdue}
          </div>
          <div className={`text-xs mt-1 ${stats.overdue > 0 ? 'text-red-300/70' : 'text-neutral-500'}`}>
            {stats.overdue > 0 ? 'Requires attention' : 'All up to date'}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br ${stats.highRisk > 0 ? 'from-orange-500/10 to-orange-600/5' : 'from-neutral-800/50 to-neutral-900/50'} border ${stats.highRisk > 0 ? 'border-orange-500/30' : 'border-white/[0.1]'} rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] group`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${stats.highRisk > 0 ? 'text-orange-300' : 'text-neutral-400'}`}>High Risk</div>
            <Shield className={`w-5 h-5 transition-colors ${stats.highRisk > 0 ? 'text-orange-400' : 'text-neutral-500 group-hover:text-orange-400'}`} />
          </div>
          <div className={`text-3xl font-bold ${stats.highRisk > 0 ? 'text-orange-400' : 'text-white'}`}>
            {stats.highRisk}
          </div>
          <div className={`text-xs mt-1 ${stats.highRisk > 0 ? 'text-orange-300/70' : 'text-neutral-500'}`}>
            {stats.highRisk > 0 ? 'Needs review' : 'Low risk levels'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:border-green-500/30 group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-green-300 text-sm font-medium">Published</div>
            <CheckCircle className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.published}</div>
          <div className="text-xs text-green-300/70 mt-1">Active & published</div>
        </div>
      </div>

      {/* Overdue Banner */}
      {stats.overdue > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-red-400 font-semibold">Warning: {stats.overdue} risk assessment(s) overdue for review</div>
            <div className="text-red-300 text-sm">Please update assessments to maintain compliance</div>
          </div>
        </div>
      )}

      {/* Risk Assessments List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Risk Assessments</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-neutral-400">{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</div>
            <button
              onClick={() => router.push('/dashboard/risk-assessments/archive')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-orange-500 text-orange-500 bg-transparent hover:bg-white/[0.04] active:bg-white/[0.08] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-200 touch-manipulation text-sm sm:text-base"
            >
              <FileBox size={18} />
              <span className="font-medium">Archived RAs</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search risk assessments..."
              className="w-full min-h-[44px] bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-white placeholder-neutral-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-pink-500/50 touch-manipulation"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-h-[44px] bg-neutral-800 border border-neutral-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-white text-sm sm:text-base touch-manipulation"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Under Review">Under Review</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="min-h-[44px] bg-neutral-800 border border-neutral-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-white text-sm sm:text-base touch-manipulation"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="coshh">COSHH</option>
          </select>
        </div>

        {/* Risk Assessments List */}
        {loading ? (
          <div className="text-neutral-400 text-center py-8">Loading...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
            <p className="text-neutral-400">No risk assessments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssessments.map((assessment) => {
              const overdue = isOverdue(assessment.review_date);
              const riskBadge = getRiskBadge(assessment);
              
              return (
                <div
                  key={assessment.id}
                  className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 sm:p-4 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:bg-neutral-800/70 transition-colors cursor-pointer"
                  onClick={() => {
                    const templatePath = assessment.template_type === 'coshh' 
                      ? '/dashboard/risk-assessments/coshh-template'
                      : '/dashboard/risk-assessments/general-template';
                    router.push(`${templatePath}?edit=${assessment.id}`);
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white break-words">{assessment.title}</h3>
                        <span className="px-2 py-1 bg-neutral-700 text-neutral-300 rounded text-xs whitespace-nowrap">{assessment.ref_code}</span>
                        {assessment.template_type === 'coshh' && (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs whitespace-nowrap">COSHH</span>
                        )}
                        {assessment.status === 'Published' && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-xs flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle size={12} />
                            Published
                          </span>
                        )}
                        {overdue && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle size={12} />
                            Overdue
                          </span>
                        )}
                        {riskBadge && (
                          <span className={`px-2 py-1 border rounded text-xs whitespace-nowrap ${riskBadge.color}`}>
                            {riskBadge.text}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-neutral-400">
                        <span>Assessor: {assessment.assessor_name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Review due: {new Date(assessment.review_date).toLocaleDateString()}
                        </span>
                        {assessment.linked_sops && assessment.linked_sops.length > 0 && (
                          <span>{assessment.linked_sops.length} linked SOP{assessment.linked_sops.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const templatePath = assessment.template_type === 'coshh' 
                            ? '/dashboard/risk-assessments/coshh-template'
                            : '/dashboard/risk-assessments/general-template';
                          router.push(`${templatePath}?edit=${assessment.id}`);
                        }}
                        className="min-h-[44px] min-w-[44px] px-3 sm:px-4 py-2 sm:py-2.5 bg-magenta-500/20 hover:bg-magenta-500/30 active:bg-magenta-500/40 border border-magenta-500/40 rounded-lg text-magenta-400 flex items-center justify-center gap-2 transition-colors text-sm touch-manipulation"
                        title="Edit RA"
                      >
                        <Edit size={16} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Archive this Risk Assessment? The original version (001) will be moved to archived RAs.')) return;

                          try {
                            setArchivingId(assessment.id);
                            
                            // Find the current RA to get its ref_code base
                            const { data: currentRA, error: fetchError } = await supabase
                              .from('risk_assessments')
                              .select('ref_code, parent_id')
                              .eq('id', assessment.id)
                              .eq('company_id', companyId)
                              .single();

                            if (fetchError) throw fetchError;
                            if (!currentRA) throw new Error('RA not found');

                            // Extract base pattern from ref_code (e.g., RA-GEN-BESH-002 -> RA-GEN-BESH)
                            const refCode = currentRA.ref_code;
                            const baseMatch = refCode.match(/^(.+)-\d+$/);
                            const basePattern = baseMatch ? baseMatch[1] : refCode;

                            // Find the original 001 version (version_number = 1 or ref_code ends with -001)
                            const { data: originalVersion, error: findError } = await supabase
                              .from('risk_assessments')
                              .select('id')
                              .eq('company_id', companyId)
                              .like('ref_code', `${basePattern}-001`)
                              .eq('version_number', 1)
                              .maybeSingle();

                            if (findError) throw findError;

                            // Archive the original 001 version if found, otherwise archive current
                            const versionToArchive = originalVersion?.id || assessment.id;

                            const { error } = await supabase
                              .from('risk_assessments')
                              .update({ status: 'Archived' })
                              .eq('id', versionToArchive)
                              .eq('company_id', companyId);

                            if (error) throw error;

                            // Remove from local state (remove all versions of this RA base)
                            setRiskAssessments(prev => prev.filter(ra => {
                              const raBaseMatch = ra.ref_code.match(/^(.+)-\d+$/);
                              const raBasePattern = raBaseMatch ? raBaseMatch[1] : ra.ref_code;
                              return raBasePattern !== basePattern;
                            }));

                            showToast({
                              title: 'RA archived',
                              description: 'Original version (001) has been moved to archived RAs',
                              type: 'success'
                            });
                          } catch (error: any) {
                            console.error('Error archiving RA:', error);
                            showToast({
                              title: 'Error archiving RA',
                              description: error.message || 'Failed to archive RA',
                              type: 'error'
                            });
                          } finally {
                            setArchivingId(null);
                          }
                        }}
                        disabled={archivingId === assessment.id}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-orange-500 text-orange-500 bg-transparent hover:bg-white/[0.04] active:bg-white/[0.08] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none touch-manipulation"
                        title="Archive RA"
                      >
                        {archivingId === assessment.id ? (
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileBox size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

