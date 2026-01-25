"use client";

import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onChange: (templateId?: string, templateName?: string) => void;
  companyId: string;
  meetingType: '1-2-1' | 'team_meeting' | 'client_call' | 'other';
}

interface Template {
  id: string;
  name: string;
  description?: string | null;
  template_type?: string;
}

export default function TemplateSelector({
  selectedTemplateId,
  onChange,
  companyId,
  meetingType
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (meetingType !== '1-2-1' || !companyId) {
        setTemplates([]);
        return;
      }

      setLoading(true);
      try {
        // Query review_templates for 1-2-1 templates from Teamly
        // Include system templates (company_id is NULL) and company-specific templates
        // First, get all active templates (we'll filter client-side for flexibility)
        const { data, error } = await supabase
          .from('review_templates')
          .select('id, name, description, template_type')
          .or(`company_id.eq.${companyId},company_id.is.null`)
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.warn('Review templates query with filter failed, trying all templates:', error);
          
          // Fallback: Get all active templates and filter client-side
          const { data: allTemplates, error: allError } = await supabase
            .from('review_templates')
            .select('id, name, description, template_type')
            .or(`company_id.eq.${companyId},company_id.is.null`)
            .eq('is_active', true)
            .order('name');

          if (!allError && allTemplates) {
            // Filter client-side for 1-2-1 related templates
            const filtered = allTemplates.filter(t => {
              if (!t.template_type) return false;
              const type = String(t.template_type).toLowerCase();
              return [
                'one_to_one', 
                'one-on-one', 
                '1-2-1',
                'standard', 
                'monthly_review', 
                'quarterly_review',
                'probation_review'
              ].includes(type);
            });
            setTemplates(filtered);
          } else {
            // Final fallback: try task_templates
            const { data: taskTemplates } = await supabase
              .from('task_templates')
              .select('id, name, description')
              .eq('company_id', companyId)
              .eq('is_active', true)
              .ilike('name', '%1-2-1%')
              .order('name')
              .limit(10);

            if (taskTemplates) {
              setTemplates(taskTemplates);
            }
          }
        } else if (data && data.length > 0) {
          // Filter for 1-2-1 related templates (one_to_one, standard, monthly, quarterly reviews)
          const filtered = data.filter(t => {
            if (!t.template_type) return false;
            const type = String(t.template_type).toLowerCase();
            return [
              'one_to_one', 
              'one-on-one', 
              '1-2-1',
              'standard', 
              'monthly_review', 
              'quarterly_review',
              'probation_review'
            ].includes(type);
          });
          setTemplates(filtered.length > 0 ? filtered : data); // Use filtered or fallback to all if no matches
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [companyId, meetingType]);

  if (meetingType !== '1-2-1') {
    return null;
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80">
        <FileText className="w-4 h-4 text-[#EC4899]" />
        Teamly Meeting Template (Optional)
      </label>
      
      <select
        value={selectedTemplateId || ''}
        onChange={(e) => {
          const templateId = e.target.value || undefined;
          const template = templates.find(t => t.id === templateId);
          onChange(templateId, template?.name);
        }}
        className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          paddingRight: '2.5rem',
        }}
      >
        <option value="" className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">
          Select a template...
        </option>
        {loading ? (
          <option disabled className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">
            Loading templates...
          </option>
        ) : templates.length === 0 ? (
          <option disabled className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">
            No templates available
          </option>
        ) : (
          templates.map((template) => (
            <option key={template.id} value={template.id} className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">
              {template.name}
            </option>
          ))
        )}
      </select>

      {selectedTemplate && selectedTemplate.description && (
        <p className="text-xs text-gray-600 dark:text-white/50 mt-1">
          {selectedTemplate.description}
        </p>
      )}

      {selectedTemplate && (
        <p className="text-xs text-gray-500 dark:text-white/40 mt-1 italic">
          Pre-meeting sections will be available after creation
        </p>
      )}
    </div>
  );
}
