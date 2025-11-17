"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertTriangle, Download, Link as LinkIcon, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const USAGE_METHODS = ['Spraying', 'Wiping', 'Mopping', 'Pouring', 'Diluting', 'Other'];
const FREQUENCY_OPTIONS = ['Multiple daily', 'Daily', 'Weekly', 'Monthly', 'Rarely'];
const CONTROL_TYPES = ['Elimination', 'Substitution', 'Engineering Controls', 'Administrative Controls', 'PPE'];
const EFFECTIVENESS_LEVELS = ['Low', 'Medium', 'High'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Very High'];
const EXPOSURE_ROUTES = ['Inhalation', 'Skin contact', 'Eye contact', 'Ingestion'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'];

export default function COSHHRiskAssessmentTemplate() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState([]);
  const [chemicalsLibrary, setChemicalsLibrary] = useState([]);
  const [coshhSheets, setCOSHHSheets] = useState([]);

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

  useEffect(() => {
    if (title) {
      const nameBit = title.replace(/\s+/g, '').slice(0, 4).toUpperCase();
      setRefCode(`COSHH-${nameBit}-001`);
    }
  }, [title]);

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
      
      const { data, error } = await supabase
        .from('risk_assessments')
        .insert({
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
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      showToast({ title: 'COSHH Assessment saved', description: `Saved as ${refCode}`, type: 'success' });
    } catch (error) {
      console.error('Error saving assessment:', error);
      showToast({ title: 'Error saving', description: error.message, type: 'error' });
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
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl p-6 border border-amber-500/30">
        <h1 className="text-2xl font-semibold mb-2">COSHH Risk Assessment</h1>
        <p className="text-neutral-300 text-sm">Control of Substances Hazardous to Health Regulations</p>
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

      {/* Chemical Details */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Chemical Details</h2>
        <div className="space-y-4">
          {chemicals.map((chem, index) => {
            const selectedChemical = chemicalsLibrary.find(c => c.id === chem.chemical_id);
            const coshhSheet = coshhSheets.find(s => s.product_name === selectedChemical?.product_name);
            
            return (
              <div key={chem.id} className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-magenta-400">Chemical {index + 1}</span>
                  <button onClick={() => setChemicals(chemicals.filter(c => c.id !== chem.id))} disabled={chemicals.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Chemical selection */}
                <div className="mb-3">
                  <label className="block text-xs text-neutral-400 mb-1">Chemical Name</label>
                  <select value={chem.chemical_id} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, chemical_id: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Select chemical...</option>
                    {chemicalsLibrary.map(c => <option key={c.id} value={c.id}>{c.product_name}</option>)}
                  </select>
                </div>

                {/* Auto-populated chemical info */}
                {selectedChemical && (
                  <div className="mb-3 p-3 bg-neutral-800 rounded border border-neutral-600">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-neutral-400">Manufacturer:</span>
                        <span className="text-white ml-2">{selectedChemical.manufacturer || 'N/A'}</span>
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
                        <span className="text-xs text-neutral-400">Required PPE:</span>
                        <span className="text-xs text-neutral-300 ml-2">{selectedChemical.required_ppe.join(', ')}</span>
                      </div>
                    )}

                    {selectedChemical.first_aid_instructions && (
                      <div className="mb-2">
                        <span className="text-xs text-neutral-400">First Aid:</span>
                        <span className="text-xs text-neutral-300 ml-2">{selectedChemical.first_aid_instructions}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Usage details */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">How Used?</label>
                    <select value={chem.howUsed} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, howUsed: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                      <option value="">Select...</option>
                      {USAGE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Frequency</label>
                    <select value={chem.frequency} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, frequency: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                      <option value="">Select...</option>
                      {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Quantity</label>
                    <input value={chem.quantity} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, quantity: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Unit</label>
                    <input value={chem.unit} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, unit: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" placeholder="ml, L, etc." />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Duration (min)</label>
                    <input value={chem.duration} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, duration: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Staff Exposed</label>
                    <input type="number" value={chem.staffExposed} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, staffExposed: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-neutral-400 mb-1">Storage Location</label>
                  <input value={chem.storageLocation} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, storageLocation: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={chem.substitutionConsidered} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, substitutionConsidered: e.target.checked } : c))} className="rounded" />
                  <label className="text-xs text-neutral-300">Substitution considered?</label>
                </div>
                {chem.substitutionConsidered && (
                  <div className="mt-2">
                    <label className="block text-xs text-neutral-400 mb-1">Substitution Notes</label>
                    <textarea value={chem.substitutionNotes} onChange={(e) => setChemicals(chemicals.map(c => c.id === chem.id ? { ...c, substitutionNotes: e.target.value } : c))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" rows={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => setChemicals([...chemicals, { id: Date.now(), chemical_id: "", howUsed: "", quantity: "", unit: "", frequency: "", duration: "", staffExposed: "", storageLocation: "", substitutionConsidered: false, substitutionNotes: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Chemical
        </button>
      </section>

      {/* Exposure Routes */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Exposure Routes</h2>
        <div className="space-y-3">
          {Object.entries(exposureRoutes).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3">
              <input type="checkbox" checked={value.enabled} onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, enabled: e.target.checked } })} className="mt-1 rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm text-neutral-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  {value.enabled && (
                    <select
                      value={value.severity}
                      onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, severity: e.target.value } })}
                      className="bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm"
                    >
                      {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                {value.enabled && (
                  <textarea value={value.notes} onChange={(e) => setExposureRoutes({ ...exposureRoutes, [key]: { ...value, notes: e.target.value } })} className="w-full mt-1 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm" rows={2} placeholder="Notes..." />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Control Measures */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Control Measures</h2>
        <div className="space-y-3">
          {controlMeasures.map((measure, index) => (
            <div key={measure.id} className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-magenta-400">Control {index + 1}</span>
                <button onClick={() => setControlMeasures(controlMeasures.filter(m => m.id !== measure.id))} disabled={controlMeasures.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Control Type</label>
                  <select value={measure.type} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, type: e.target.value } : m))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                    <option value="">Select...</option>
                    {CONTROL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Effectiveness</label>
                  <select value={measure.effectiveness} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, effectiveness: e.target.value } : m))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm">
                    {EFFECTIVENESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-2">
                <label className="block text-xs text-neutral-400 mb-1">Description</label>
                <textarea value={measure.description} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, description: e.target.value } : m))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" rows={2} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Review Date</label>
                <input type="date" value={measure.reviewDate} onChange={(e) => setControlMeasures(controlMeasures.map(m => m.id === measure.id ? { ...m, reviewDate: e.target.value } : m))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-2 py-1 text-white text-sm" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setControlMeasures([...controlMeasures, { id: Date.now(), type: "", description: "", effectiveness: "Medium", reviewDate: "" }])} className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Control Measure
        </button>
      </section>

      {/* Risk Assessment */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Overall Risk Assessment</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Overall Risk Level</label>
            <select value={overallRiskLevel} onChange={(e) => setOverallRiskLevel(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white">
              {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Risk Before Controls (1-5)</label>
            <input type="number" min="1" max="5" value={riskBeforeControls} onChange={(e) => setRiskBeforeControls(parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Risk After Controls (1-5)</label>
            <input type="number" min="1" max="5" value={riskAfterControls} onChange={(e) => setRiskAfterControls(parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm text-neutral-300 mb-1">Risk Assessment Notes</label>
          <textarea value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" rows={3} />
        </div>
      </section>

      {/* Health Surveillance */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Health Surveillance</h2>
        <div className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={healthSurveillanceRequired} onChange={(e) => setHealthSurveillanceRequired(e.target.checked)} className="rounded" />
          <label className="text-sm text-neutral-300">Is health surveillance required?</label>
        </div>
        {healthSurveillanceRequired && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Type of Monitoring</label>
              <input value={monitoringType} onChange={(e) => setMonitoringType(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Frequency</label>
              <input value={monitoringFrequency} onChange={(e) => setMonitoringFrequency(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Responsible Person</label>
              <input value={surveillanceResponsible} onChange={(e) => setSurveillanceResponsible(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Last Completed</label>
              <input type="date" value={lastSurveillanceDate} onChange={(e) => setLastSurveillanceDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
        )}
      </section>

      {/* Emergency Procedures */}
      <section className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h2 className="text-xl font-semibold text-magenta-400 mb-4">Emergency Procedures</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Spill Kit Location</label>
            <input value={spillKitLocation} onChange={(e) => setSpillKitLocation(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Emergency Contacts</label>
            <textarea value={emergencyContacts} onChange={(e) => setEmergencyContacts(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" rows={2} />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Disposal Procedures</label>
            <textarea value={disposalProcedures} onChange={(e) => setDisposalProcedures(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" rows={3} />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Environmental Considerations</label>
            <textarea value={environmentalInfo} onChange={(e) => setEnvironmentalInfo(e.target.value)} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white" rows={2} />
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
