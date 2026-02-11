'use client';

import { useState, useEffect } from 'react';
import { X, UtensilsCrossed, AlertCircle, Info } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import Select from '@/components/ui/Select';
import SiteSelector from '@/components/ui/SiteSelector';
import CheckboxCustom from '@/components/ui/CheckboxCustom';

interface FoodPoisoningIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (incidentId: string) => void;
}

const SYMPTOM_OPTIONS = [
  { id: 'vomiting', label: '🤮 Vomiting', helpText: 'Often rapid onset' },
  { id: 'diarrhea', label: '💩 Diarrhea', helpText: 'Loose or watery stools' },
  { id: 'nausea', label: '😵 Nausea', helpText: 'Feeling sick' },
  { id: 'fever', label: '🌡️ Fever', helpText: 'Elevated body temperature' },
  { id: 'abdominal_pain', label: '🩺 Abdominal Pain', helpText: 'Stomach cramps or pain' },
  { id: 'headache', label: '🤕 Headache', helpText: '' },
  { id: 'muscle_aches', label: '💪 Muscle Aches', helpText: '' },
  { id: 'fatigue', label: '😴 Fatigue', helpText: 'Extreme tiredness' },
  { id: 'other', label: '❓ Other Symptoms', helpText: '' },
];

export function FoodPoisoningIncidentModal({
  isOpen,
  onClose,
  onComplete
}: FoodPoisoningIncidentModalProps) {
  const { companyId, siteId: defaultSiteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);
  
  // Form state - organized by section
  const [formData, setFormData] = useState({
    // Basic Information
    incident_date: new Date().toISOString().split('T')[0],
    site_id: defaultSiteId || null,
    reported_by_customer: '',
    customer_email: '',
    customer_phone: '',
    severity: 'minor',
    
    // Symptoms
    symptoms: [] as string[], // Array of symptom IDs
    symptom_start_time: '', // When symptoms first appeared
    symptom_start_datetime: '', // Exact date/time
    hospital_treatment: '',
    stool_sample_available: '',
    
    // Food Investigation
    menu_items_consumed: '', // Changed from "suspected"
    food_consumed_24h: '', // Other food in last 24 hours
    meal_time: '', // When they ate
    other_affected_persons: '',
    unaffected_comparison: '',
    
    // Evidence & Actions
    samples_preserved: '',
    eho_notified: '',
    immediate_corrective_actions: '',
    
    // Customer Management
    customer_response_sent: '',
    compensation_offered: '',
    
    // Additional Notes
    additional_notes: '',
    photos: [] as Array<{ url: string; fileName: string }>
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        incident_date: new Date().toISOString().split('T')[0],
        site_id: defaultSiteId || null,
        reported_by_customer: '',
        customer_email: '',
        customer_phone: '',
        severity: 'minor',
        symptoms: [],
        symptom_start_time: '',
        symptom_start_datetime: '',
        hospital_treatment: '',
        stool_sample_available: '',
        menu_items_consumed: '',
        food_consumed_24h: '',
        meal_time: '',
        other_affected_persons: '',
        unaffected_comparison: '',
        samples_preserved: '',
        eho_notified: '',
        immediate_corrective_actions: '',
        customer_response_sent: '',
        compensation_offered: '',
        additional_notes: '',
        photos: []
      });
    }
  }, [isOpen, defaultSiteId]);

  if (!isOpen) return null;

  const handleSymptomToggle = (symptomId: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptomId)
        ? prev.symptoms.filter(id => id !== symptomId)
        : [...prev.symptoms, symptomId]
    }));
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    // Validate required fields
    if (!formData.incident_date || !formData.reported_by_customer || (!formData.customer_email && !formData.customer_phone)) {
      toast.error('Please fill in all required fields (Customer name and at least one contact method)');
      return;
    }

    if (formData.symptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    setSaving(true);

    try {
      // Validate site_id - convert empty string to null
      const finalSiteId = formData.site_id || defaultSiteId || null;
      
      // Create incident record
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          company_id: companyId,
          site_id: finalSiteId,
          title: `Food Poisoning Report - ${formData.reported_by_customer}`,
          description: formData.additional_notes || `Food poisoning incident reported by ${formData.reported_by_customer}`,
          incident_type: 'food_poisoning',
          severity: formData.severity || 'minor',
          location: 'Food poisoning incident',
          incident_date: formData.incident_date,
          reported_by: profile?.id || null,
          reported_date: new Date().toISOString(),
          photos: formData.photos.map(p => p.url),
          status: 'open'
        })
        .select()
        .single();

      if (incidentError) {
        console.error('Incident creation error:', incidentError);
        throw new Error(`Failed to create incident: ${incidentError.message || JSON.stringify(incidentError)}`);
      }

      // Create food poisoning investigation task from template
      const { data: foodPoisoningTemplate } = await supabase
        .from('task_templates')
        .select('id')
        .eq('slug', 'food_poisoning_investigation')
        .single();

      if (foodPoisoningTemplate) {
        // Determine priority based on severity and hospital treatment
        let priority = 'medium';
        if (formData.severity === 'critical' || formData.severity === 'fatality') {
          priority = 'critical';
        } else if (formData.severity === 'major' || formData.hospital_treatment === 'fail') {
          priority = 'high';
        }

        // Build symptom onset timing from available data
        let symptom_onset = formData.symptom_start_time || 'unknown';
        if (formData.symptom_start_datetime && formData.meal_time) {
          // Can calculate timing if both are provided
          symptom_onset = formData.symptom_start_time; // Use the dropdown selection
        }

        // Create task with all form data
        const { data: task, error: taskError } = await supabase
          .from('checklist_tasks')
          .insert({
            template_id: foodPoisoningTemplate.id,
            company_id: companyId,
            site_id: finalSiteId,
            due_date: new Date().toISOString().split('T')[0],
            due_time: '09:00',
            daypart: 'anytime',
            priority,
            status: 'pending',
            assigned_to_role: 'manager',
            task_data: {
              incident_id: incident.id,
              incident_date: formData.incident_date,
              reported_by_customer: formData.reported_by_customer,
              customer_email: formData.customer_email,
              customer_phone: formData.customer_phone,
              customer_contact: `${formData.customer_email || ''} ${formData.customer_phone || ''}`.trim(), // For template compatibility
              
              // Symptoms - store as array and also as primary symptom for template compatibility
              symptoms: formData.symptoms,
              primary_symptoms: formData.symptoms[0] || 'other', // Use first selected symptom
              symptom_onset: symptom_onset,
              symptom_start_datetime: formData.symptom_start_datetime,
              symptom_start_time: formData.symptom_start_time,
              hospital_treatment: formData.hospital_treatment,
              stool_sample_available: formData.stool_sample_available,
              
              // Food investigation
              menu_items_consumed: formData.menu_items_consumed,
              suspected_menu_items: formData.menu_items_consumed, // For template compatibility
              food_consumed_24h: formData.food_consumed_24h,
              meal_time: formData.meal_time,
              other_affected_persons: formData.other_affected_persons,
              unaffected_comparison: formData.unaffected_comparison,
              
              // Evidence & actions
              samples_preserved: formData.samples_preserved,
              eho_notified: formData.eho_notified,
              immediate_corrective_actions: formData.immediate_corrective_actions,
              
              // Customer management
              customer_response_sent: formData.customer_response_sent,
              compensation_offered: formData.compensation_offered,
              
              // Additional notes
              additional_notes: formData.additional_notes,
              incident_description: formData.additional_notes, // For template compatibility
              
              source: 'food_poisoning_incident_report'
            }
          })
          .select()
          .single();

        if (taskError) {
          console.error('Error creating food poisoning investigation task:', taskError);
          toast.error('Incident created but failed to create investigation task');
        } else {
          // Update incident with task ID
          await supabase
            .from('incidents')
            .update({
              follow_up_tasks: [task.id],
              updated_at: new Date().toISOString()
            })
            .eq('id', incident.id);

          toast.success('Food poisoning incident report created and investigation task generated');
        }
      } else {
        console.warn('Food poisoning investigation template not found');
        toast.success('Incident created, but investigation template not found');
      }

      if (onComplete) {
        onComplete(incident.id);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error saving food poisoning incident:', error);
      const errorMessage = error?.message || error?.code || JSON.stringify(error) || 'Unknown error';
      console.error('Full error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      toast.error(`Failed to save food poisoning incident report: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-[#1a1d2e] border-l border-orange-300 dark:border-orange-500/30 shadow-2xl overflow-y-auto animate-slideInRight">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-200 dark:border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-500/20 rounded-lg">
                <UtensilsCrossed className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Food Poisoning Incident Report</h2>
                <p className="text-sm text-gray-600 dark:text-white/60">Complete investigation form and guide for food poisoning incidents</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm text-gray-800 dark:text-white/80">
                <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Investigation Guide</p>
                <p>This form will create a comprehensive investigation task. Complete as much information as possible to help identify the cause and prevent recurrence.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
            {/* SECTION 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">1</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Incident Date <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Site <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <SiteSelector
                    value={formData.site_id || null}
                    onChange={(siteId) => setFormData({ ...formData, site_id: siteId || null })}
                    placeholder="Select site..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Customer Name <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reported_by_customer}
                    onChange={(e) => setFormData({ ...formData, reported_by_customer: e.target.value })}
                    placeholder="Full name of customer"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <Select
                    label="Severity"
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    placeholder="Select severity..."
                    options={[
                      { label: 'Near Miss', value: 'near_miss' },
                      { label: 'Minor', value: 'minor' },
                      { label: 'Moderate', value: 'moderate' },
                      { label: 'Major', value: 'major' },
                      { label: 'Critical', value: 'critical' },
                      { label: 'Fatality', value: 'fatality' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="customer@email.com"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+44 7700 900000"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                  />
                </div>
              </div>

              {!formData.customer_email && !formData.customer_phone && (
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  At least one contact method (email or phone) is required for follow-up
                </p>
              )}
            </div>

            {/* SECTION 2: Symptoms */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">2</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Symptoms</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                  Symptoms Reported <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SYMPTOM_OPTIONS.map((symptom) => (
                    <div
                      key={symptom.id}
                      className="flex items-start gap-3 p-3 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      onClick={() => handleSymptomToggle(symptom.id)}
                    >
                      <CheckboxCustom
                        checked={formData.symptoms.includes(symptom.id)}
                        onChange={() => handleSymptomToggle(symptom.id)}
                        size={20}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{symptom.label}</div>
                        {symptom.helpText && (
                          <div className="text-xs text-gray-600 dark:text-white/50 mt-0.5">{symptom.helpText}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Symptom Onset Time After Eating"
                    value={formData.symptom_start_time}
                    onValueChange={(value) => setFormData({ ...formData, symptom_start_time: value })}
                    placeholder="Select timing..."
                    options={[
                      { label: '1-6 hours (Possible Staphylococcus, Bacillus)', value: '1-6_hours' },
                      { label: '6-24 hours (Possible Clostridium, Salmonella)', value: '6-24_hours' },
                      { label: '24-48 hours (Possible Norovirus, E.coli)', value: '24-48_hours' },
                      { label: '2-5 days (Possible Campylobacter, Listeria)', value: '2-5_days' },
                      { label: 'Unknown timing', value: 'unknown' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Exact Symptom Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.symptom_start_datetime}
                    onChange={(e) => setFormData({ ...formData, symptom_start_datetime: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Hospital Treatment Required?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hospital_treatment: 'pass' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.hospital_treatment === 'pass'
                          ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hospital_treatment: 'fail' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.hospital_treatment === 'fail'
                          ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Stool Sample Available?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, stool_sample_available: 'fail' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.stool_sample_available === 'fail'
                          ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, stool_sample_available: 'pass' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.stool_sample_available === 'pass'
                          ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Food Investigation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">3</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Food Investigation</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Menu Items Consumed <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  value={formData.menu_items_consumed}
                  onChange={(e) => setFormData({ ...formData, menu_items_consumed: e.target.value })}
                  placeholder="List all menu items and dishes the customer consumed. Include specific dishes, ingredients, and preparation details (e.g., 'Chicken Caesar Salad - contained raw egg in dressing, cooked chicken, fresh lettuce. Consumed at 7:30pm')."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                    Meal Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.meal_time}
                    onChange={(e) => setFormData({ ...formData, meal_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Other People Affected?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, other_affected_persons: 'pass' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.other_affected_persons === 'pass'
                          ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, other_affected_persons: 'fail' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.other_affected_persons === 'fail'
                          ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Other Food Consumed (Last 24 Hours)
                </label>
                <textarea
                  value={formData.food_consumed_24h}
                  onChange={(e) => setFormData({ ...formData, food_consumed_24h: e.target.value })}
                  placeholder="List any other food or drinks consumed in the 24 hours before symptoms started. This helps identify if the issue came from your establishment or elsewhere."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Unaffected Persons Comparison
                </label>
                <textarea
                  value={formData.unaffected_comparison}
                  onChange={(e) => setFormData({ ...formData, unaffected_comparison: e.target.value })}
                  placeholder="List people who ate similar items but did not get sick. This helps identify the specific cause (e.g., 'Table 12 had same chicken salad - no issues. Table 14 had vegetarian option - no issues.')"
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                />
              </div>
            </div>

            {/* SECTION 4: Evidence & Immediate Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">4</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Evidence & Immediate Actions</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Food Samples Preserved?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, samples_preserved: 'fail' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.samples_preserved === 'fail'
                          ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, samples_preserved: 'pass' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.samples_preserved === 'pass'
                          ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Environmental Health Notified?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, eho_notified: 'fail' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.eho_notified === 'fail'
                          ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, eho_notified: 'pass' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.eho_notified === 'pass'
                          ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Immediate Corrective Actions Taken</label>
                <textarea
                  value={formData.immediate_corrective_actions}
                  onChange={(e) => setFormData({ ...formData, immediate_corrective_actions: e.target.value })}
                  placeholder="What immediate actions have been taken to prevent further incidents? (e.g., 'Removed suspect batch from service, increased temperature monitoring, staff retraining on specific procedure...')"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                />
              </div>
            </div>

            {/* SECTION 5: Customer Management */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">5</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Management</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Customer Response Sent"
                    value={formData.customer_response_sent}
                    onValueChange={(value) => setFormData({ ...formData, customer_response_sent: value })}
                    placeholder="Select response..."
                    options={[
                      { label: 'Template A - Initial Acknowledgment', value: 'initial_acknowledgment' },
                      { label: 'Template B - Investigation Update', value: 'investigation_update' },
                      { label: 'Template C - Resolution Offer', value: 'resolution_offer' },
                      { label: 'Not Yet Sent', value: 'not_sent' },
                    ]}
                  />
                </div>

                <div>
                  <Select
                    label="Compensation Offered"
                    value={formData.compensation_offered}
                    onValueChange={(value) => setFormData({ ...formData, compensation_offered: value })}
                    placeholder="Select compensation..."
                    options={[
                      { label: 'Full Refund', value: 'full_refund' },
                      { label: 'Gift Voucher', value: 'voucher' },
                      { label: 'Future Discount', value: 'future_discount' },
                      { label: 'Goodwill Gesture (No Admission)', value: 'goodwill_gesture' },
                      { label: 'No Compensation Offered', value: 'none' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 6: Additional Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">6</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Notes</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Additional Information or Notes
                </label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  placeholder="Any additional relevant information, context, or notes about the incident..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving ? 'Saving...' : 'Save & Create Investigation Task'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
