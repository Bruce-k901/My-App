'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import { toast } from 'sonner';
import { createTemplate } from '@/app/actions/reviews';
import type { ReviewTemplate } from '@/types/reviews';

export function CreateTemplateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'custom' as ReviewTemplate['template_type'],
    instructions: '',
    rationale: '',
    expected_outcomes: '',
    recommended_duration_minutes: 30,
    recommended_frequency_days: null as number | null,
    requires_self_assessment: false,
    requires_manager_assessment: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    startTransition(async () => {
      try {
        const template = await createTemplate(formData);
        toast.success('Template created successfully');
        router.push(`/dashboard/people/reviews/templates/${template.id}`);
      } catch (error) {
        console.error('Error creating template:', error);
        toast.error('Failed to create template');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-theme-surface border border-theme rounded-lg p-6 space-y-6 shadow-sm dark:shadow-none">
      <div className="space-y-2">
        <Label className="text-theme-primary">Template Name <span className="text-blue-600 dark:text-blue-400">*</span></Label>
        <Input
          required
          placeholder="e.g., Q4 Performance Review"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-theme-primary">Description</Label>
        <textarea
          placeholder="Brief description of this template's purpose"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 bg-white dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg/20 resize-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-theme-primary">Template Type</Label>
          <select
            value={formData.template_type}
            onChange={(e) => setFormData({ ...formData, template_type: e.target.value as ReviewTemplate['template_type'] })}
            className="w-full px-4 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-module-fg"
          >
            <option value="custom">Custom</option>
            <option value="one_to_one">1-2-1</option>
            <option value="monthly_review">Monthly Review</option>
            <option value="quarterly_review">Quarterly Review</option>
            <option value="annual_appraisal">Annual Appraisal</option>
            <option value="probation_review">Probation Review</option>
            <option value="exit_interview">Exit Interview</option>
            <option value="values_review">Values Review</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-theme-primary">Recommended Duration (minutes)</Label>
          <Input
            type="number"
            min="5"
            step="5"
            value={formData.recommended_duration_minutes}
            onChange={(e) => setFormData({ ...formData, recommended_duration_minutes: parseInt(e.target.value) || 30 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-theme-primary">Instructions</Label>
        <textarea
          placeholder="Instructions for conducting this review"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          className="w-full px-4 py-2 bg-white dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg/20 resize-none"
          rows={4}
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requires_self_assessment}
            onChange={(e) => setFormData({ ...formData, requires_self_assessment: e.target.checked })}
            className="w-4 h-4 rounded border-theme bg-theme-surface accent-module-fg"
          />
          <span className="text-theme-primary">Requires Self Assessment</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requires_manager_assessment}
            onChange={(e) => setFormData({ ...formData, requires_manager_assessment: e.target.checked })}
            className="w-4 h-4 rounded border-theme bg-theme-surface accent-module-fg"
          />
          <span className="text-theme-primary">Requires Manager Assessment</span>
        </label>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="bg-module-fg hover:bg-module-fg/90 text-white border-0 shadow-sm dark:shadow-none"
        >
          {isPending ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}

