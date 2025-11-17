"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle, XCircle, Calendar, ArrowDown, ArrowUp, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getRAVersioningInfo, createRAVersionPayload } from '@/lib/utils/raVersioning';

const HAZARD_CATEGORIES = [
  'Slips, Trips & Falls',
  'Manual Handling',
  'Burns & Scalds',
  'Cuts & Lacerations',
  'Electrical Hazards',
  'Working at Height',
  'Noise & Vibration',
  'Violence & Aggression',
  'Stress & Mental Health',
  'Biological Hazards',
  'Fire Hazards',
  'Chemical Exposure',
  'Other'
];

const PEOPLE_AT_RISK = [
  'Staff (FOH)',
  'Staff (BOH)',
  'Customers',
  'Contractors',
  'Delivery Drivers',
  'Members of Public'
];

const LIKELIHOOD_OPTIONS = [
  { value: 1, label: '1 - Rare' },
  { value: 2, label: '2 - Unlikely' },
  { value: 3, label: '3 - Possible' },
  { value: 4, label: '4 - Likely' },
  { value: 5, label: '5 - Almost Certain' }
];

const SEVERITY_OPTIONS = [
  { value: 1, label: '1 - Negligible' },
  { value: 2, label: '2 - Minor' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Major' },
  { value: 5, label: '5 - Catastrophic' }
];

const getRiskLevel = (score) => {
  if (score <= 3) return { level: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500/40' };
  if (score <= 9) return { level: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
  if (score <= 15) return { level: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
  return { level: 'Very High', color: 'bg-red-500/20 text-red-400 border-red-500/40' };
};

function GeneralRiskAssessmentTemplateContent() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [raLoaded, setRALoaded] = useState(false);
  const [sites, setSites] = useState([]);
  const [sops, setSOPs] = useState([]);
  const [ppeLibrary, setPPELibrary] = useState([]);
  
  // Store original RA data for versioning
  const [originalRA, setOriginalRA] = useState<any>(null);

  // Header state
  const [title, setTitle] = useState("");
  const [refCode, setRefCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [assessorName, setAssessorName] = useState("");
  // Use client-safe date initialization to prevent hydration mismatch
  const [assessmentDate, setAssessmentDate] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new Date().toISOString().split('T')[0];
  });
  
  // Initialize date after hydration
  useEffect(() => {
    if (!assessmentDate && typeof window !== 'undefined') {
      setAssessmentDate(new Date().toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once after mount
  const [reviewDate, setReviewDate] = useState("");
  const [status, setStatus] = useState("Draft");

  // Hazards
  const [hazards, setHazards] = useState([
    {
      id: Date.now(),
      description: "",
      category: "",
      peopleAtRisk: [],
      existingControls: "",
      likelihoodBefore: 3,
      severityBefore: 3,
      additionalControls: "",
      likelihoodAfter: 1,
      severityAfter: 1,
      responsiblePerson: "",
      targetDate: "",
      status: "Not Started",
      linkedSOP: ""
    }
  ]);

  // PPE requirements
  const [selectedPPE, setSelectedPPE] = useState([]);

  // Training requirements
  const [trainingNeeded, setTrainingNeeded] = useState("");
  const [trainingProvider, setTrainingProvider] = useState("");
  const [trainingFrequency, setTrainingFrequency] = useState("Annually");
  const [lastTrainingDate, setLastTrainingDate] = useState("");

  // Review details
  const [reviewFrequency, setReviewFrequency] = useState("Annually");
  const [assessorSignature, setAssessorSignature] = useState("");
  const [managerApproval, setManagerApproval] = useState("");
  const [managerApprovalDate, setManagerApprovalDate] = useState("");

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [sitesResult, sopsResult, ppeResult] = await Promise.all([
        supabase.from('sites').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('sop_entries').select('id, title, ref_code').eq('company_id', companyId).order('title'),
        supabase.from('ppe_library').select('id, item_name').eq('company_id', companyId).order('item_name')
      ]);
      
      setSites(sitesResult.data || []);
      setSOPs(sopsResult.data || []);
      setPPELibrary(ppeResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast({ title: 'Error loading data', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.full_name) {
      setAssessorName(profile.full_name);
      setAssessorSignature(profile.full_name);
    }
  }, [profile]);

  // Load existing RA data when editing
  useEffect(() => {
    if (!editId || !companyId || raLoaded) return;

    const loadRA = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('id', editId)
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        if (!data) {
          showToast({ 
            title: 'RA not found', 
            description: 'The requested risk assessment could not be found', 
            type: 'error' 
          });
          router.push('/dashboard/risk-assessments');
          return;
        }

        // Store original RA for versioning
        setOriginalRA(data);

        // Populate header fields
        setTitle(data.title || '');
        setRefCode(data.ref_code || '');
        setSiteId(data.site_id || '');
        setAssessorName(data.assessor_name || '');
        setAssessmentDate(data.assessment_date || '');
        setReviewDate(data.review_date || '');
        setStatus(data.status || 'Draft');

        // Populate assessment data
        const assessmentData = data.assessment_data || {};
        
        if (assessmentData.hazards && Array.isArray(assessmentData.hazards)) {
          setHazards(assessmentData.hazards.map((h: any) => ({
            ...h,
            id: h.id || Date.now() + Math.random()
          })));
        }

        if (assessmentData.selectedPPE && Array.isArray(assessmentData.selectedPPE)) {
          setSelectedPPE(assessmentData.selectedPPE);
        }

        if (assessmentData.training) {
          setTrainingNeeded(assessmentData.training.trainingNeeded || false);
          setTrainingProvider(assessmentData.training.trainingProvider || '');
          setTrainingFrequency(assessmentData.training.trainingFrequency || '');
          setLastTrainingDate(assessmentData.training.lastTrainingDate || '');
        }

        if (assessmentData.review) {
          setReviewFrequency(assessmentData.review.reviewFrequency || '');
          setAssessorSignature(assessmentData.review.assessorSignature || '');
          setManagerApproval(assessmentData.review.managerApproval || false);
          setManagerApprovalDate(assessmentData.review.managerApprovalDate || '');
        }

        setRALoaded(true);
      } catch (error: any) {
        console.error('Error loading RA:', error);
        showToast({ 
          title: 'Error loading RA', 
          description: error.message || 'Failed to load risk assessment data', 
          type: 'error' 
        });
        router.push('/dashboard/risk-assessments');
      } finally {
        setLoading(false);
      }
    };

    loadRA();
  }, [editId, companyId, raLoaded, router, showToast]);

  // Auto-generate ref_code only for new RAs
  useEffect(() => {
    if (!editId && title) {
      const nameBit = title.replace(/\s+/g, '').slice(0, 4).toUpperCase();
      setRefCode(`RA-GEN-${nameBit}-001`);
    }
  }, [title, editId]);

  useEffect(() => {
    if (assessmentDate) {
      const date = new Date(assessmentDate);
      date.setFullYear(date.getFullYear() + 1);
      setReviewDate(date.toISOString().split('T')[0]);
    }
  }, [assessmentDate]);

  const handleSave = async () => {
    if (!title || !assessorName || !companyId) {
      showToast({ title: 'Missing required fields', description: 'Please fill in title and assessor name', type: 'error' });
      return;
    }

    // Calculate highest risk level
    const riskScores = hazards.map(h => h.likelihoodAfter * h.severityAfter);
    const highestScore = Math.max(...riskScores, 0);
    const highestRisk = getRiskLevel(highestScore);

    const assessmentData = {
      hazards,
      selectedPPE,
      training: { trainingNeeded, trainingProvider, trainingFrequency, lastTrainingDate },
      review: { reviewFrequency, assessorSignature, managerApproval, managerApprovalDate }
    };

    try {
      setSaving(true);
      
      let result;
      if (editId && originalRA) {
        // Create new version instead of updating
        const versioningInfo = await getRAVersioningInfo(
          originalRA.ref_code,
          companyId,
          originalRA
        );
        
        const baseData = {
          company_id: companyId,
          template_type: 'general',
          title,
          ref_code: originalRA.ref_code, // Will be replaced with incremented ref_code
          site_id: siteId || null,
          assessor_name: assessorName,
          assessment_date: assessmentDate,
          review_date: reviewDate,
          next_review_date: reviewDate,
          status,
          assessment_data: assessmentData,
          linked_sops: hazards.map(h => h.linkedSOP).filter(Boolean),
          linked_ppe: selectedPPE,
          highest_risk_level: highestRisk.level,
          total_hazards: hazards.length,
          hazards_controlled: hazards.filter(h => h.status === 'Complete').length,
          created_by: profile?.auth_user_id || null
        };
        
        const insertData = createRAVersionPayload(baseData, versioningInfo, profile, false);
        
        const { data, error } = await supabase
          .from('risk_assessments')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        result = { data, error };
      } else {
        // Insert new RA (first version)
        const baseData = {
          company_id: companyId,
          template_type: 'general',
          title,
          ref_code: refCode,
          site_id: siteId || null,
          assessor_name: assessorName,
          assessment_date: assessmentDate,
          review_date: reviewDate,
          next_review_date: reviewDate,
          status,
          assessment_data: assessmentData,
          linked_sops: hazards.map(h => h.linkedSOP).filter(Boolean),
          linked_ppe: selectedPPE,
          highest_risk_level: highestRisk.level,
          total_hazards: hazards.length,
          hazards_controlled: hazards.filter(h => h.status === 'Complete').length,
          created_by: profile?.auth_user_id || null
        };
        
        const insertData = createRAVersionPayload(baseData, { newVersion: '1.0', versionNumber: 1, parentId: null, newRefCode: refCode }, profile, true);
        
        const { data, error } = await supabase
          .from('risk_assessments')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        result = { data, error };
      }
      
      const { data, error } = result;

      if (error) throw error;

      if (editId && originalRA) {
        showToast({ 
          title: 'New version created', 
          description: `Version ${data.version_number || '2.0'} saved as ${data.ref_code} (was ${originalRA.ref_code})`, 
          type: 'success' 
        });
      } else {
        showToast({ title: 'Risk Assessment saved', description: `Saved as ${refCode}`, type: 'success' });
      }
      
      router.push('/dashboard/risk-assessments');
    } catch (error: any) {
      console.error('Error saving risk assessment:', error);
      showToast({ title: 'Error saving', description: error.message || 'Failed to save risk assessment', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-neutral-400 text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-neutral-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl p-6 border border-red-500/30">
        <h1 className="text-2xl font-semibold mb-2">General Risk Assessment</h1>
        <p className="text-neutral-300 text-sm">UK Health & Safety risk assessment</p>
      </div>

      {/* Assessment Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Assessment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-neutral-300 mb-1">Activity/Task Name *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Reference Code (Auto)</label>
            <input value={refCode} readOnly className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Site/Location</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
              <option value="">Select site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Assessor Name *</label>
            <input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Assessment Date *</label>
            <input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Review Date (Auto)</label>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Status *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Under Review">Under Review</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </section>

      {/* Hazards Section */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Hazards</h2>
        <div className="space-y-4">
          {hazards.map((hazard, index) => {
            const scoreBefore = hazard.likelihoodBefore * hazard.severityBefore;
            const scoreAfter = hazard.likelihoodAfter * hazard.severityAfter;
            const riskBefore = getRiskLevel(scoreBefore);
            const riskAfter = getRiskLevel(scoreAfter);
            const improved = scoreAfter < scoreBefore;
            
            return (
              <div key={hazard.id} className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-magenta-400">Hazard {index + 1}</span>
                  <button onClick={() => setHazards(hazards.filter(h => h.id !== hazard.id))} disabled={hazards.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Hazard Description</label>
                    <textarea value={hazard.description} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, description: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Category</label>
                      <select value={hazard.category} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, category: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="">Select...</option>
                        {HAZARD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Who's at Risk?</label>
                      <div className="flex flex-wrap gap-2">
                        {PEOPLE_AT_RISK.map(person => (
                          <label key={person} className="flex items-center gap-1 text-xs text-neutral-300">
                            <input type="checkbox" checked={hazard.peopleAtRisk.includes(person)} onChange={(e) => {
                              if (e.target.checked) {
                                setHazards(hazards.map(h => h.id === hazard.id ? { ...h, peopleAtRisk: [...h.peopleAtRisk, person] } : h));
                              } else {
                                setHazards(hazards.map(h => h.id === hazard.id ? { ...h, peopleAtRisk: h.peopleAtRisk.filter(p => p !== person) } : h));
                              }
                            }} className="rounded" />
                            {person}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Existing Controls</label>
                    <textarea value={hazard.existingControls} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, existingControls: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
                  </div>

                  {/* Risk Before Controls */}
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Risk Rating BEFORE Controls</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Likelihood</label>
                        <select value={hazard.likelihoodBefore} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, likelihoodBefore: parseInt(e.target.value) } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                          {LIKELIHOOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Severity</label>
                        <select value={hazard.severityBefore} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, severityBefore: parseInt(e.target.value) } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                          {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Risk Score</label>
                        <div className={`w-full px-2 py-1 rounded border ${riskBefore.color} text-center text-sm font-semibold`}>
                          {scoreBefore} - {riskBefore.level}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Additional Controls Needed</label>
                    <textarea value={hazard.additionalControls} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, additionalControls: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
                  </div>

                  {/* Risk After Controls */}
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-green-400">Risk Rating AFTER Additional Controls</h4>
                      {improved && <ArrowDown size={16} className="text-green-400" />}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Likelihood</label>
                        <select value={hazard.likelihoodAfter} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, likelihoodAfter: parseInt(e.target.value) } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                          {LIKELIHOOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Severity</label>
                        <select value={hazard.severityAfter} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, severityAfter: parseInt(e.target.value) } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                          {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Risk Score</label>
                        <div className={`w-full px-2 py-1 rounded border ${riskAfter.color} text-center text-sm font-semibold`}>
                          {scoreAfter} - {riskAfter.level}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Responsible Person</label>
                      <input value={hazard.responsiblePerson} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, responsiblePerson: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Target Date</label>
                      <input type="date" value={hazard.targetDate} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, targetDate: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Status</label>
                      <select value={hazard.status} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, status: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Link to Related SOP (Optional)</label>
                    <select value={hazard.linkedSOP} onChange={(e) => setHazards(hazards.map(h => h.id === hazard.id ? { ...h, linkedSOP: e.target.value } : h))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm">
                      <option value="">Select SOP...</option>
                      {sops.map(sop => <option key={sop.id} value={sop.id}>{sop.ref_code} - {sop.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setHazards([...hazards, { id: Date.now(), description: "", category: "", peopleAtRisk: [], existingControls: "", likelihoodBefore: 3, severityBefore: 3, additionalControls: "", likelihoodAfter: 1, severityAfter: 1, responsiblePerson: "", targetDate: "", status: "Not Started", linkedSOP: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Hazard
        </button>
      </section>

      {/* PPE Requirements */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">PPE Requirements</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedPPE.map(ppeId => {
            const ppe = ppeLibrary.find(p => p.id === ppeId);
            return (
              <div key={ppeId} className="px-3 py-1 bg-blue-500/20 border border-blue-500/40 rounded-full text-sm text-blue-400 flex items-center gap-2">
                {ppe?.item_name}
                <button onClick={() => setSelectedPPE(selectedPPE.filter(id => id !== ppeId))} className="text-blue-300 hover:text-blue-200">
                  <XCircle size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <select onChange={(e) => { if (e.target.value) setSelectedPPE([...selectedPPE, e.target.value]); e.target.value = ""; }} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
          <option value="">Select PPE...</option>
          {ppeLibrary.filter(p => !selectedPPE.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.item_name}</option>)}
        </select>
      </section>

      {/* Training Requirements */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Training Requirements</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Training Needed</label>
            <textarea value={trainingNeeded} onChange={(e) => setTrainingNeeded(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Training Provider</label>
              <input value={trainingProvider} onChange={(e) => setTrainingProvider(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Frequency</label>
              <select value={trainingFrequency} onChange={(e) => setTrainingFrequency(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
                <option value="Once">Once</option>
                <option value="Annually">Annually</option>
                <option value="Bi-annually">Bi-annually</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Last Completed Date</label>
            <input type="date" value={lastTrainingDate} onChange={(e) => setLastTrainingDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
        </div>
      </section>

      {/* Review & Approval */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Review & Approval</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Review Frequency</label>
            <select value={reviewFrequency} onChange={(e) => setReviewFrequency(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Bi-annually">Bi-annually</option>
              <option value="Annually">Annually</option>
              <option value="2 Years">2 Years</option>
              <option value="3 Years">3 Years</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Assessor Signature</label>
              <input value={assessorSignature} onChange={(e) => setAssessorSignature(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Date</label>
              <input type="date" value={assessmentDate} readOnly className="w-full bg-neutral-900/50 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Manager Approval</label>
              <input value={managerApproval} onChange={(e) => setManagerApproval(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Approval Date</label>
              <input type="date" value={managerApprovalDate} onChange={(e) => setManagerApprovalDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white font-medium transition-colors shadow-lg disabled:opacity-50">
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Risk Assessment'}
        </button>
      </div>
    </div>
  );
}

export default function GeneralRiskAssessmentTemplate() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400">Loading risk assessment template...</div>
      </div>
    }>
      <GeneralRiskAssessmentTemplateContent />
    </Suspense>
  );
}
