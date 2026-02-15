'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Phone, Mail, Calendar, MapPin, FileText, CheckCircle2, User, Clock, MessageSquare } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { PhotoEvidenceFeature } from '@/components/templates/features/PhotoEvidenceFeature';
import Select from '@/components/ui/Select';
import SiteSelector from '@/components/ui/SiteSelector';
import TimePicker from '@/components/ui/TimePicker';

interface CustomerComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (incidentId: string) => void;
}

const COMPLAINT_CATEGORIES = [
  { value: 'food_quality', label: 'Food Quality', description: 'Taste, temperature, freshness, or preparation issues' },
  { value: 'food_safety', label: 'Food Safety', description: 'Contamination, foreign objects, or safety concerns' },
  { value: 'service', label: 'Service', description: 'Staff behavior, wait times, or service quality' },
  { value: 'cleanliness', label: 'Cleanliness', description: 'Dining area, restrooms, or general hygiene' },
  { value: 'pricing', label: 'Pricing', description: 'Billing errors or pricing concerns' },
  { value: 'allergen', label: 'Allergen', description: 'Allergen-related issues or cross-contamination' },
  { value: 'atmosphere', label: 'Atmosphere', description: 'Noise, temperature, or ambiance' },
  { value: 'other', label: 'Other', description: 'Other complaint types' },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Minor issue, easily resolved' },
  { value: 'medium', label: 'Medium', description: 'Moderate concern requiring attention' },
  { value: 'high', label: 'High', description: 'Serious issue requiring immediate action' },
  { value: 'critical', label: 'Critical', description: 'Severe issue with potential legal/health implications' },
];

const FOLLOW_UP_ACTIONS = [
  { id: 'contact_customer', label: 'Contact Customer', description: 'Reach out to customer within 24 hours' },
  { id: 'investigation', label: 'Internal Investigation', description: 'Conduct investigation into root cause' },
  { id: 'staff_training', label: 'Staff Training', description: 'Schedule training session for relevant staff' },
  { id: 'refund_compensation', label: 'Refund/Compensation', description: 'Process refund or offer compensation' },
  { id: 'review_procedures', label: 'Review Procedures', description: 'Review and update SOPs if needed' },
  { id: 'manager_review', label: 'Manager Review', description: 'Escalate to management for review' },
  { id: 'eho_notification', label: 'EHO Notification', description: 'Notify Environmental Health Officer if required' },
  { id: 'preventive_action', label: 'Preventive Action', description: 'Implement measures to prevent recurrence' },
];

const REPORTABLE_CATEGORIES = [
  { value: 'food_safety_incident', label: 'Food Safety Incident', description: 'Reportable to Environmental Health' },
  { value: 'allergen_incident', label: 'Allergen Incident', description: 'Reportable if serious allergic reaction' },
  { value: 'serious_injury', label: 'Serious Injury', description: 'Reportable if customer injured on premises' },
  { value: 'not_reportable', label: 'Not Reportable', description: 'Standard complaint, no reporting required' },
];

