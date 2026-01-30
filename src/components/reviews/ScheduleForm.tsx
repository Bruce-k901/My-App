'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, FileText, Repeat, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { createSchedule } from '@/app/actions/reviews';
import type { ReviewTemplate, RecurrencePattern } from '@/types/reviews';
import { getTemplateConfig, isDisciplinaryTemplate, TEMPLATE_CATEGORIES } from '@/lib/reviews-utils';

interface ScheduleFormProps {
  templates: ReviewTemplate[];
  employees?: Array<{ id: string; full_name: string; avatar_url?: string }>;
}

export function ScheduleForm({ templates, employees = [] }: ScheduleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    employee_id: '',
    template_id: '',
    title: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    due_date: '',
    is_recurring: false,
    recurrence_pattern: '' as RecurrencePattern | '',
    notes: '',
  });

  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  // Group templates by category for the dropdown
  const groupedTemplateOptions = useMemo(() => {
    const grouped: Array<{ label: string; value: string; category: string }> = [];
    
    // Performance templates
    const performance = templates.filter(t => {
      const config = getTemplateConfig(t.template_type);
      return config.category === 'performance';
    });
    if (performance.length > 0) {
      performance.forEach(t => {
        grouped.push({
          label: `${t.name} (${t.recommended_duration_minutes} mins)`,
          value: t.id,
          category: 'performance'
        });
      });
    }

    // Onboarding templates
    const onboarding = templates.filter(t => {
      const config = getTemplateConfig(t.template_type);
      return config.category === 'onboarding';
    });
    if (onboarding.length > 0) {
      if (grouped.length > 0) grouped.push({ label: '---', value: 'separator-onboarding', category: 'separator' });
      onboarding.forEach(t => {
        grouped.push({
          label: `${t.name} (${t.recommended_duration_minutes} mins)`,
          value: t.id,
          category: 'onboarding'
        });
      });
    }

    // Disciplinary templates
    const disciplinary = templates.filter(t => isDisciplinaryTemplate(t.template_type));
    if (disciplinary.length > 0) {
      if (grouped.length > 0) grouped.push({ label: '---', value: 'separator-disciplinary', category: 'separator' });
      disciplinary.forEach(t => {
        grouped.push({
          label: `⚠️ ${t.name} (${t.recommended_duration_minutes} mins)`,
          value: t.id,
          category: 'disciplinary'
        });
      });
    }

    // Offboarding templates
    const offboarding = templates.filter(t => {
      const config = getTemplateConfig(t.template_type);
      return config.category === 'offboarding';
    });
    if (offboarding.length > 0) {
      if (grouped.length > 0) grouped.push({ label: '---', value: 'separator-offboarding', category: 'separator' });
      offboarding.forEach(t => {
        grouped.push({
          label: `${t.name} (${t.recommended_duration_minutes} mins)`,
          value: t.id,
          category: 'offboarding'
        });
      });
    }

    // Custom/other templates
    const other = templates.filter(t => {
      const config = getTemplateConfig(t.template_type);
      return !['performance', 'onboarding', 'disciplinary', 'offboarding'].includes(config.category);
    });
    if (other.length > 0) {
      if (grouped.length > 0) grouped.push({ label: '---', value: 'separator-other', category: 'separator' });
      other.forEach(t => {
        grouped.push({
          label: `${t.name} (${t.recommended_duration_minutes} mins)`,
          value: t.id,
          category: 'other'
        });
      });
    }

    return grouped.filter(opt => !opt.value.startsWith('separator-')).map(opt => ({
      label: opt.label,
      value: opt.value
    }));
  }, [templates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.template_id) {
      toast.error('Please select an employee and template');
      return;
    }

    startTransition(async () => {
      try {
        await createSchedule({
          employee_id: formData.employee_id,
          template_id: formData.template_id,
          title: formData.title || undefined,
          scheduled_date: formData.scheduled_date,
          due_date: formData.due_date || undefined,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.recurrence_pattern || undefined,
        });
        toast.success('Review scheduled successfully');
        router.push('/dashboard/people/reviews');
      } catch (error) {
        toast.error('Failed to schedule review');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/people/reviews">
          <Button variant="ghost" className="text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule Review</h1>
          <p className="text-neutral-400 mt-1">Set up a new review for an employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-white">
            <User className="h-4 w-4" />Employee <span className="text-[#EC4899]">*</span>
          </Label>
          <Select
            value={formData.employee_id || undefined}
            onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
            placeholder="Select an employee"
            options={employees.map((emp) => ({
              label: emp.full_name || 'Unnamed Employee',
              value: emp.id,
            }))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4" />Review Template <span className="text-[#EC4899]">*</span>
          </Label>
          <Select
            value={formData.template_id || undefined}
            onValueChange={(value) => {
              // Ignore separator items
              if (value.startsWith('separator-')) return;
              setFormData({ ...formData, template_id: value });
            }}
            placeholder="Select a template"
            options={groupedTemplateOptions}
            className="w-full"
          />
          {selectedTemplate && <p className="text-sm text-neutral-400">{selectedTemplate.description}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-white">Custom Title (optional)</Label>
          <Input
            placeholder={selectedTemplate?.name || 'e.g., Q4 Performance Review'}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-white">
            <Calendar className="h-4 w-4" />Scheduled Date <span className="text-[#EC4899]">*</span>
          </Label>
          <Input
            type="date"
            required
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-white">
            <Clock className="h-4 w-4" />Due Date (optional)
          </Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            min={formData.scheduled_date}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg">
          <div className="flex items-center gap-3">
            <Repeat className="h-5 w-5 text-neutral-400" />
            <div>
              <Label className="text-white">Make this a recurring review</Label>
              <p className="text-sm text-neutral-400">Automatically reschedule after completion</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="w-4 h-4 rounded border-white/[0.06] bg-white/[0.05] text-[#EC4899]"
          />
        </div>

        {formData.is_recurring && (
          <div className="space-y-2">
            <Label className="text-white">Recurrence Pattern</Label>
            <Select
              value={formData.recurrence_pattern || undefined}
              onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value as RecurrencePattern })}
              placeholder="Select frequency"
              options={[
                { label: 'Weekly', value: 'weekly' },
                { label: 'Fortnightly', value: 'fortnightly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
                { label: 'Annually', value: 'annually' },
              ]}
              className="w-full"
            />
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4">
          <Link href="/dashboard/people/reviews">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          >
            {isPending ? 'Scheduling...' : 'Schedule Review'}
          </Button>
        </div>
      </form>
    </div>
  );
}

