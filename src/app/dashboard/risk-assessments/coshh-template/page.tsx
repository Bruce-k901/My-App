"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Plus, Trash2, Save, AlertTriangle, Download, Link as LinkIcon, Shield, CheckCircle } from '@/components/ui/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getRAVersioningInfo, createRAVersionPayload } from '@/lib/utils/raVersioning';

const USAGE_METHODS = ['Spraying', 'Wiping', 'Mopping', 'Pouring', 'Diluting', 'Other'];
const FREQUENCY_OPTIONS = ['Multiple daily', 'Daily', 'Weekly', 'Monthly', 'Rarely'];
const CONTROL_TYPES = ['Elimination', 'Substitution', 'Engineering Controls', 'Administrative Controls', 'PPE'];
const EFFECTIVENESS_LEVELS = ['Low', 'Medium', 'High'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Very High'];
const EXPOSURE_ROUTES = ['Inhalation', 'Skin contact', 'Eye contact', 'Ingestion'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'];

function COSHHRiskAssessmentTemplateContent() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [raLoaded, setRALoaded] = useState(false);
  const [sites, setSites] = useState([]);
  const [chemicalsLibrary, setChemicalsLibrary] = useState([]);
  const [coshhSheets, setCOSHHSheets] = useState([]);
  
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
     
  }, []); // Only run once after mount
  const [reviewDate, setReviewDate] = useState("");
  const [status, setStatus] = useState("Draft");

  // Chemicals
  const [chemicals, setChemicals] = useState([
    {
      id: Date.now(),
      chemical_id: "",
      howUsed: "",
      quantity: "",
      unit: "",
      frequency: "",
      duration: "",
      staffExposed: "",
      storageLocation: "",
      substitutionConsidered: false,
      substitutionNotes: ""
    }
  ]);

  // Exposure routes
  const [exposureRoutes, setExposureRoutes] = useState({
    inhalation: { enabled: false, severity: 'Low', notes: "" },
    skinContact: { enabled: false, severity: 'Low', notes: "" },
    eyeContact: { enabled: false, severity: 'Low', notes: "" },
    ingestion: { enabled: false, severity: 'Low', notes: "" }
  });

  // Control measures
  const [controlMeasures, setControlMeasures] = useState([
    { id: Date.now(), type: "", description: "", effectiveness: "Medium", reviewDate: "" }
  ]);

  // Health surveillance
  const [healthSurveillanceRequired, setHealthSurveillanceRequired] = useState(false);
  const [monitoringType, setMonitoringType] = useState("");
  const [monitoringFrequency, setMonitoringFrequency] = useState("");
  const [surveillanceResponsible, setSurveillanceResponsible] = useState("");
  const [lastSurveillanceDate, setLastSurveillanceDate] = useState("");

  // Emergency procedures
  const [spillKitLocation, setSpillKitLocation] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");
  const [disposalProcedures, setDisposalProcedures] = useState("");
  const [environmentalInfo, setEnvironmentalInfo] = useState("");

  // Overall risk assessment
  const [overallRiskLevel, setOverallRiskLevel] = useState("Medium");
  const [riskBeforeControls, setRiskBeforeControls] = useState(3);
  const [riskAfterControls, setRiskAfterControls] = useState(2);
  const [riskNotes, setRiskNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [sitesResult, chemicalsResult, coshhResult] = await Promise.all([
        supabase.from('sites').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('chemicals_library').select('*').eq('company_id', companyId).order('product_name'),
        supabase.from('coshh_data_sheets').select('id, product_name, file_url').eq('company_id', companyId).eq('status', 'Active')
      ]);
      
      setSites(sitesResult.data || []);
      setChemicalsLibrary(chemicalsResult.data || []);
      setCOSHHSheets(coshhResult.data || []);
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
        
        if (assessmentData.chemicals && Array.isArray(assessmentData.chemicals)) {
          setChemicals(assessmentData.chemicals.map((c: any) => ({
            ...c,
            id: c.id || Date.now() + Math.random()
          })));
        }

        if (assessmentData.exposureRoutes) {
          setExposureRoutes(assessmentData.exposureRoutes);
        }

        if (assessmentData.controlMeasures && Array.isArray(assessmentData.controlMeasures)) {
          setControlMeasures(assessmentData.controlMeasures.map((cm: any) => ({
            ...cm,
            id: cm.id || Date.now() + Math.random()
          })));
        }

        if (assessmentData.healthSurveillance) {
          setHealthSurveillanceRequired(assessmentData.healthSurveillance.healthSurveillanceRequired || false);
          setMonitoringType(assessmentData.healthSurveillance.monitoringType || '');
          setMonitoringFrequency(assessmentData.healthSurveillance.monitoringFrequency || '');
          setSurveillanceResponsible(assessmentData.healthSurveillance.surveillanceResponsible || '');
          setLastSurveillanceDate(assessmentData.healthSurveillance.lastSurveillanceDate || '');
        }

        if (assessmentData.emergency) {
          setSpillKitLocation(assessmentData.emergency.spillKitLocation || '');
          setEmergencyContacts(assessmentData.emergency.emergencyContacts || '');
          setDisposalProcedures(assessmentData.emergency.disposalProcedures || '');
          setEnvironmentalInfo(assessmentData.emergency.environmentalInfo || '');
        }

        if (assessmentData.riskAssessment) {
          setOverallRiskLevel(assessmentData.riskAssessment.overallRiskLevel || 'Medium');
          setRiskBeforeControls(assessmentData.riskAssessment.riskBeforeControls || 3);
          setRiskAfterControls(assessmentData.riskAssessment.riskAfterControls || 2);
          setRiskNotes(assessmentData.riskAssessment.riskNotes || '');
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
      setRefCode(`COSHH-${nameBit}-001`);
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

    const assessmentData = {
      chemicals,
      exposureRoutes,
      controlMeasures,
      healthSurveillance: { 
        healthSurveillanceRequired, 
        monitoringType, 
        monitoringFrequency,
        surveillanceResponsible,
        lastSurveillanceDate
      },
      emergency: { spillKitLocation, emergencyContacts, disposalProcedures, environmentalInfo },
      riskAssessment: { overallRiskLevel, riskBeforeControls, riskAfterControls, riskNotes }
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
          template_type: 'coshh',
          title,
          ref_code: originalRA.ref_code, // Will be replaced with incremented ref_code
          site_id: siteId || null,
          assessor_name: assessorName,
          assessment_date: assessmentDate,
          review_date: reviewDate,
          next_review_date: reviewDate,
          status,
          assessment_data: assessmentData,
          linked_chemicals: chemicals.map(c => c.chemical_id).filter(Boolean),
          highest_risk_level: overallRiskLevel,
          total_hazards: chemicals.length,
          hazards_controlled: chemicals.filter(c => c.substitutionConsidered).length,
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
          template_type: 'coshh',
          title,
          ref_code: refCode,
          site_id: siteId || null,
          assessor_name: assessorName,
          assessment_date: assessmentDate,
          review_date: reviewDate,
          next_review_date: reviewDate,
          status,
          assessment_data: assessmentData,
          linked_chemicals: chemicals.map(c => c.chemical_id).filter(Boolean),
          highest_risk_level: overallRiskLevel,
          total_hazards: chemicals.length,
          hazards_controlled: chemicals.filter(c => c.substitutionConsidered).length,
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
        showToast({ title: 'COSHH Assessment saved', description: `Saved as ${refCode}`, type: 'success' });
      }
      
      router.push('/dashboard/risk-assessments');
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      showToast({ title: 'Error saving', description: error.message || 'Failed to save risk assessment', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
 return <div className="text-gray-600 dark:text-theme-tertiary text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-[rgb(var(--background))] dark:bg-neutral-900 min-h-screen">
      {/* Header */}
      <div className="bg-amber-50 dark:bg-gradient-to-r dark:from-amber-600/20 dark:to-orange-600/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-500/30">
        <h1 className="text-2xl font-semibold text-theme-primary mb-2">COSHH Risk Assessment</h1>
        <p className="text-gray-700 dark:text-neutral-300 text-sm">Control of Substances Hazardous to Health Regulations</p>
      </div>

      {/* Assessment Details */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Assessment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Activity/Task Name *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Reference Code (Auto)</label>
 <input value={refCode} readOnly className="w-full bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-600 dark:text-theme-tertiary"/>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Site/Location</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary">
              <option value="">Select site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Assessor Name *</label>
            <input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Assessment Date *</label>
            <input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Review Date (Auto)</label>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Status *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Under Review">Under Review</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </section>

      {/* Chemical Details */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Chemical Details</h2>
        <div className="space-y-4">
          {chemicals.map((chem, index) => {
            const selectedChemical = chemicalsLibrary.find(c => c.id === chem.chemical_id);
            const coshhSheet = coshhSheets.find(s => s.product_name === selectedChemical?.product_name);
            
            return (
              <div key={chem.id} className="p-4 bg-gray-50 dark:bg-neutral-900/50 rounded-lg border border-gray-200 dark:border-neutral-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-module-fg dark:text-magenta-400">Chemical {index + 1}</span>
                  <button onClick={() => setChemicals(chemicals.filter(c => c.id !== chem.id))} disabled={chemicals.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Chemical selection */}
                <div className="mb-3">
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Chemical Name</label>
                  <select value={chem.chemical_id || ''} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, chemical_id: e.target.value || null } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm">
                    <option value="">Select chemical...</option>
                    {chemicalsLibrary.map(c => <option key={c.id} value={c.id}>{c.product_name}</option>)}
                  </select>
                </div>

                {/* Auto-populated chemical info */}
                {selectedChemical && (
                  <div className="mb-3 p-3 bg-theme-button rounded border border-gray-200 dark:border-neutral-600">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
 <span className="text-gray-600 dark:text-theme-tertiary">Manufacturer:</span>
                        <span className="text-theme-primary ml-2">{selectedChemical.manufacturer || 'N/A'}</span>
                      </div>
                      {coshhSheet ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-400" />
                          <a href={coshhSheet.file_url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 flex items-center gap-1">
                            <Download size={12} />
                            View COSHH Sheet
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-red-400" />
                          <span className="text-red-400 text-xs">No COSHH sheet on file</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedChemical.hazard_symbols && selectedChemical.hazard_symbols.length > 0 && (
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-xs text-red-400 font-semibold">Hazards:</span>
                        <span className="text-xs text-red-300">{selectedChemical.hazard_symbols.join(', ')}</span>
                      </div>
                    )}

                    {selectedChemical.required_ppe && selectedChemical.required_ppe.length > 0 && (
                      <div className="mb-2">
 <span className="text-xs text-gray-600 dark:text-theme-tertiary">Required PPE:</span>
                        <span className="text-xs text-gray-700 dark:text-neutral-300 ml-2">{selectedChemical.required_ppe.join(', ')}</span>
                      </div>
                    )}

                    {selectedChemical.first_aid_instructions && (
                      <div className="mb-2">
 <span className="text-xs text-gray-600 dark:text-theme-tertiary">First Aid:</span>
                        <span className="text-xs text-gray-700 dark:text-neutral-300 ml-2">{selectedChemical.first_aid_instructions}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Usage details */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">How Used?</label>
                    <select value={chem.howUsed} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, howUsed: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm">
                      <option value="">Select...</option>
                      {USAGE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Frequency</label>
                    <select value={chem.frequency} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, frequency: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm">
                      <option value="">Select...</option>
                      {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Quantity</label>
                    <input value={chem.quantity} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, quantity: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" />
                  </div>
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Unit</label>
                    <input value={chem.unit} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, unit: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" placeholder="ml, L, etc." />
                  </div>
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Duration (min)</label>
                    <input value={chem.duration} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, duration: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" />
                  </div>
                  <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Staff Exposed</label>
                    <input type="number" value={chem.staffExposed} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, staffExposed: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" />
                  </div>
                </div>

                <div className="mb-2">
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Storage Location</label>
                  <input value={chem.storageLocation} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, storageLocation: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={chem.substitutionConsidered} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, substitutionConsidered: e.target.checked } : c))} className="rounded" />
                  <label className="text-xs text-gray-700 dark:text-neutral-300">Substitution considered?</label>
                </div>
                {chem.substitutionConsidered && (
                  <div className="mt-2">
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Substitution Notes</label>
                    <textarea value={chem.substitutionNotes} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, substitutionNotes: e.target.value } : c))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" rows={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => setChemicals([...chemicals, { id: Date.now(), chemical_id: "", howUsed: "", quantity: "", unit: "", frequency: "", duration: "", staffExposed: "", storageLocation: "", substitutionConsidered: false, substitutionNotes: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-module-fg/20 hover:bg-module-fg/30 border border-module-fg/40 rounded-lg text-module-fg text-sm">
          <Plus size={16} /> Add Chemical
        </button>
      </section>

      {/* Exposure Routes */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Exposure Routes</h2>
        <div className="space-y-3">
          {Object.entries(exposureRoutes).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3">
              <input type="checkbox" checked={value.enabled} onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, enabled: e.target.checked } })} className="mt-1 rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm text-gray-700 dark:text-neutral-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  {value.enabled && (
                    <select
                      value={value.severity}
                      onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, severity: e.target.value } })}
                      className="bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm"
                    >
                      {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                {value.enabled && (
                  <textarea value={value.notes} onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, notes: e.target.value } })} className="w-full mt-1 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm" rows={2} placeholder="Notes..." />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Control Measures */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Control Measures</h2>
        <div className="space-y-3">
          {controlMeasures.map((measure, index) => (
            <div key={measure.id} className="p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-lg border border-gray-200 dark:border-neutral-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-module-fg dark:text-magenta-400">Control {index + 1}</span>
                <button onClick={() => setControlMeasures(controlMeasures.filter(m => m.id !== measure.id))} disabled={controlMeasures.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Control Type</label>
                  <select value={measure.type} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, type: e.target.value } : m))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm">
                    <option value="">Select...</option>
                    {CONTROL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Effectiveness</label>
                  <select value={measure.effectiveness} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, effectiveness: e.target.value } : m))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm">
                    {EFFECTIVENESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-2">
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Description</label>
                <textarea value={measure.description} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, description: e.target.value } : m))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" rows={2} />
              </div>
              <div>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Review Date</label>
                <input type="date" value={measure.reviewDate} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, reviewDate: e.target.value } : m))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1 text-theme-primary text-sm" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setControlMeasures([...controlMeasures, { id: Date.now(), type: "", description: "", effectiveness: "Medium", reviewDate: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-module-fg/20 hover:bg-module-fg/30 border border-module-fg/40 rounded-lg text-module-fg text-sm">
          <Plus size={16} /> Add Control Measure
        </button>
      </section>

      {/* Risk Assessment */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Overall Risk Assessment</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Overall Risk Level</label>
            <select value={overallRiskLevel} onChange={(e) => setOverallRiskLevel(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary">
              {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Risk Before Controls (1-5)</label>
            <input type="number" min="1" max="5" value={riskBeforeControls} onChange={(e) => setRiskBeforeControls(parseInt(e.target.value))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Risk After Controls (1-5)</label>
            <input type="number" min="1" max="5" value={riskAfterControls} onChange={(e) => setRiskAfterControls(parseInt(e.target.value))} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Risk Assessment Notes</label>
          <textarea value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" rows={3} />
        </div>
      </section>

      {/* Health Surveillance */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Health Surveillance</h2>
        <div className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={healthSurveillanceRequired} onChange={(e) => setHealthSurveillanceRequired(e.target.checked)} className="rounded" />
          <label className="text-sm text-gray-700 dark:text-neutral-300">Is health surveillance required?</label>
        </div>
        {healthSurveillanceRequired && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Type of Monitoring</label>
              <input value={monitoringType} onChange={(e) => setMonitoringType(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Frequency</label>
              <input value={monitoringFrequency} onChange={(e) => setMonitoringFrequency(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Responsible Person</label>
              <input value={surveillanceResponsible} onChange={(e) => setSurveillanceResponsible(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Last Completed</label>
              <input type="date" value={lastSurveillanceDate} onChange={(e) => setLastSurveillanceDate(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
            </div>
          </div>
        )}
      </section>

      {/* Emergency Procedures */}
      <section className="bg-theme-surface/50 rounded-xl p-6 border border-theme">
        <h2 className="text-xl font-semibold text-module-fg dark:text-magenta-400 mb-4">Emergency Procedures</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Spill Kit Location</label>
            <input value={spillKitLocation} onChange={(e) => setSpillKitLocation(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Emergency Contacts</label>
            <textarea value={emergencyContacts} onChange={(e) => setEmergencyContacts(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" rows={2} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Disposal Procedures</label>
            <textarea value={disposalProcedures} onChange={(e) => setDisposalProcedures(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" rows={3} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Environmental Considerations</label>
            <textarea value={environmentalInfo} onChange={(e) => setEnvironmentalInfo(e.target.value)} className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary" rows={2} />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 sticky bottom-6">
        <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white font-medium transition-colors shadow-lg disabled:opacity-50">
          <Save size={20} />
          {saving ? 'Saving...' : 'Save COSHH Assessment'}
        </button>
      </div>
    </div>
  );
}

export default function COSHHRiskAssessmentTemplate() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-theme-tertiary">Loading COSHH template...</div>
      </div>
    }>
      <COSHHRiskAssessmentTemplateContent />
    </Suspense>
  );
}
