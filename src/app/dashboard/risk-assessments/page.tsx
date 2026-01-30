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
        
        if (veryHigh.length > 0) return { text: 'Very High Risk', color: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40' };
        return { text: 'High Risk', color: 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/40' };
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
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards - Improved Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-800/50 border border-gray-200 dark:border-white/[0.1] rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:border-[#EC4899]/30 dark:hover:border-magenta-500/30 group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-600 dark:text-neutral-400 text-sm font-medium">Total RAs</div>
            <FileText className="w-5 h-5 text-gray-400 dark:text-neutral-500 group-hover:text-[#EC4899] dark:group-hover:text-magenta-400 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-neutral-500 mt-1">Active assessments</div>
        </div>
        
        <div className={`bg-white dark:bg-neutral-800/50 ${stats.overdue > 0 ? 'bg-red-50 dark:from-red-500/10 dark:to-red-600/5' : ''} border ${stats.overdue > 0 ? 'border-red-200 dark:border-red-500/30' : 'border-gray-200 dark:border-white/[0.1]'} rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] group`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${stats.overdue > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-neutral-400'}`}>Overdue</div>
            <AlertTriangle className={`w-5 h-5 transition-colors ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-neutral-500 group-hover:text-red-400'}`} />
          </div>
          <div className={`text-3xl font-bold ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {stats.overdue}
          </div>
          <div className={`text-xs mt-1 ${stats.overdue > 0 ? 'text-red-700/70 dark:text-red-300/70' : 'text-gray-500 dark:text-neutral-500'}`}>
            {stats.overdue > 0 ? 'Requires attention' : 'All up to date'}
          </div>
        </div>
        
        <div className={`bg-white dark:bg-neutral-800/50 ${stats.highRisk > 0 ? 'bg-orange-50 dark:from-orange-500/10 dark:to-orange-600/5' : ''} border ${stats.highRisk > 0 ? 'border-orange-200 dark:border-orange-500/30' : 'border-gray-200 dark:border-white/[0.1]'} rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] group`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${stats.highRisk > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-gray-600 dark:text-neutral-400'}`}>High Risk</div>
            <Shield className={`w-5 h-5 transition-colors ${stats.highRisk > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-neutral-500 group-hover:text-orange-400'}`} />
          </div>
          <div className={`text-3xl font-bold ${stats.highRisk > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
            {stats.highRisk}
          </div>
          <div className={`text-xs mt-1 ${stats.highRisk > 0 ? 'text-orange-700/70 dark:text-orange-300/70' : 'text-gray-500 dark:text-neutral-500'}`}>
            {stats.highRisk > 0 ? 'Needs review' : 'Low risk levels'}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-gradient-to-br dark:from-green-500/10 dark:to-green-600/5 border border-green-200 dark:border-green-500/20 rounded-xl p-5 transition-all duration-200 ease-in-out hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:border-green-300 dark:hover:border-green-500/30 group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-green-700 dark:text-green-300 text-sm font-medium">Published</div>
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 group-hover:text-green-500 dark:group-hover:text-green-300 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.published}</div>
          <div className="text-xs text-green-700/70 dark:text-green-300/70 mt-1">Active & published</div>
        </div>
      </div>

      {/* Overdue Banner */}
      {stats.overdue > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-red-800 dark:text-red-400 font-semibold">Warning: {stats.overdue} risk assessment(s) overdue for review</div>
            <div className="text-red-700 dark:text-red-300 text-sm">Please update assessments to maintain compliance</div>
          </div>
        </div>
      )}

      {/* Risk Assessments List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Risk Assessments</h2>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-sm text-gray-600 dark:text-neutral-400">{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</div>
            <button
              onClick={() => router.push('/dashboard/risk-assessments/archive')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-orange-500 text-orange-600 dark:text-orange-500 bg-transparent hover:bg-orange-50 dark:hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-200 text-sm"
            >
              <FileBox size={18} />
              <span className="hidden sm:inline text-sm font-medium">Archived RAs</span>
              <span className="sm:hidden text-sm font-medium">Archive</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-neutral-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search risk assessments..."
              className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Under Review">Under Review</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="coshh">COSHH</option>
          </select>
        </div>

        {/* Risk Assessments List */}
        {loading ? (
          <div className="text-gray-600 dark:text-neutral-400 text-center py-8">Loading...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800/50 rounded-xl p-8 text-center border border-gray-200 dark:border-neutral-700">
            <p className="text-gray-600 dark:text-neutral-400">No risk assessments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssessments.map((assessment) => {
              const overdue = isOverdue(assessment.review_date);
              const riskBadge = getRiskBadge(assessment);
              
              return (
                <div
                  key={assessment.id}
                  className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl p-3 sm:p-4 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:bg-gray-50 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/risk-assessments/view/${assessment.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words w-full sm:w-auto">{assessment.title}</h3>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded text-xs whitespace-nowrap">{assessment.ref_code}</span>
                        {assessment.template_type === 'coshh' && (
                          <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40 rounded text-xs whitespace-nowrap">COSHH</span>
                        )}
                        {assessment.status === 'Published' && (
                          <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/40 rounded text-xs flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle size={12} />
                            Published
                          </span>
                        )}
                        {overdue && (
                          <span className="px-2 py-1 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/40 rounded text-xs flex items-center gap-1 whitespace-nowrap">
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-neutral-400">
                        <span className="break-words">Assessor: {assessment.assessor_name}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={14} />
                          Review due: {new Date(assessment.review_date).toLocaleDateString()}
                        </span>
                        {assessment.linked_sops && assessment.linked_sops.length > 0 && (
                          <span className="whitespace-nowrap">{assessment.linked_sops.length} linked SOP{assessment.linked_sops.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const templatePath = assessment.template_type === 'coshh' 
                            ? '/dashboard/risk-assessments/coshh-template'
                            : '/dashboard/risk-assessments/general-template';
                          router.push(`${templatePath}?edit=${assessment.id}`);
                        }}
                        className="px-2 sm:px-3 py-2 bg-[#EC4899]/20 hover:bg-[#EC4899]/30 border border-[#EC4899]/40 rounded-lg text-[#EC4899] flex items-center gap-1 sm:gap-2 transition-colors text-sm"
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
                        className="flex items-center justify-center h-9 w-9 rounded-lg border border-orange-500 text-orange-600 dark:text-orange-500 bg-transparent hover:bg-orange-50 dark:hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                        title="Archive RA"
                      >
                        {archivingId === assessment.id ? (
                          <div className="w-4 h-4 border-2 border-orange-600 dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
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

