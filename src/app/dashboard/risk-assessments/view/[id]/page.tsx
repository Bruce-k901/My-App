"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Shield,
  FileText,
  User,
  Loader2,
  ChevronDown,
  ChevronUp
} from '@/components/ui/icons';

const getRiskLevel = (score: number) => {
  if (score <= 3) return { level: 'Low', color: 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40' };
  if (score <= 9) return { level: 'Medium', color: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40' };
  if (score <= 15) return { level: 'High', color: 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/40' };
  return { level: 'Very High', color: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40' };
};

export default function RiskAssessmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAppContext();
  const raId = params?.id as string;

  const [ra, setRA] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHazards, setExpandedHazards] = useState<Set<number>>(new Set([0]));
  const [siteName, setSiteName] = useState<string>('');
  const [ppeNames, setPPENames] = useState<string[]>([]);
  const [equipmentNames, setEquipmentNames] = useState<string[]>([]);

  useEffect(() => {
    if (raId && companyId) {
      loadRA();
    }
  }, [raId, companyId]);

  const loadRA = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('id', raId)
        .eq('company_id', companyId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Risk assessment not found');
        return;
      }

      setRA(data);

      // Load site name
      if (data.site_id) {
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', data.site_id)
          .single();
        if (site) setSiteName(site.name);
      }

      // Load PPE names
      if (data.linked_ppe?.length) {
        const { data: ppeData } = await supabase
          .from('ppe_library')
          .select('item_name')
          .in('id', data.linked_ppe);
        if (ppeData) setPPENames(ppeData.map((p: any) => p.item_name));
      }

      // Load equipment names
      if (data.linked_equipment?.length) {
        const { data: equipData } = await supabase
          .from('equipment_library')
          .select('equipment_name')
          .in('id', data.linked_equipment);
        if (equipData) setEquipmentNames(equipData.map((e: any) => e.equipment_name));
      }
    } catch (err: any) {
      console.error('Error loading RA:', err);
      setError(err.message || 'Failed to load risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const toggleHazard = (index: number) => {
    setExpandedHazards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const isOverdue = (reviewDate: string) => new Date(reviewDate) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-theme-tertiary" />
      </div>
    );
  }

  if (error || !ra) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-400 font-medium">{error || 'Risk assessment not found'}</p>
        </div>
      </div>
    );
  }

  const assessmentData = ra.assessment_data || {};
  const overdue = isOverdue(ra.review_date);
  const isCOSHH = ra.template_type === 'coshh';

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
          <ArrowLeft size={20} className="text-theme-primary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-theme-primary truncate">{ra.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-theme-tertiary">{ra.ref_code}</span>
            {isCOSHH && (
              <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40 rounded text-[10px] font-medium">COSHH</span>
            )}
          </div>
        </div>
      </div>

      {/* Status & Review Banner */}
      <div className={`rounded-xl p-3 border ${overdue
        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
        : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overdue ? (
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
            )}
            <span className={`text-sm font-medium ${overdue ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
              {overdue ? 'Review Overdue' : ra.status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-theme-tertiary">
            <Calendar size={12} />
            <span>Review: {new Date(ra.review_date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <Section title="Assessment Details">
        <DetailRow label="Assessor" value={ra.assessor_name} icon={<User size={14} className="text-theme-tertiary" />} />
        <DetailRow label="Assessment Date" value={new Date(ra.assessment_date).toLocaleDateString()} icon={<Calendar size={14} className="text-theme-tertiary" />} />
        <DetailRow label="Review Date" value={new Date(ra.review_date).toLocaleDateString()} icon={<Calendar size={14} className="text-theme-tertiary" />} />
        {siteName && <DetailRow label="Site" value={siteName} />}
        {ra.version_number && <DetailRow label="Version" value={`v${ra.version_number}`} />}
        <DetailRow label="Status" value={ra.status} />
        {ra.highest_risk_level && (
          <div className="flex items-center justify-between py-2 border-b border-theme last:border-b-0">
            <span className="text-sm text-theme-tertiary">Highest Risk</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
              ra.highest_risk_level === 'Very High' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40' :
              ra.highest_risk_level === 'High' ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/40' :
              ra.highest_risk_level === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40' :
              'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40'
            }`}>{ra.highest_risk_level}</span>
          </div>
        )}
      </Section>

      {/* General Template: Hazards */}
      {!isCOSHH && assessmentData.hazards?.length > 0 && (
        <Section title={`Hazards (${assessmentData.hazards.length})`}>
          <div className="space-y-2">
            {assessmentData.hazards.map((hazard: any, index: number) => {
              const scoreBefore = hazard.likelihoodBefore * hazard.severityBefore;
              const scoreAfter = hazard.likelihoodAfter * hazard.severityAfter;
              const riskBefore = getRiskLevel(scoreBefore);
              const riskAfter = getRiskLevel(scoreAfter);
              const expanded = expandedHazards.has(index);

              return (
                <div key={hazard.id || index} className="border border-theme rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleHazard(index)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-theme-primary">
                          {hazard.category || `Hazard ${index + 1}`}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${riskAfter.color}`}>
                          {riskAfter.level}
                        </span>
                      </div>
                      {hazard.description && (
                        <p className="text-xs text-theme-tertiary mt-0.5 truncate">{hazard.description}</p>
                      )}
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-theme-tertiary" /> : <ChevronDown size={16} className="text-theme-tertiary" />}
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-theme pt-3">
                      {hazard.description && (
                        <div>
                          <span className="text-xs font-medium text-theme-tertiary">Description</span>
                          <p className="text-sm text-theme-primary mt-0.5">{hazard.description}</p>
                        </div>
                      )}

                      {hazard.peopleAtRisk?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-theme-tertiary">People at Risk</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hazard.peopleAtRisk.map((person: string) => (
                              <span key={person} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded text-xs">
                                {person}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {hazard.existingControls && (
                        <div>
                          <span className="text-xs font-medium text-theme-tertiary">Existing Controls</span>
                          <p className="text-sm text-theme-primary mt-0.5">{hazard.existingControls}</p>
                        </div>
                      )}

                      {/* Risk scores */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Before Controls</span>
                          <div className={`mt-1 px-2 py-1 rounded text-center text-xs font-semibold border ${riskBefore.color}`}>
                            {scoreBefore} - {riskBefore.level}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-green-50/50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/20">
                          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase">After Controls</span>
                          <div className={`mt-1 px-2 py-1 rounded text-center text-xs font-semibold border ${riskAfter.color}`}>
                            {scoreAfter} - {riskAfter.level}
                          </div>
                        </div>
                      </div>

                      {hazard.additionalControls && (
                        <div>
                          <span className="text-xs font-medium text-theme-tertiary">Additional Controls</span>
                          <p className="text-sm text-theme-primary mt-0.5">{hazard.additionalControls}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-theme-tertiary">
                        {hazard.responsiblePerson && <span>Responsible: {hazard.responsiblePerson}</span>}
                        {hazard.targetDate && <span>Target: {new Date(hazard.targetDate).toLocaleDateString()}</span>}
                        {hazard.status && <span>Status: {hazard.status}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* COSHH Template: Chemicals */}
      {isCOSHH && assessmentData.chemicals?.length > 0 && (
        <Section title={`Chemicals (${assessmentData.chemicals.length})`}>
          <div className="space-y-3">
            {assessmentData.chemicals.map((chem: any, index: number) => (
              <div key={chem.id || index} className="border border-theme rounded-lg p-3 space-y-2">
                <div className="text-sm font-medium text-theme-primary">Chemical {index + 1}</div>
                {chem.howUsed && <DetailRow label="How Used" value={chem.howUsed} />}
                {chem.quantity && <DetailRow label="Quantity" value={`${chem.quantity} ${chem.unit || ''}`} />}
                {chem.frequency && <DetailRow label="Frequency" value={chem.frequency} />}
                {chem.duration && <DetailRow label="Duration" value={chem.duration} />}
                {chem.staffExposed && <DetailRow label="Staff Exposed" value={chem.staffExposed} />}
                {chem.storageLocation && <DetailRow label="Storage" value={chem.storageLocation} />}
                {chem.substitutionConsidered && (
                  <DetailRow label="Substitution Notes" value={chem.substitutionNotes || 'Considered'} />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* COSHH: Exposure Routes */}
      {isCOSHH && assessmentData.exposureRoutes && (
        <Section title="Exposure Routes">
          {Object.entries(assessmentData.exposureRoutes).map(([route, data]: [string, any]) => (
            data.enabled && (
              <div key={route} className="flex items-center justify-between py-2 border-b border-theme last:border-b-0">
                <span className="text-sm text-theme-primary capitalize">{route.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    data.severity === 'High' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40' :
                    data.severity === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40' :
                    'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40'
                  }`}>{data.severity}</span>
                </div>
              </div>
            )
          ))}
        </Section>
      )}

      {/* COSHH: Control Measures */}
      {isCOSHH && assessmentData.controlMeasures?.length > 0 && (
        <Section title="Control Measures">
          {assessmentData.controlMeasures.map((cm: any, index: number) => (
            <div key={cm.id || index} className="py-2 border-b border-theme last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-primary">{cm.type || `Control ${index + 1}`}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  cm.effectiveness === 'High' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40' :
                  cm.effectiveness === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40' :
                  'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40'
                }`}>{cm.effectiveness}</span>
              </div>
              {cm.description && <p className="text-xs text-theme-tertiary mt-1">{cm.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* COSHH: Emergency Procedures */}
      {isCOSHH && assessmentData.emergency && (
        <Section title="Emergency Procedures">
          {assessmentData.emergency.spillKitLocation && <DetailRow label="Spill Kit Location" value={assessmentData.emergency.spillKitLocation} />}
          {assessmentData.emergency.emergencyContacts && <DetailRow label="Emergency Contacts" value={assessmentData.emergency.emergencyContacts} />}
          {assessmentData.emergency.disposalProcedures && <DetailRow label="Disposal Procedures" value={assessmentData.emergency.disposalProcedures} />}
          {assessmentData.emergency.environmentalInfo && <DetailRow label="Environmental Info" value={assessmentData.emergency.environmentalInfo} />}
        </Section>
      )}

      {/* COSHH: Overall Risk */}
      {isCOSHH && assessmentData.riskAssessment && (
        <Section title="Overall Risk Assessment">
          <DetailRow label="Overall Risk Level" value={assessmentData.riskAssessment.overallRiskLevel} />
          <DetailRow label="Risk Before Controls" value={String(assessmentData.riskAssessment.riskBeforeControls)} />
          <DetailRow label="Risk After Controls" value={String(assessmentData.riskAssessment.riskAfterControls)} />
          {assessmentData.riskAssessment.riskNotes && <DetailRow label="Notes" value={assessmentData.riskAssessment.riskNotes} />}
        </Section>
      )}

      {/* PPE Requirements */}
      {ppeNames.length > 0 && (
        <Section title="PPE Requirements">
          <div className="flex flex-wrap gap-1.5">
            {ppeNames.map((name) => (
              <span key={name} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-full text-xs">
                {name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Equipment */}
      {equipmentNames.length > 0 && (
        <Section title="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {equipmentNames.map((name) => (
              <span key={name} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-full text-xs">
                {name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Training Requirements (General) */}
      {!isCOSHH && assessmentData.training && (
        <Section title="Training Requirements">
          {assessmentData.training.trainingNeeded && <DetailRow label="Training Needed" value={assessmentData.training.trainingNeeded} />}
          {assessmentData.training.trainingProvider && <DetailRow label="Provider" value={assessmentData.training.trainingProvider} />}
          {assessmentData.training.trainingFrequency && <DetailRow label="Frequency" value={assessmentData.training.trainingFrequency} />}
          {assessmentData.training.lastTrainingDate && <DetailRow label="Last Completed" value={new Date(assessmentData.training.lastTrainingDate).toLocaleDateString()} />}
        </Section>
      )}

      {/* COSHH: Health Surveillance */}
      {isCOSHH && assessmentData.healthSurveillance?.healthSurveillanceRequired && (
        <Section title="Health Surveillance">
          {assessmentData.healthSurveillance.monitoringType && <DetailRow label="Monitoring Type" value={assessmentData.healthSurveillance.monitoringType} />}
          {assessmentData.healthSurveillance.monitoringFrequency && <DetailRow label="Frequency" value={assessmentData.healthSurveillance.monitoringFrequency} />}
          {assessmentData.healthSurveillance.surveillanceResponsible && <DetailRow label="Responsible" value={assessmentData.healthSurveillance.surveillanceResponsible} />}
          {assessmentData.healthSurveillance.lastSurveillanceDate && <DetailRow label="Last Date" value={new Date(assessmentData.healthSurveillance.lastSurveillanceDate).toLocaleDateString()} />}
        </Section>
      )}

      {/* Review & Approval */}
      {assessmentData.review && (
        <Section title="Review & Approval">
          {assessmentData.review.reviewFrequency && <DetailRow label="Review Frequency" value={assessmentData.review.reviewFrequency} />}
          {assessmentData.review.assessorSignature && <DetailRow label="Assessor Signature" value={assessmentData.review.assessorSignature} />}
          {assessmentData.review.managerApproval && <DetailRow label="Manager Approval" value={assessmentData.review.managerApproval} />}
          {assessmentData.review.managerApprovalDate && <DetailRow label="Approval Date" value={new Date(assessmentData.review.managerApprovalDate).toLocaleDateString()} />}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-theme-surface/50 border border-theme rounded-xl p-4">
      <h2 className="text-sm font-semibold text-theme-primary mb-3">{title}</h2>
      {children}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-theme last:border-b-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm text-theme-tertiary">{label}</span>
      </div>
      <span className="text-sm text-theme-primary text-right max-w-[60%]">{value}</span>
    </div>
  );
}
