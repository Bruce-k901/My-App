'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Phone, FileText, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { PhotoEvidenceFeature } from '@/components/templates/features/PhotoEvidenceFeature';
import Select from '@/components/ui/Select';

interface EmergencyIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (incidentId: string) => void;
  incidentType?: string; // Pre-select incident type (e.g., 'food_poisoning')
}

interface Casualty {
  name: string;
  age?: string;
  injury_type: string;
  severity: string;
  treatment_required: string;
}

interface Witness {
  name: string;
  contact: string;
  statement: string;
}

interface FollowUpTask {
  id: string;
  label: string;
  selected: boolean;
  description?: string;
}

const FOLLOW_UP_TASK_OPTIONS: FollowUpTask[] = [
  { id: 'update_risk_assessment', label: 'Update Risk Assessment', description: 'Review and update risk assessment based on incident findings' },
  { id: 'review_update_sop', label: 'Review/Update SOP', description: 'Review and update standard operating procedures to prevent recurrence' },
  { id: 'management_investigation', label: 'Management Investigation', description: 'Conduct formal investigation into root cause' },
  { id: 'staff_safety_briefing', label: 'Staff Safety Briefing', description: 'Brief all staff on incident and prevention measures' },
  { id: 'equipment_maintenance_check', label: 'Equipment Maintenance Check', description: 'Check and maintain equipment involved in incident' },
  { id: 'insurance_notification', label: 'Insurance Notification', description: 'Notify insurance company of incident' },
  { id: 'contact_specific_person', label: 'Contact Specific Person', description: 'Contact a specific person regarding this incident' },
  { id: 'contact_specific_company', label: 'Contact Specific Company', description: 'Contact a specific company regarding this incident' },
];

const RIDDOR_CATEGORIES = [
  { value: 'fatality', label: 'Fatality' },
  { value: 'specified_injury', label: 'Specified injury' },
  { value: 'over_seven_day', label: 'Over 7 day incapacitation' },
  { value: 'hospitalisation', label: 'Hospitalisation (worker)' },
  { value: 'public_hospitalisation', label: 'Hospitalisation (member of public)' },
  { value: 'occupational_disease', label: 'Occupational disease' },
  { value: 'dangerous_occurrence', label: 'Dangerous occurrence' },
  { value: 'other', label: 'Other / manual entry' },
];

const RIDDOR_CATEGORY_OPTIONS = [
  { label: 'Auto (based on answers)', value: 'auto' },
  ...RIDDOR_CATEGORIES.map((category) => ({ label: category.label, value: category.value })),
];

