"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, AlertTriangle, CheckCircle, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

const TEMPLATES = [
  {
    id: 'general',
    title: 'General Risk Assessment',
    description: 'Comprehensive risk assessment for all activities',
    color: 'from-red-500/20 to-orange-500/20',
    borderColor: 'border-red-500/30',
    link: '/dashboard/risk-assessments/general-template'
  },
  {
    id: 'coshh',
    title: 'COSHH Risk Assessment',
    description: 'Control of Substances Hazardous to Health',
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    link: '/dashboard/risk-assessments/coshh-template'
  }
];

export default function RiskAssessmentsPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadRiskAssessments();
  }, [companyId]);

  const loadRiskAssessments = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRiskAssessments(data || []);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Total RAs</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Overdue</div>
          <div className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {stats.overdue}
          </div>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">High Risk</div>
          <div className={`text-2xl font-bold mt-1 ${stats.highRisk > 0 ? 'text-orange-400' : 'text-white'}`}>
            {stats.highRisk}
          </div>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="text-neutral-400 text-sm">Published</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.published}</div>
        </div>
      </div>

      {/* Overdue Banner */}
      {stats.overdue > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400" />
          <div className="flex-1">
            <div className="text-red-400 font-semibold">Warning: {stats.overdue} risk assessment(s) overdue for review</div>
            <div className="text-red-300 text-sm">Please update assessments to maintain compliance</div>
          </div>
        </div>
      )}
      {/* Create New Templates */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Create New Risk Assessment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => router.push(template.link)}
              className={`bg-gradient-to-br ${template.color} border ${template.borderColor} rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                  <FileText size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{template.title}</h3>
              </div>
              <p className="text-sm text-neutral-300">{template.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
                <Plus size={14} />
                <span>Create new</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Existing Risk Assessments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Existing Risk Assessments</h2>
          <div className="text-sm text-neutral-400">{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search risk assessments..."
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Under Review">Under Review</option>
            <option value="Archived">Archived</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
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
                  className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:bg-neutral-800/70 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/risk-assessments/view/${assessment.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{assessment.title}</h3>
                        <span className="px-2 py-1 bg-neutral-700 text-neutral-300 rounded text-xs">{assessment.ref_code}</span>
                        {assessment.template_type === 'coshh' && (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs">COSHH</span>
                        )}
                        {assessment.status === 'Published' && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Published
                          </span>
                        )}
                        {overdue && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Overdue
                          </span>
                        )}
                        {riskBadge && (
                          <span className={`px-2 py-1 border rounded text-xs ${riskBadge.color}`}>
                            {riskBadge.text}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-400">
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

