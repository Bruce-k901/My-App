/**
 * TASK BUILDER MODAL - COMPLETE PACKAGE
 * 
 * This file contains all the code needed for the Template Builder Modal system.
 * Copy these components to your project and ensure dependencies are installed.
 * 
 * DEPENDENCIES REQUIRED:
 * - next/navigation (useRouter)
 * - lucide-react (X, Info, Plus, Calendar, Clock icons)
 * - @supabase/supabase-js (Supabase client)
 * - React hooks (useState, useEffect)
 * 
 * FILES INCLUDED:
 * 1. MasterTemplateModal component
 * 2. TaskTemplatesPage component (example usage)
 * 
 * DATABASE REQUIREMENTS:
 * - task_templates table with the following structure:
 *   - id (UUID, primary key)
 *   - company_id (UUID, foreign key)
 *   - name (TEXT, required)
 *   - slug (TEXT, required)
 *   - description (TEXT, nullable)
 *   - category (TEXT, required)
 *   - frequency (TEXT, required)
 *   - dayparts (TEXT[], nullable)
 *   - recurrence_pattern (JSONB, nullable)
 *   - time_of_day (TEXT, nullable)
 *   - instructions (TEXT, nullable)
 *   - evidence_types (TEXT[], nullable)
 *   - requires_sop (BOOLEAN, default false)
 *   - requires_risk_assessment (BOOLEAN, default false)
 *   - is_active (BOOLEAN, default true)
 *   - created_at (TIMESTAMPTZ)
 * 
 * CONTEXT REQUIREMENTS:
 * - AppContext must provide companyId (string | null)
 * 
 * USAGE:
 * 1. Copy MasterTemplateModal component to your components folder
 * 2. Copy TaskTemplatesPage as an example implementation
 * 3. Update import paths to match your project structure
 * 4. Ensure Supabase client and AppContext are configured
 */

// ============================================================================
// COMPONENT 1: MasterTemplateModal
// ============================================================================
// File location: src/components/templates/MasterTemplateModal.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Update path as needed
import { useAppContext } from '@/context/AppContext'; // Update path as needed

interface MasterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (templateConfig: any) => void;
}

const DAYPARTS = [
  { value: 'before_open', label: 'Before Open', times: ['06:00', '07:00', '08:00', '08:30', '09:00'] },
  { value: 'during_service', label: 'During Service', times: ['11:00', '12:00', '13:00', '14:00', '15:00'] },
  { value: 'afternoon', label: 'Afternoon', times: ['15:00', '16:00', '17:00'] },
  { value: 'after_service', label: 'After Service', times: ['21:00', '22:00', '23:00'] },
  { value: 'anytime', label: 'Anytime', times: ['10:00-11:00', 'Flexible'] }
];

interface FeatureItemProps {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ id, name, description, enabled, onChange }) => {
  return (
    <button
      onClick={onChange}
      className={`p-3 rounded border transition-all text-left ${enabled 
        ? 'border-pink-500 bg-pink-500/10' 
        : 'border-white/[0.1] bg-white/[0.02] hover:border-pink-500/50'}`
      }
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => {}}
          className="mt-1 accent-pink-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white">{name}</span>
            <div className="group relative">
              <Info className="w-4 h-4 text-pink-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-neutral-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {description}
              </div>
            </div>
          </div>
          <div className="text-xs text-white/60 mt-1">{description}</div>
        </div>
      </div>
    </button>
  );
};