export function EmergencyIncidentModal({
  isOpen,
  onClose,
  onComplete,
  incidentType
}: EmergencyIncidentModalProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Form state - pre-select incident type if provided
  const [formData, setFormData] = useState({
    incident_datetime: new Date().toISOString().slice(0, 16),
    incident_type: incidentType || '',
    severity: '',
    location: '',
    incident_description: '',
    emergency_services_called: false,
    emergency_services_type: '',
    first_aid_provided: false,
    scene_preserved: false,
    immediate_actions: '',
    reported_by: profile?.full_name || '',
    casualties: [] as Casualty[],
    witnesses: [] as Witness[],
    photos: [] as Array<{ url: string; fileName: string }>,
    followUpTasks: [] as string[], // IDs of selected follow-up tasks
    followUpTaskDetails: {} as Record<string, string>, // Additional details for tasks
  });

  // Update incident type when prop changes or modal opens
  useEffect(() => {
    if (isOpen && incidentType) {
      setFormData(prev => ({ ...prev, incident_type: incidentType }));
    }
  }, [isOpen, incidentType]);

  useEffect(() => {
    if (isOpen) {
      setLostTimeDays(null);
      setHospitalisation(false);
      setPublicInvolved(false);
      setReportableDisease(false);
      setEnvironmentalRelease(false);
      setRiddorCategory(null);
      setRiddorCategoryManual(false);
      setRiddorDueDate(null);
      setRiddorNotes('');
      setRiddorReported(false);
      setRiddorReportedDate('');
      setRiddorReference('');
      setLastSavedIncidentId(null);
      setRiddorReason('');
      setRiddorReportable(false);
    }
  }, [isOpen]);

  // RIDDOR assessment
  const [riddorReportable, setRiddorReportable] = useState(false);
  const [riddorReason, setRiddorReason] = useState('');
  const [lostTimeDays, setLostTimeDays] = useState<number | null>(null);
  const [hospitalisation, setHospitalisation] = useState(false);
  const [publicInvolved, setPublicInvolved] = useState(false);
  const [reportableDisease, setReportableDisease] = useState(false);
  const [environmentalRelease, setEnvironmentalRelease] = useState(false);
  const [riddorCategory, setRiddorCategory] = useState<string | null>(null);
  const [riddorCategoryManual, setRiddorCategoryManual] = useState(false);
  const [riddorDueDate, setRiddorDueDate] = useState<string | null>(null);
  const [riddorNotes, setRiddorNotes] = useState('');
  const [riddorReported, setRiddorReported] = useState(false);
  const [riddorReportedDate, setRiddorReportedDate] = useState('');
  const [riddorReference, setRiddorReference] = useState('');
  const [lastSavedIncidentId, setLastSavedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const reasons: string[] = [];
    let computedCategory: string | null = null;

    if (formData.severity === 'fatality') {
      reasons.push('Fatality at work');
      computedCategory = 'fatality';
    }

    if (['critical', 'major'].includes(formData.severity)) {
      reasons.push('Specified injury requiring hospital treatment');
      computedCategory = computedCategory ?? 'specified_injury';
    }

    if (typeof lostTimeDays === 'number' && lostTimeDays >= 7) {
      reasons.push('Worker incapacitated for 7 days or more');
      computedCategory = computedCategory ?? 'over_seven_day';
    }

    if (hospitalisation) {
      reasons.push('Worker admitted to hospital');
      computedCategory = computedCategory ?? 'hospitalisation';
    }

    if (publicInvolved) {
      reasons.push('Member of public taken directly to hospital');
      computedCategory = computedCategory ?? 'public_hospitalisation';
    }

    if (reportableDisease) {
      reasons.push('Diagnosed / suspected reportable disease');
      computedCategory = computedCategory ?? 'occupational_disease';
    }

    if (environmentalRelease) {
      reasons.push('Dangerous occurrence or hazardous substance release');
      computedCategory = computedCategory ?? 'dangerous_occurrence';
    }

    const reportable = reasons.length > 0;
    setRiddorReportable(reportable);
    setRiddorReason(reportable ? reasons.join(' • ') : '');

    if (reportable) {
      if (!riddorCategoryManual) {
        setRiddorCategory(computedCategory ?? 'other');
      }
    } else {
      setRiddorCategoryManual(false);
      setRiddorCategory(null);
      setRiddorNotes('');
    }
  }, [
    formData.severity,
    lostTimeDays,
    hospitalisation,
    publicInvolved,
    reportableDisease,
    environmentalRelease,
    riddorCategoryManual,
  ]);

  useEffect(() => {
    if (!riddorReportable) {
      setRiddorDueDate(null);
      return;
    }

    const base = formData.incident_datetime
      ? new Date(formData.incident_datetime)
      : new Date();
    if (Number.isNaN(base.getTime())) {
      setRiddorDueDate(null);
      return;
    }

    const due = new Date(base.getTime());
    switch (riddorCategory ?? 'other') {
      case 'fatality':
        due.setDate(due.getDate() + 1);
        break;
      case 'over_seven_day':
        due.setDate(due.getDate() + 15);
        break;
      default:
        due.setDate(due.getDate() + 10);
    }
    setRiddorDueDate(due.toISOString().split('T')[0]);
  }, [riddorReportable, riddorCategory, formData.incident_datetime]);

  useEffect(() => {
    if (riddorReported) {
      if (!riddorReportedDate) {
        setRiddorReportedDate(new Date().toISOString().slice(0, 16));
      }
    } else {
      setRiddorReportedDate('');
      setRiddorReference('');
    }
  }, [riddorReported, riddorReportedDate]);

  useEffect(() => {
    if (!riddorReportable) {
      setRiddorReported(false);
    }
  }, [riddorReportable]);

  if (!isOpen) return null;

  const handleAddCasualty = () => {
    setFormData({
      ...formData,
      casualties: [
        ...formData.casualties,
        { name: '', age: '', injury_type: '', severity: '', treatment_required: '' }
      ]
    });
  };

  const handleUpdateCasualty = (index: number, field: keyof Casualty, value: string) => {
    const updated = [...formData.casualties];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, casualties: updated });
  };

  const handleRemoveCasualty = (index: number) => {
    setFormData({
      ...formData,
      casualties: formData.casualties.filter((_, i) => i !== index)
    });
  };

  const handleAddWitness = () => {
    setFormData({
      ...formData,
      witnesses: [
        ...formData.witnesses,
        { name: '', contact: '', statement: '' }
      ]
    });
  };

  const handleUpdateWitness = (index: number, field: keyof Witness, value: string) => {
    const updated = [...formData.witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, witnesses: updated });
  };

  const handleRemoveWitness = (index: number) => {
    setFormData({
      ...formData,
      witnesses: formData.witnesses.filter((_, i) => i !== index)
    });
  };

  const handleGenerateFollowUpTasks = async (incidentId: string) => {
    try {
      // If this is a food poisoning incident, create task from food poisoning investigation template
      if (formData.incident_type === 'food_poisoning') {
        const { data: foodPoisoningTemplate } = await supabase
          .from('task_templates')
          .select('id')
          .eq('slug', 'food_poisoning_investigation')
          .single();

        if (foodPoisoningTemplate) {
          // Determine priority based on incident severity
          let priority = 'medium';
          if (formData.severity === 'critical' || formData.severity === 'fatality') {
            priority = 'critical';
          } else if (formData.severity === 'major') {
            priority = 'high';
          }

          // Create food poisoning investigation task
          const { data: task, error: taskError } = await supabase
            .from('checklist_tasks')
            .insert({
              template_id: foodPoisoningTemplate.id,
              company_id: companyId,
              site_id: siteId,
              due_date: new Date().toISOString().split('T')[0], // Due today
              due_time: '09:00',
              daypart: 'anytime',
              priority,
              status: 'pending',
              assigned_to_role: 'manager',
              task_data: {
                incident_id: incidentId,
                incident_date: formData.incident_datetime,
                reported_by_customer: formData.reported_by,
                source: 'food_poisoning_incident_report',
                initial_description: formData.incident_description,
                location: formData.location
              }
            })
            .select()
            .single();

          if (taskError) {
            console.error('Error creating food poisoning investigation task:', taskError);
            toast.error('Failed to create food poisoning investigation task');
          } else {
            toast.success('Food poisoning investigation task created in Today\'s Tasks');
            return [task];
          }
        } else {
          console.warn('Food poisoning investigation template not found');
        }
      }

      // Create generic follow-up tasks if any are selected
      if (formData.followUpTasks.length === 0) return [];

      // Get the incident template (for creating follow-up tasks)
      const { data: template } = await supabase
        .from('task_templates')
        .select('id')
        .eq('slug', 'emergency_incident_reporting')
        .single();

      if (!template) {
        console.error('Emergency incident template not found');
        return [];
      }

      // Create follow-up tasks for each selected option
      const taskPromises = formData.followUpTasks.map(async (taskId) => {
        const taskOption = FOLLOW_UP_TASK_OPTIONS.find(t => t.id === taskId);
        if (!taskOption) return null;

        // Determine priority based on incident severity
        let priority = 'medium';
        if (formData.severity === 'critical' || formData.severity === 'fatality') {
          priority = 'critical';
        } else if (formData.severity === 'major') {
          priority = 'high';
        }

        // Create task
        const { data: task, error } = await supabase
          .from('checklist_tasks')
          .insert({
            template_id: template.id,
            company_id: companyId,
            site_id: siteId,
            due_date: new Date().toISOString().split('T')[0], // Due today
            due_time: '09:00',
            daypart: 'before_open',
            priority,
            status: 'pending',
            assigned_to_role: 'manager',
            task_data: {
              is_followup_task: true,
              incident_id: incidentId,
              task_type: taskId,
              task_description: taskOption.description || taskOption.label,
              custom_instructions: formData.followUpTaskDetails[taskId] || '',
              source: 'incident_report'
            }
          })
          .select()
          .single();

        if (error) {
          console.error(`Error creating follow-up task ${taskId}:`, error);
          return null;
        }

        return task;
      });

      const createdTasks = await Promise.all(taskPromises);
      const successfulTasks = createdTasks.filter(t => t !== null);
      
      if (successfulTasks.length > 0) {
        toast.success(`Created ${successfulTasks.length} follow-up task(s) in Today's Tasks`);
      }

      return successfulTasks;
    } catch (error) {
      console.error('Error generating follow-up tasks:', error);
      toast.error('Failed to create some follow-up tasks');
      return [];
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    // Validate required fields
    if (!formData.incident_type || !formData.severity || !formData.location || !formData.incident_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
 
     try {
      const incidentDateIso = formData.incident_datetime
        ? new Date(formData.incident_datetime).toISOString()
        : new Date().toISOString();
      const lostTimeValue =
        typeof lostTimeDays === 'number' && !Number.isNaN(lostTimeDays)
          ? lostTimeDays
          : null;
      const riddorReportedAtIso =
        riddorReported && riddorReportedDate
          ? new Date(riddorReportedDate).toISOString()
          : null;

      // Create incident record
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          company_id: companyId,
          site_id: siteId,
          title: `${formData.incident_type.replace('_', ' ')} - ${formData.severity}`,
          description: formData.incident_description,
          incident_type: formData.incident_type,
          severity: formData.severity,
          location: formData.location,
          incident_date: incidentDateIso,
          reported_date: new Date().toISOString(),
          reported_by: profile?.id || null,
          casualties: formData.casualties.filter(c => c.name),
          witnesses: formData.witnesses.filter(w => w.name),
          emergency_services_called: formData.emergency_services_called,
          emergency_services_type: formData.emergency_services_type || null,
          first_aid_provided: formData.first_aid_provided,
          scene_preserved: formData.scene_preserved,
          immediate_actions_taken: formData.immediate_actions,
          photos: formData.photos.map(p => p.url),
          documents: [],
          riddor_reportable: riddorReportable,
          riddor_reported: riddorReported,
          riddor_reported_date: riddorReportedAtIso,
          riddor_reference: riddorReference || null,
          riddor_category: riddorCategory ?? null,
          riddor_reason: riddorReason || null,
          riddor_due_date: riddorDueDate ?? null,
          riddor_notes: riddorNotes || null,
          riddor_notified_at: riddorReportedAtIso,
          lost_time_days: lostTimeValue,
          hospitalisation,
          public_involved: publicInvolved,
          reportable_disease: reportableDisease,
          environmental_release: environmentalRelease,
          status: 'open',
          export_url: null,
        })
        .select()
        .single();
 
       if (incidentError) throw incidentError;
 
       // Generate follow-up tasks (includes food poisoning investigation task if applicable)
       const createdTasks = await handleGenerateFollowUpTasks(incident.id);
 
       // Update incident with follow-up task IDs
       if (createdTasks && createdTasks.length > 0) {
         await supabase
           .from('incidents')
           .update({
             follow_up_tasks: createdTasks.map(t => t.id),
             updated_at: new Date().toISOString()
           })
           .eq('id', incident.id);
       }
 
      toast.success('Incident report created successfully. Download a copy before closing.');
      setLastSavedIncidentId(incident.id);
 
       if (onComplete) {
         onComplete(incident.id);
       }
 
       // Reset form
       setFormData({
         incident_datetime: new Date().toISOString().slice(0, 16),
         incident_type: '',
         severity: '',
         location: '',
         incident_description: '',
         emergency_services_called: false,
         emergency_services_type: '',
         first_aid_provided: false,
         scene_preserved: false,
         immediate_actions: '',
         reported_by: profile?.full_name || '',
         casualties: [],
         witnesses: [],
         photos: [],
         followUpTasks: [],
         followUpTaskDetails: {},
       });
       setLostTimeDays(null);
       setHospitalisation(false);
       setPublicInvolved(false);
       setReportableDisease(false);
       setEnvironmentalRelease(false);
       setRiddorCategory(null);
       setRiddorCategoryManual(false);
       setRiddorDueDate(null);
       setRiddorNotes('');
       setRiddorReported(false);
       setRiddorReportedDate('');
       setRiddorReference('');
       setRiddorReportable(false);
       setRiddorReason('');
       
     } catch (error) {
       console.error('Error saving incident:', error);
       toast.error('Failed to save incident report');
     } finally {
       setSaving(false);
     }
   };

  const handleDownloadReport = async () => {
    if (!lastSavedIncidentId) {
      toast.error('Save the incident before downloading the report');
      return;
    }

    try {
      setGeneratingReport(true);
      const response = await fetch(`/api/incidents/${lastSavedIncidentId}/export`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to export incident');
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `incident-${lastSavedIncidentId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Incident report downloaded');
    } catch (error) {
      console.error('Error exporting incident report:', error);
      toast.error('Failed to generate incident report');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-[#1a1d2e] border-l border-red-500/30 shadow-2xl overflow-y-auto animate-slideInRight">
        <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Emergency Incident Report</h2>
              <p className="text-sm text-white/60">Report workplace accidents, injuries, and near misses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Protocol Section */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-400 mb-2">Emergency Protocol</h3>
              <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
                <li>If life-threatening: <strong className="text-red-300">CALL 999 IMMEDIATELY</strong></li>
                <li>Provide first aid if trained and safe to do so</li>
                <li>Preserve the scene - do not move anything unless necessary for safety</li>
                <li>Secure the area to prevent further incidents</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {/* Incident Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Incident Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Incident Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.incident_datetime}
                  onChange={(e) => setFormData({ ...formData, incident_datetime: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <Select
                  label="Incident Type *"
                  value={formData.incident_type}
                  onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                  placeholder="Select type..."
                  options={[
                    { label: 'Slip/Trip/Fall', value: 'slip_trip' },
                    { label: 'Cut/Laceration', value: 'cut' },
                    { label: 'Burn/Scald', value: 'burn' },
                    { label: 'Fall from Height', value: 'fall_from_height' },
                    { label: 'Struck by Object', value: 'struck_by' },
                    { label: 'Electrical Shock', value: 'electrical' },
                    { label: 'Fire', value: 'fire' },
                    { label: 'Food Poisoning/Illness', value: 'food_poisoning' },
                    { label: 'Chemical Exposure', value: 'chemical' },
                    { label: 'Manual Handling Injury', value: 'manual_handling' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Severity *"
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  placeholder="Select severity..."
                  options={[
                    { label: 'Near Miss (No injury)', value: 'near_miss' },
                    { label: 'Minor (First aid only)', value: 'minor' },
                    { label: 'Moderate (Medical attention required)', value: 'moderate' },
                    { label: 'Major (Hospital treatment)', value: 'major' },
                    { label: 'Critical (Life-threatening)', value: 'critical' },
                    { label: 'Fatality', value: 'fatality' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Kitchen - Prep Area"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Detailed Description *</label>
              <textarea
                value={formData.incident_description}
                onChange={(e) => setFormData({ ...formData, incident_description: e.target.value })}
                placeholder="Describe what happened, what went wrong, and immediate consequences..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>
          </div>

          {/* RIDDOR Assessment */}
          {riddorReportable && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-400 mb-2">RIDDOR Reportable Incident</h3>
                  <p className="text-sm text-white/80 mb-2">{riddorReason}</p>
                  <p className="text-xs text-white/60">
                    This incident must be reported to HSE. Contact: 0345 300 9923 or report online at hse.gov.uk/riddor
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">RIDDOR Assessment &amp; Triggers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Lost Time (days off work)</label>
                <input
                  type="number"
                  min={0}
                  value={lostTimeDays ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setLostTimeDays(null);
                      return;
                    }
                    const parsed = parseInt(value, 10);
                    setLostTimeDays(Number.isNaN(parsed) ? null : Math.max(parsed, 0));
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <Select
                  label="RIDDOR Category"
                  value={riddorCategoryManual ? (riddorCategory ?? 'auto') : 'auto'}
                  onValueChange={(value) => {
                    if (value === 'auto') {
                      setRiddorCategoryManual(false);
                      return;
                    }
                    setRiddorCategoryManual(true);
                    setRiddorCategory(value);
                  }}
                  placeholder="Select category..."
                  options={RIDDOR_CATEGORY_OPTIONS}
                />
                {!riddorCategoryManual && riddorCategory && (
                  <p className="text-xs text-white/50 mt-1">
                    Detected category: {RIDDOR_CATEGORIES.find((c) => c.value === riddorCategory)?.label ?? 'Other'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Reporting Deadline</label>
                <input
                  type="text"
                  value={riddorDueDate ? new Date(riddorDueDate).toLocaleDateString() : 'Not reportable'}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Assessment Notes</label>
                <textarea
                  rows={2}
                  value={riddorNotes}
                  onChange={(e) => setRiddorNotes(e.target.value)}
                  placeholder="Add decision notes or supporting detail"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hospitalisation}
                  onChange={(e) => setHospitalisation(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Worker admitted to hospital</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicInvolved}
                  onChange={(e) => setPublicInvolved(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Member of public taken to hospital</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportableDisease}
                  onChange={(e) => setReportableDisease(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Suspected occupational disease</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={environmentalRelease}
                  onChange={(e) => setEnvironmentalRelease(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Dangerous occurrence / hazardous release</span>
              </label>
            </div>

            {riddorReportable && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={riddorReported}
                    onChange={(e) => setRiddorReported(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                  />
                  <div>
                    <p className="text-sm text-white font-semibold">RIDDOR report submitted</p>
                    <p className="text-xs text-white/60">Tick once the incident has been reported to HSE</p>
                  </div>
                </div>

                {riddorReported && (
                  <div className="space-y-3 md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white mb-1 uppercase tracking-wide">Reported Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          value={riddorReportedDate}
                          onChange={(e) => setRiddorReportedDate(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white mb-1 uppercase tracking-wide">HSE Reference</label>
                        <input
                          type="text"
                          value={riddorReference}
                          onChange={(e) => setRiddorReference(e.target.value)}
                          placeholder="e.g., Incident ref number"
                          className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Emergency Response */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Emergency Response</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emergency_services_called}
                  onChange={(e) => setFormData({ ...formData, emergency_services_called: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Emergency Services (999) Called</span>
              </label>

              {formData.emergency_services_called && (
                <div className="ml-7">
                  <Select
                    label="Emergency Service Type"
                    value={formData.emergency_services_type}
                    onValueChange={(value) => setFormData({ ...formData, emergency_services_type: value })}
                    placeholder="Select service..."
                    options={[
                      { label: 'Ambulance', value: 'ambulance' },
                      { label: 'Fire Service', value: 'fire' },
                      { label: 'Police', value: 'police' },
                      { label: 'Multiple Services', value: 'multiple' },
                    ]}
                  />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.first_aid_provided}
                  onChange={(e) => setFormData({ ...formData, first_aid_provided: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">First Aid Provided</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scene_preserved}
                  onChange={(e) => setFormData({ ...formData, scene_preserved: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Scene Preserved for Investigation</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Immediate Actions Taken</label>
              <textarea
                value={formData.immediate_actions}
                onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })}
                placeholder="Describe immediate actions taken..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Casualties & Witnesses Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Casualties */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Casualties</h3>
                <Button
                  type="button"
                  onClick={handleAddCasualty}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  Add Casualty
                </Button>
              </div>

              {formData.casualties.length === 0 ? (
                <p className="text-sm text-white/40 italic">No casualties added</p>
              ) : (
                <div className="space-y-2">
                  {formData.casualties.map((casualty, index) => (
                    <div key={index} className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/60">Casualty {index + 1}</span>
                        <button
                          onClick={() => handleRemoveCasualty(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={casualty.name}
                          onChange={(e) => handleUpdateCasualty(index, 'name', e.target.value)}
                          className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <input
                          type="text"
                          placeholder="Age"
                          value={casualty.age}
                          onChange={(e) => handleUpdateCasualty(index, 'age', e.target.value)}
                          className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <input
                          type="text"
                          placeholder="Injury Type"
                          value={casualty.injury_type}
                          onChange={(e) => handleUpdateCasualty(index, 'injury_type', e.target.value)}
                          className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500 col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="Treatment"
                          value={casualty.treatment_required}
                          onChange={(e) => handleUpdateCasualty(index, 'treatment_required', e.target.value)}
                          className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500 col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Witnesses */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Witnesses</h3>
                <Button
                  type="button"
                  onClick={handleAddWitness}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  Add Witness
                </Button>
              </div>

              {formData.witnesses.length === 0 ? (
                <p className="text-sm text-white/40 italic">No witnesses added</p>
              ) : (
                <div className="space-y-2">
                  {formData.witnesses.map((witness, index) => (
                    <div key={index} className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/60">Witness {index + 1}</span>
                        <button
                          onClick={() => handleRemoveWitness(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={witness.name}
                            onChange={(e) => handleUpdateWitness(index, 'name', e.target.value)}
                            className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <input
                            type="text"
                            placeholder="Contact"
                            value={witness.contact}
                            onChange={(e) => handleUpdateWitness(index, 'contact', e.target.value)}
                            className="px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                        <textarea
                          placeholder="Statement"
                          value={witness.statement}
                          onChange={(e) => handleUpdateWitness(index, 'statement', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Photo Evidence */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Photo Evidence</h3>
              {formData.photos.length === 0 ? (
                <span className="text-sm text-white/40 italic">No photos added</span>
              ) : (
                <span className="text-sm text-white/60">{formData.photos.length} photo{formData.photos.length !== 1 ? 's' : ''}</span>
              )}
              <label className="ml-auto">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        // Upload to Supabase storage
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `incidents/${companyId}/${fileName}`;

                        const { data: uploadData, error: uploadError } = await supabase.storage
                          .from('task-evidence')
                          .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        // Get public URL
                        const { data: urlData } = supabase.storage
                          .from('task-evidence')
                          .getPublicUrl(filePath);

                        const newPhoto = {
                          url: urlData.publicUrl,
                          fileName: file.name
                        };

                        setFormData({
                          ...formData,
                          photos: [...formData.photos, newPhoto]
                        });
                      } catch (error) {
                        console.error('Error uploading photo:', error);
                        toast.error('Failed to upload photo');
                      }
                      // Reset input
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="photo-upload"
                />
                <span className="inline-block px-4 py-2 bg-white/[0.06] border border-white/[0.1] text-white rounded-lg hover:bg-white/[0.12] hover:border-white/[0.25] cursor-pointer transition-all duration-150 shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_14px_rgba(236,72,153,0.25)] text-sm">
                  Upload Photo
                </span>
              </label>
            </div>
            
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                    <img 
                      src={photo.url} 
                      alt={photo.fileName} 
                      className="w-full h-32 object-cover rounded mb-2" 
                    />
                    <p className="text-white text-xs truncate mb-2">{photo.fileName}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const newPhotos = formData.photos.filter((_, i) => i !== index);
                        setFormData({ ...formData, photos: newPhotos });
                      }}
                      className="w-full px-3 py-1 text-red-400 hover:bg-red-500/10 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follow-up Tasks */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Follow-up Actions</h3>
              <p className="text-sm text-white/60">
                Select tasks to create in Today's Tasks feed.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
              {FOLLOW_UP_TASK_OPTIONS.map((task) => (
                <div key={task.id} className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-2.5">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.followUpTasks.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            followUpTasks: [...formData.followUpTasks, task.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            followUpTasks: formData.followUpTasks.filter(t => t !== task.id),
                            followUpTaskDetails: { ...formData.followUpTaskDetails, [task.id]: '' }
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{task.label}</div>
                      {task.description && (
                        <div className="text-xs text-white/50 mt-0.5">{task.description}</div>
                      )}
                      {formData.followUpTasks.includes(task.id) && (
                        <textarea
                          placeholder="Additional details..."
                          value={formData.followUpTaskDetails[task.id] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            followUpTaskDetails: {
                              ...formData.followUpTaskDetails,
                              [task.id]: e.target.value
                            }
                          })}
                          rows={2}
                          className="w-full mt-2 px-2 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Reported By */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Reported By (Name) *</label>
            <input
              type="text"
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDownloadReport}
              variant="outline"
              disabled={saving || generatingReport || !lastSavedIncidentId}
            >
              <Download className="w-4 h-4 mr-2" />
              {generatingReport ? 'Preparing...' : 'Download Report'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="destructive"
            >
              {saving ? 'Saving...' : 'Save Incident Report'}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