export function CustomerComplaintModal({
  isOpen,
  onClose,
  onComplete
}: CustomerComplaintModalProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'details' | 'followup' | 'review'>('details');
  
  const [formData, setFormData] = useState({
    // Customer Information
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: '',
    
    // Complaint Details
    site_id: siteId || '',
    complaint_category: '',
    complaint_title: '',
    complaint_description: '',
    location_in_venue: '',
    severity: 'medium',
    
    // Immediate Response
    immediate_response: '',
    response_taken_by: profile?.full_name || '',
    response_date: new Date().toISOString().split('T')[0],
    
    // Follow-up Actions
    followUpActions: [] as string[],
    followUpActionDetails: {} as Record<string, string>,
    follow_up_deadline: '',
    assigned_to: '',
    
    // Resolution
    resolved: false,
    resolution_date: '',
    resolution_details: '',
    customer_satisfied: false,
    
    // Reporting
    reportable: false,
    reportable_category: '',
    reported_to: '',
    reported_date: '',
    report_reference: '',
    
    // Evidence
    photos: [] as Array<{ url: string; fileName: string }>,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: '',
        site_id: siteId || '',
        complaint_category: '',
        complaint_title: '',
        complaint_description: '',
        location_in_venue: '',
        severity: 'medium',
        immediate_response: '',
        response_taken_by: profile?.full_name || '',
        response_date: new Date().toISOString().split('T')[0],
        followUpActions: [],
        followUpActionDetails: {},
        follow_up_deadline: '',
        assigned_to: '',
        resolved: false,
        resolution_date: '',
        resolution_details: '',
        customer_satisfied: false,
        reportable: false,
        reportable_category: '',
        reported_to: '',
        reported_date: '',
        report_reference: '',
        photos: [],
      });
      setActiveSection('details');
    }
  }, [isOpen, siteId, profile]);

  // Auto-determine if reportable based on category and severity
  useEffect(() => {
    const isReportable = 
      formData.complaint_category === 'food_safety' ||
      formData.complaint_category === 'allergen' ||
      formData.severity === 'critical' ||
      (formData.complaint_category === 'food_safety' && formData.severity === 'high');
    
    setFormData(prev => ({ ...prev, reportable: isReportable }));
    
    if (isReportable) {
      if (formData.complaint_category === 'food_safety') {
        setFormData(prev => ({ ...prev, reportable_category: 'food_safety_incident' }));
      } else if (formData.complaint_category === 'allergen') {
        setFormData(prev => ({ ...prev, reportable_category: 'allergen_incident' }));
      } else {
        setFormData(prev => ({ ...prev, reportable_category: 'not_reportable' }));
      }
    }
  }, [formData.complaint_category, formData.severity]);

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    if (!formData.complaint_title || !formData.complaint_description) {
      toast.error('Please provide complaint title and description');
      return;
    }

    if (!formData.customer_name && !formData.customer_email && !formData.customer_phone) {
      toast.error('Please provide at least one customer contact method');
      return;
    }

    setSaving(true);

    try {
      // Prepare incident data
      const incidentData: any = {
        company_id: companyId,
        site_id: formData.site_id || null,
        title: formData.complaint_title,
        description: formData.complaint_description,
        incident_type: 'customer_complaint',
        severity: formData.severity,
        location: formData.location_in_venue,
        incident_date: formData.visit_date ? new Date(`${formData.visit_date}T${formData.visit_time || '12:00'}`).toISOString() : new Date().toISOString(),
        reported_date: new Date().toISOString(),
        reported_by: profile?.id || null,
        
        // Store customer information in description or custom fields
        immediate_actions_taken: formData.immediate_response,
        
        // Store additional data in JSONB format
        casualties: [{
          name: formData.customer_name,
          contact_email: formData.customer_email,
          contact_phone: formData.customer_phone,
          visit_date: formData.visit_date,
          visit_time: formData.visit_time,
        }],
        
        // Follow-up tasks
        follow_up_tasks: formData.followUpActions.map(actionId => ({
          action_id: actionId,
          details: formData.followUpActionDetails[actionId] || '',
          deadline: formData.follow_up_deadline,
          assigned_to: formData.assigned_to,
        })),
        
        // Resolution tracking
        status: formData.resolved ? 'resolved' : 'open',
        
        // Reporting
        riddor_reportable: formData.reportable,
        
        // Photos
        photos: formData.photos.map(p => p.url),
      };

      // Add custom fields for customer complaint specific data
      const customData: any = {
        complaint_category: formData.complaint_category,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        visit_date: formData.visit_date,
        visit_time: formData.visit_time,
        immediate_response: formData.immediate_response,
        response_taken_by: formData.response_taken_by,
        response_date: formData.response_date,
        follow_up_actions: formData.followUpActions,
        follow_up_action_details: formData.followUpActionDetails,
        follow_up_deadline: formData.follow_up_deadline,
        assigned_to: formData.assigned_to,
        resolved: formData.resolved,
        resolution_date: formData.resolution_date,
        resolution_details: formData.resolution_details,
        customer_satisfied: formData.customer_satisfied,
        reportable_category: formData.reportable_category,
        reported_to: formData.reported_to,
        reported_date: formData.reported_date,
        report_reference: formData.report_reference,
      };

      // Store custom data in description or as JSONB if available
      incidentData.description = `${formData.complaint_description}\n\n[Customer Complaint Data]\n${JSON.stringify(customData, null, 2)}`;

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert(incidentData)
        .select()
        .single();

      if (error) {
        console.error('Error saving complaint:', error);
        toast.error(`Failed to save complaint: ${error.message}`);
        return;
      }

      // Generate follow-up tasks if actions selected
      if (formData.followUpActions.length > 0 && incident?.id) {
        await generateFollowUpTasks(incident.id);
      }

      toast.success('Customer complaint logged successfully');
      
      if (onComplete) {
        onComplete(incident.id);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error saving complaint:', error);
      toast.error(`Failed to save complaint: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const generateFollowUpTasks = async (incidentId: string) => {
    try {
      const tasks = [];

      for (const actionId of formData.followUpActions) {
        const action = FOLLOW_UP_ACTIONS.find(a => a.id === actionId);
        if (!action) continue;

        // Determine priority based on severity
        let priority = 'medium';
        if (formData.severity === 'critical') priority = 'critical';
        else if (formData.severity === 'high') priority = 'high';

        // Calculate due date (default to 24 hours for customer contact, 7 days for others)
        const dueDate = new Date();
        if (actionId === 'contact_customer') {
          dueDate.setDate(dueDate.getDate() + 1); // 24 hours
        } else {
          dueDate.setDate(dueDate.getDate() + 7); // 7 days
        }

        const taskData = {
          template_id: null, // Generic task
          company_id: companyId,
          site_id: formData.site_id || null,
          title: action.label,
          description: `${action.description}\n\nRelated to complaint: ${formData.complaint_title}\n${formData.followUpActionDetails[actionId] || ''}`,
          due_date: dueDate.toISOString().split('T')[0],
          due_time: '09:00',
          daypart: 'anytime',
          priority,
          status: 'pending',
          assigned_to_role: 'manager',
          task_data: {
            incident_id: incidentId,
            complaint_category: formData.complaint_category,
            customer_name: formData.customer_name,
            action_type: actionId,
          },
        };

        tasks.push(taskData);
      }

      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('checklist_tasks')
          .insert(tasks);

        if (tasksError) {
          console.error('Error creating follow-up tasks:', tasksError);
          toast.warning('Complaint saved but some follow-up tasks could not be created');
        } else {
          toast.success(`${tasks.length} follow-up task(s) created`);
        }
      }
    } catch (error) {
      console.error('Error generating follow-up tasks:', error);
    }
  };

  if (!isOpen) return null;

  const canProceedToFollowUp = 
    formData.complaint_title && 
    formData.complaint_description && 
    formData.complaint_category &&
    (formData.customer_name || formData.customer_email || formData.customer_phone);

  const canProceedToReview = formData.immediate_response;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-[#14161c] border border-theme rounded-xl shadow-2xl w-full max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-theme-primary">Customer Complaint</h2>
              <p className="text-sm text-theme-secondary">Log and track customer complaints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-theme bg-gray-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSection('details')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSection === 'details'
                  ? 'bg-[#D37E91]/20 dark:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91]'
                  : 'text-theme-secondary hover:text-theme-primary dark:hover:text-theme-secondary'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Complaint Details</span>
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-white/20" />
            <button
              onClick={() => canProceedToFollowUp && setActiveSection('followup')}
              disabled={!canProceedToFollowUp}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSection === 'followup'
                  ? 'bg-[#D37E91]/20 dark:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91]'
                  : canProceedToFollowUp
                  ? 'text-theme-secondary hover:text-theme-primary dark:hover:text-theme-secondary'
                  : 'text-theme-tertiary/30 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Follow-up Actions</span>
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-white/20" />
            <button
              onClick={() => canProceedToReview && setActiveSection('review')}
              disabled={!canProceedToReview}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSection === 'review'
                  ? 'bg-[#D37E91]/20 dark:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91]'
                  : canProceedToReview
                  ? 'text-theme-secondary hover:text-theme-primary dark:hover:text-theme-secondary'
                  : 'text-theme-tertiary/30 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Review & Save</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'details' && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#D37E91] dark:text-[#D37E91]" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      placeholder="+44 123 456 7890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      value={formData.visit_date}
                      onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Visit Time (approx.)
                    </label>
                    <TimePicker
                      value={formData.visit_time}
                      onChange={(value) => setFormData({ ...formData, visit_time: value })}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-theme-secondary/50 mt-3">
                  * At least one contact method (name, email, or phone) is required
                </p>
              </div>

              {/* Complaint Details */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Complaint Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Site *
                    </label>
                    <SiteSelector
                      value={formData.site_id}
                      onChange={(id) => setFormData({ ...formData, site_id: id || '' })}
                      placeholder="Select site"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Complaint Category *
                    </label>
                    <Select
                      value={formData.complaint_category}
                      onValueChange={(value) => setFormData({ ...formData, complaint_category: value })}
                      placeholder="Select category"
                      options={COMPLAINT_CATEGORIES.map(cat => ({
                        label: `${cat.label} - ${cat.description}`,
                        value: cat.value
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Complaint Title *
                    </label>
                    <input
                      type="text"
                      value={formData.complaint_title}
                      onChange={(e) => setFormData({ ...formData, complaint_title: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      placeholder="Brief summary of the complaint"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Complaint Description *
                    </label>
                    <textarea
                      value={formData.complaint_description}
                      onChange={(e) => setFormData({ ...formData, complaint_description: e.target.value })}
                      rows={5}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91] resize-none"
                      placeholder="Provide detailed description of the complaint..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Location in Venue
                      </label>
                      <input
                        type="text"
                        value={formData.location_in_venue}
                        onChange={(e) => setFormData({ ...formData, location_in_venue: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                        placeholder="e.g., Table 12, Bar area, Restroom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Severity *
                      </label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value) => setFormData({ ...formData, severity: value })}
                        placeholder="Select severity"
                        options={SEVERITY_OPTIONS.map(sev => ({
                          label: `${sev.label} - ${sev.description}`,
                          value: sev.value
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Immediate Response */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Immediate Response Taken
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      What immediate action was taken? *
                    </label>
                    <textarea
                      value={formData.immediate_response}
                      onChange={(e) => setFormData({ ...formData, immediate_response: e.target.value })}
                      rows={4}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91] resize-none"
                      placeholder="Describe what immediate action was taken when the complaint was received..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Response Taken By
                      </label>
                      <input
                        type="text"
                        value={formData.response_taken_by}
                        onChange={(e) => setFormData({ ...formData, response_taken_by: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                        placeholder="Staff member name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">
                        Response Date
                      </label>
                      <input
                        type="date"
                        value={formData.response_date}
                        onChange={(e) => setFormData({ ...formData, response_date: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Photo Evidence</h3>
                <PhotoEvidenceFeature
                  photos={formData.photos}
                  onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                />
              </div>
            </div>
          )}

          {activeSection === 'followup' && (
            <div className="space-y-6">
              {/* Follow-up Actions */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Follow-up Actions
                </h3>
                <p className="text-sm text-theme-secondary mb-4">
                  Select the follow-up actions that should be taken. Tasks will be automatically created for each selected action.
                </p>
                <div className="space-y-3">
                  {FOLLOW_UP_ACTIONS.map((action) => (
                    <div
                      key={action.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        formData.followUpActions.includes(action.id)
                          ? 'bg-[#D37E91]/20 dark:bg-[#D37E91]/25 border-[#D37E91]/40 dark:border-[#D37E91]/40'
                          : 'bg-theme-surface border-theme hover:bg-theme-hover'
                      }`}
                      onClick={() => {
                        const updated = formData.followUpActions.includes(action.id)
                          ? formData.followUpActions.filter(id => id !== action.id)
                          : [...formData.followUpActions, action.id];
                        setFormData({ ...formData, followUpActions: updated });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.followUpActions.includes(action.id)}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 text-[#D37E91] dark:text-[#D37E91] rounded focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-theme-primary">{action.label}</h4>
                          <p className="text-sm text-theme-secondary mt-1">{action.description}</p>
                          {formData.followUpActions.includes(action.id) && (
                            <textarea
                              value={formData.followUpActionDetails[action.id] || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  followUpActionDetails: {
                                    ...formData.followUpActionDetails,
                                    [action.id]: e.target.value
                                  }
                                });
                              }}
                              rows={2}
 className="w-full mt-2 px-3 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91] resize-none text-sm"
                              placeholder="Add additional details or notes..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Follow-up Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.follow_up_deadline}
                      onChange={(e) => setFormData({ ...formData, follow_up_deadline: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                      placeholder="Manager or staff member"
                    />
                  </div>
                </div>
              </div>

              {/* Reporting Requirements */}
              {formData.reportable && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    Reporting Requirements
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200/80 mb-4">
                    This complaint may be reportable to regulatory authorities based on the category and severity.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-200 mb-2">
                        Reportable Category
                      </label>
                      <Select
                        value={formData.reportable_category}
                        onValueChange={(value) => setFormData({ ...formData, reportable_category: value })}
                        placeholder="Select category"
                        options={REPORTABLE_CATEGORIES.map(cat => ({
                          label: `${cat.label} - ${cat.description}`,
                          value: cat.value
                        }))}
                      />
                    </div>
                    {formData.reportable_category !== 'not_reportable' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-200 mb-2">
                            Reported To
                          </label>
                          <input
                            type="text"
                            value={formData.reported_to}
                            onChange={(e) => setFormData({ ...formData, reported_to: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-yellow-300 dark:border-yellow-500/30 text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-500"
                            placeholder="e.g., Environmental Health Officer"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-200 mb-2">
                              Reported Date
                            </label>
                            <input
                              type="date"
                              value={formData.reported_date}
                              onChange={(e) => setFormData({ ...formData, reported_date: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-yellow-300 dark:border-yellow-500/30 text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-200 mb-2">
                              Report Reference Number
                            </label>
                            <input
                              type="text"
                              value={formData.report_reference}
                              onChange={(e) => setFormData({ ...formData, report_reference: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-yellow-300 dark:border-yellow-500/30 text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-500"
                              placeholder="Reference number if available"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'review' && (
            <div className="space-y-6">
              {/* Resolution Tracking */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Resolution Tracking</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.resolved}
                      onChange={(e) => setFormData({ ...formData, resolved: e.target.checked })}
                      className="w-4 h-4 text-[#D37E91] dark:text-[#D37E91] rounded focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                    />
                    <span className="text-theme-primary">Complaint has been resolved</span>
                  </label>
                  {formData.resolved && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                          Resolution Date
                        </label>
                        <input
                          type="date"
                          value={formData.resolution_date}
                          onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                          Resolution Details
                        </label>
                        <textarea
                          value={formData.resolution_details}
                          onChange={(e) => setFormData({ ...formData, resolution_details: e.target.value })}
                          rows={4}
 className="w-full px-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91] resize-none"
                          placeholder="Describe how the complaint was resolved..."
                        />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.customer_satisfied}
                          onChange={(e) => setFormData({ ...formData, customer_satisfied: e.target.checked })}
                          className="w-4 h-4 text-[#D37E91] dark:text-[#D37E91] rounded focus:ring-[#D37E91]/50 dark:focus:ring-[#D37E91]"
                        />
                        <span className="text-theme-primary">Customer satisfied with resolution</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Complaint Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Customer:</span>
                    <span className="text-theme-primary">{formData.customer_name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Category:</span>
                    <span className="text-theme-primary">
                      {COMPLAINT_CATEGORIES.find(c => c.value === formData.complaint_category)?.label || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Severity:</span>
                    <span className="text-theme-primary capitalize">{formData.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Follow-up Actions:</span>
                    <span className="text-theme-primary">{formData.followUpActions.length} selected</span>
                  </div>
                  {formData.reportable && (
                    <div className="flex justify-between">
                      <span className="text-yellow-700 dark:text-yellow-300">Reporting Required:</span>
                      <span className="text-yellow-700 dark:text-yellow-300">Yes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-theme bg-gray-50 dark:bg-white/[0.02]">
          <div className="flex gap-2">
            {activeSection !== 'details' && (
              <Button
                onClick={() => {
                  if (activeSection === 'review') setActiveSection('followup');
                  else if (activeSection === 'followup') setActiveSection('details');
                }}
                variant="outline"
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            {activeSection !== 'review' ? (
              <Button
                onClick={() => {
                  if (activeSection === 'details' && canProceedToFollowUp) {
                    setActiveSection('followup');
                  } else if (activeSection === 'followup' && canProceedToReview) {
                    setActiveSection('review');
                  }
                }}
                disabled={
                  (activeSection === 'details' && !canProceedToFollowUp) ||
                  (activeSection === 'followup' && !canProceedToReview)
                }
                variant="primary"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                loading={saving}
                variant="primary"
              >
                Save Complaint
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