export function MasterTemplateModal({ isOpen, onClose, onSave }: MasterTemplateModalProps) {
  const router = useRouter();
  const { companyId } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  
  const [templateConfig, setTemplateConfig] = useState({
    templateName: 'Food Safety Audit',
    complianceType: 'Food Safety',
    category: 'Kitchen Operations',
    subCategory: 'Temperature Control',
    taskName: 'Daily Temperature Check',
    taskDescription: 'Daily verification of all refrigeration units to ensure food safety standards',
    frequency: 'Daily',
    dayPart: 'Morning',
    purpose: 'Monitor and record temperatures of all refrigeration units to ensure food is stored at safe temperatures and prevent spoilage or bacterial growth.',
    importance: 'Proper temperature control is critical for food safety. Temperatures outside safe ranges can lead to foodborne illnesses, regulatory violations, and product loss.',
    method: `1. Check each refrigeration unit display
2. Record temperature in log
3. If temperature is out of range, notify manager immediately
4. Take corrective action as per SOP
5. Document all actions taken`,
    specialRequirements: 'Critical Control Point - requires immediate action if temperatures exceed 5°C for refrigeration or fall below -18°C for freezers.',
  });

  // Dayparts state for Daily frequency
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>(['before_open']);
  const [daypartTimes, setDaypartTimes] = useState<Record<string, string>>({
    before_open: '06:00',
  });

  const [features, setFeatures] = useState({
    monitorCallout: false,
    checklist: true,
    passFail: true,
    libraryDropdown: false,
    raUpload: true,
    frequencyModule: true,
    linkedEvidence: true,
    tempLogs: true,
    assetDropdown: true,
    sopUpload: true,
  });

  const toggleFeature = (featureName: keyof typeof features) => {
    setFeatures(prev => ({
      ...prev,
      [featureName]: !prev[featureName]
    }));
  };

  const toggleDaypart = (daypart: string) => {
    setSelectedDayparts(prev => 
      prev.includes(daypart)
        ? prev.filter(d => d !== daypart)
        : [...prev, daypart]
    );
    
    // Initialize time if adding new daypart
    if (!selectedDayparts.includes(daypart)) {
      const daypartConfig = DAYPARTS.find(d => d.value === daypart);
      if (daypartConfig && daypartConfig.times.length > 0) {
        setDaypartTimes(prev => ({ ...prev, [daypart]: daypartConfig.times[0] }));
      }
    }
  };

  const setDaypartTime = (daypart: string, time: string) => {
    setDaypartTimes(prev => ({ ...prev, [daypart]: time }));
  };

  const handleSave = async () => {
    if (!companyId) {
      alert('Company ID not found. Please refresh and try again.');
      return;
    }

    // Validate dayparts for Daily frequency
    if (templateConfig.frequency === 'Daily' && selectedDayparts.length === 0) {
      alert('Please select at least one daypart for Daily frequency.');
      return;
    }

    setIsSaving(true);

    try {
      // Map compliance type to category
      const categoryMap: Record<string, string> = {
        'Food Safety': 'food_safety',
        'Health & Safety': 'h_and_s',
        'Quality Control': 'compliance',
        'Environmental': 'compliance',
        'Custom': 'compliance',
      };

      // Map frequency to lowercase
      const frequencyMap: Record<string, string> = {
        'Daily': 'daily',
        'Weekly': 'weekly',
        'Monthly': 'monthly',
        'Quarterly': 'quarterly',
        'Annually': 'annually',
        'On Demand': 'triggered',
        'Custom': 'once',
      };

      // Build instructions from purpose, importance, method, specialRequirements
      const instructions = `Purpose:\n${templateConfig.purpose}\n\nImportance:\n${templateConfig.importance}\n\nMethod:\n${templateConfig.method}\n\nSpecial Requirements:\n${templateConfig.specialRequirements}`;

      // Build evidence types from features
      const evidenceTypes: string[] = [];
      if (features.tempLogs) evidenceTypes.push('temperature');
      if (features.linkedEvidence) evidenceTypes.push('photo');
      if (features.passFail) evidenceTypes.push('pass_fail');
      if (features.checklist) evidenceTypes.push('text_note');

      // Prepare dayparts array - use selected dayparts if Daily, otherwise use dayPart
      const dayparts = templateConfig.frequency === 'Daily' 
        ? selectedDayparts 
        : templateConfig.dayPart !== 'Any' 
          ? [templateConfig.dayPart.toLowerCase().replace(' ', '_')] 
          : [];

      // Prepare recurrence pattern with daypart times for Daily frequency
      let recurrencePattern: any = null;
      if (templateConfig.frequency === 'Daily' && selectedDayparts.length > 0) {
        recurrencePattern = {
          daypart_times: selectedDayparts.reduce((acc: Record<string, string>, daypart) => {
            acc[daypart] = daypartTimes[daypart] || '';
            return acc;
          }, {})
        };
      }

      // Set time_of_day to first daypart time if Daily, otherwise use dayPart
      const timeOfDay = templateConfig.frequency === 'Daily' && selectedDayparts.length > 0
        ? daypartTimes[selectedDayparts[0]] || null
        : templateConfig.dayPart !== 'Any'
          ? templateConfig.dayPart.toLowerCase().replace(' ', '_')
          : null;

      // Create slug from template name
      const slug = templateConfig.templateName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Prepare template data
      const templateData: any = {
        company_id: companyId,
        name: templateConfig.templateName,
        slug: slug,
        description: templateConfig.taskDescription,
        category: categoryMap[templateConfig.complianceType] || 'compliance',
        frequency: frequencyMap[templateConfig.frequency] || 'monthly',
        dayparts: dayparts,
        instructions: instructions,
        evidence_types: evidenceTypes,
        requires_sop: features.sopUpload,
        requires_risk_assessment: features.raUpload,
        is_active: true,
      };

      // Add optional fields
      if (recurrencePattern) {
        templateData.recurrence_pattern = recurrencePattern;
      }
      if (timeOfDay) {
        templateData.time_of_day = timeOfDay;
      }

      // Save to database
      const { data: savedTemplate, error } = await supabase
        .from('task_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        console.error('Error saving template:', error);
        alert(`Failed to save template: ${error.message}`);
        setIsSaving(false);
        return;
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave({ template: templateConfig, features, savedTemplate });
      }

      // Close modal and navigate to templates page
      onClose();
      router.push('/dashboard/tasks/templates');
      
    } catch (error) {
      console.error('Error in handleSave:', error);
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const featureList = [
    { id: 'monitorCallout', name: 'Monitor/Callout Modal', description: 'Alert and notification system' },
    { id: 'checklist', name: 'Checklist', description: 'Task checklist items' },
    { id: 'passFail', name: 'Pass/Fail Buttons', description: 'Pass/fail assessment' },
    { id: 'libraryDropdown', name: 'Library Dropdown', description: 'Resource library access' },
    { id: 'raUpload', name: 'RA Upload', description: 'Risk assessment documents' },
    { id: 'frequencyModule', name: 'Frequency Module', description: 'Task scheduling' },
    { id: 'linkedEvidence', name: 'Linked Evidence', description: 'Evidence and documentation' },
    { id: 'tempLogs', name: 'Temperature Logs', description: 'Temperature monitoring' },
    { id: 'assetDropdown', name: 'Asset Dropdown', description: 'Equipment and assets' },
    { id: 'sopUpload', name: 'SOP Upload', description: 'SOP documentation' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1220] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-pink-500/20">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-pink-500 mb-2">Template Builder</h1>
              <p className="text-gray-400">Create comprehensive compliance task templates with all required elements</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-[#141823]">
          {/* Template Configuration */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Template Configuration</h2>
            <p className="text-sm text-gray-400 mb-4">Define the structure and requirements for your compliance template</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateConfig.templateName}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, templateName: e.target.value }))}
                  className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                  placeholder="Enter template name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Compliance Type</label>
                <select
                  value={templateConfig.complianceType}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, complianceType: e.target.value }))}
                  className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                >
                  <option>Food Safety</option>
                  <option>Health & Safety</option>
                  <option>Quality Control</option>
                  <option>Environmental</option>
                  <option>Custom</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={templateConfig.category}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                  placeholder="Main category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sub-Category</label>
                <input
                  type="text"
                  value={templateConfig.subCategory}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, subCategory: e.target.value }))}
                  className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                  placeholder="Sub-category"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Task Name - Header</label>
              <input
                type="text"
                value={templateConfig.taskName}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, taskName: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                placeholder="Name of the task"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description / Notes - Header</label>
              <textarea
                value={templateConfig.taskDescription}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, taskDescription: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-h-[80px]"
                placeholder="Detailed description of the task"
              />
            </div>
          </div>

          {/* Template Features */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Template Features</h2>
            <p className="text-sm text-gray-400 mb-4">Select the features and requirements for this template</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {featureList.map((feature) => (
                <FeatureItem
                  key={feature.id}
                  id={feature.id}
                  name={feature.name}
                  description={feature.description}
                  enabled={features[feature.id as keyof typeof features]}
                  onChange={() => toggleFeature(feature.id as keyof typeof features)}
                />
              ))}
            </div>
          </div>

          {/* Task Instructions */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Task Instructions</h2>
            <p className="text-sm text-gray-400 mb-4">Define the purpose, importance, and method for this task</p>
            
            <div className="bg-pink-500/10 border-l-4 border-pink-500 p-4 mb-4">
              <h4 className="text-pink-400 font-semibold mb-2">What (Purpose)</h4>
              <textarea
                value={templateConfig.purpose}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-h-[80px]"
              />
            </div>

            <div className="bg-pink-500/10 border-l-4 border-pink-500 p-4 mb-4">
              <h4 className="text-pink-400 font-semibold mb-2">Why (Importance)</h4>
              <textarea
                value={templateConfig.importance}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, importance: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-h-[80px]"
              />
            </div>

            <div className="bg-pink-500/10 border-l-4 border-pink-500 p-4 mb-4">
              <h4 className="text-pink-400 font-semibold mb-2">How (Method / Steps)</h4>
              <textarea
                value={templateConfig.method}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, method: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-h-[80px]"
              />
            </div>

            <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4">
              <h4 className="text-orange-400 font-semibold mb-2">Special Requirements</h4>
              <textarea
                value={templateConfig.specialRequirements}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, specialRequirements: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-h-[80px]"
              />
            </div>
          </div>

          {/* Frequency & Scheduling */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Frequency & Scheduling</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
                <select
                  value={templateConfig.frequency}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annually</option>
                  <option>On Demand</option>
                  <option>Custom</option>
                </select>
              </div>
              
              {templateConfig.frequency !== 'Daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Day Part</label>
                  <select
                    value={templateConfig.dayPart}
                    onChange={(e) => setTemplateConfig(prev => ({ ...prev, dayPart: e.target.value }))}
                    className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                  >
                    <option>Any</option>
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Evening</option>
                    <option>Night</option>
                    <option>Specific Time</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dayparts Selection for Daily Frequency */}
            {templateConfig.frequency === 'Daily' && (
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                <label className="block text-sm font-medium text-gray-300 mb-3">Select Dayparts & Times</label>
                <div className="space-y-3">
                  {DAYPARTS.map((daypart) => {
                    const isSelected = selectedDayparts.includes(daypart.value);
                    return (
                      <div key={daypart.value} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDaypart(daypart.value)}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <label className="flex-1 text-sm text-white cursor-pointer" onClick={() => toggleDaypart(daypart.value)}>
                          {daypart.label}
                        </label>
                        {isSelected && (
                          <select
                            value={daypartTimes[daypart.value] || daypart.times[0]}
                            onChange={(e) => setDaypartTime(daypart.value, e.target.value)}
                            className="p-1.5 border border-white/10 rounded bg-white/[0.05] text-white text-sm min-w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {daypart.times.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedDayparts.length === 0 && (
                  <p className="text-xs text-orange-400 mt-2">Please select at least one daypart</p>
                )}
              </div>
            )}

            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded p-3">
              <p className="text-green-400 text-sm">Auto-captured: User, time, date, location - no input required</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[#0f1220]">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-white/10 rounded text-gray-300 hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// COMPONENT 2: TaskTemplatesPage (Example Implementation)
// ============================================================================
// File location: src/app/dashboard/tasks/templates/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal'; // Update path as needed
import { supabase } from '@/lib/supabase'; // Update path as needed
import { useAppContext } from '@/context/AppContext'; // Update path as needed

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  dayparts: string[] | null;
  created_at: string;
}

export default function TaskTemplatesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { companyId } = useAppContext();

  useEffect(() => {
    if (companyId) {
      loadTemplates();
    }
  }, [companyId]);

  const loadTemplates = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('id, name, description, category, frequency, dayparts, created_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = (templateConfig: any) => {
    // Reload templates to show the newly created one
    loadTemplates();
  };

  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Templates</h1>
          <p className="text-white/60">Create and manage reusable task templates</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
          aria-label="Add Template"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center text-white/60">Loading templates...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
              <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Templates Yet</h2>
            <p className="text-white/60 max-w-md mx-auto mb-4">
              Get started by creating your first task template
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
            >
              Create Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-pink-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                <span className="px-2 py-1 text-xs bg-pink-500/20 text-pink-400 rounded">
                  {formatCategory(template.category)}
                </span>
              </div>
              
              {template.description && (
                <p className="text-sm text-white/60 mb-4 line-clamp-2">{template.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-white/50">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatFrequency(template.frequency)}</span>
                </div>
                {template.dayparts && template.dayparts.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{template.dayparts.length} daypart{template.dayparts.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Master Template Modal */}
      <MasterTemplateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}


// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================
/*
 * STEP-BY-STEP SETUP:
 * 
 * 1. SPLIT THE COMPONENTS:
 *    - Extract MasterTemplateModal into: src/components/templates/MasterTemplateModal.tsx
 *    - Extract TaskTemplatesPage into: src/app/dashboard/tasks/templates/page.tsx
 * 
 * 2. UPDATE IMPORT PATHS:
 *    - Update '@/lib/supabase' to match your Supabase client location
 *    - Update '@/context/AppContext' to match your AppContext location
 *    - Update component import paths as needed
 * 
 * 3. INSTALL DEPENDENCIES (if not already installed):
 *    npm install lucide-react
 *    npm install @supabase/supabase-js
 * 
 * 4. DATABASE SETUP:
 *    - Ensure task_templates table exists with required columns
 *    - Set up RLS (Row Level Security) policies as needed
 *    - Configure company_id foreign key relationship
 * 
 * 5. CONTEXT SETUP:
 *    - Ensure AppContext provides companyId (string | null)
 *    - Wrap your app with AppProvider if not already done
 * 
 * 6. STYLING:
 *    - This uses Tailwind CSS classes
 *    - Ensure Tailwind is configured in your project
 *    - Colors used: pink-500/600/700, white, gray, neutral, green, orange
 * 
 * 7. CUSTOMIZATION:
 *    - Adjust DAYPARTS constant for your daypart requirements
 *    - Modify categoryMap and frequencyMap as needed
 *    - Customize featureList to match your feature requirements
 *    - Update navigation route in handleSave (currently '/dashboard/tasks/templates')
 */








