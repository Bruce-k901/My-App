'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useShiftRules, useUpdateShiftRules } from '@/hooks/use-shift-rules';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import TimePicker from '@/components/ui/TimePicker';
import { Clock, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ShiftRules, DEFAULT_SHIFT_RULES } from '@/types/teamly-settings';

export default function ShiftRulesPage() {
  const { companyId } = useAppContext();
  const { data: shiftRules, isLoading } = useShiftRules();
  const updateMutation = useUpdateShiftRules();
  
  const [formData, setFormData] = useState<Partial<ShiftRules>>(DEFAULT_SHIFT_RULES);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when shift rules load
  useEffect(() => {
    if (shiftRules) {
      setFormData(shiftRules);
      setHasChanges(false);
    }
  }, [shiftRules]);

  // Track changes
  const updateField = <K extends keyof ShiftRules>(field: K, value: ShiftRules[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('No company ID found');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ...formData,
        company_id: companyId,
      } as Partial<ShiftRules> & { company_id: string });
      
      toast.success('Shift rules saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving shift rules:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-white/60">Loading shift rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/people/settings"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#EC4899]" />
            Shift Rules
          </h1>
          <p className="text-neutral-400">
            Configure Working Time Directive compliance, breaks, and overtime settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          loading={updateMutation.isPending}
          variant="secondary"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Rest Periods Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Rest Periods</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Minimum Rest Between Shifts (hours)
            </label>
            <Input
              type="number"
              min="0"
              max="24"
              value={formData.min_rest_between_shifts ?? DEFAULT_SHIFT_RULES.min_rest_between_shifts}
              onChange={(e) => updateField('min_rest_between_shifts', parseInt(e.target.value) || 0)}
              placeholder="11"
            />
            <p className="text-xs text-white/50 mt-1">UK default: 11 hours</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Weekly Rest Type
            </label>
            <Select
              value={formData.weekly_rest_type ?? DEFAULT_SHIFT_RULES.weekly_rest_type}
              onValueChange={(val) => updateField('weekly_rest_type', val as '24_per_week' | '48_per_fortnight')}
              options={[
                { label: '24 hours per week', value: '24_per_week' },
                { label: '48 hours per fortnight', value: '48_per_fortnight' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Minimum Weekly Rest (hours)
            </label>
            <Input
              type="number"
              min="0"
              max="48"
              value={formData.min_weekly_rest_hours ?? DEFAULT_SHIFT_RULES.min_weekly_rest_hours}
              onChange={(e) => updateField('min_weekly_rest_hours', parseInt(e.target.value) || 0)}
              placeholder="24"
            />
          </div>
        </div>
      </div>

      {/* Working Hours Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Working Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Maximum Weekly Hours
            </label>
            <Input
              type="number"
              min="0"
              max="168"
              value={formData.max_weekly_hours ?? DEFAULT_SHIFT_RULES.max_weekly_hours}
              onChange={(e) => updateField('max_weekly_hours', parseInt(e.target.value) || 0)}
              placeholder="48"
            />
            <p className="text-xs text-white/50 mt-1">UK default: 48 hours</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Reference Period (weeks)
            </label>
            <Input
              type="number"
              min="1"
              max="52"
              value={formData.weekly_hours_reference_weeks ?? DEFAULT_SHIFT_RULES.weekly_hours_reference_weeks}
              onChange={(e) => updateField('weekly_hours_reference_weeks', parseInt(e.target.value) || 0)}
              placeholder="17"
            />
            <p className="text-xs text-white/50 mt-1">Averaging period for weekly hours</p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div>
                <p className="font-medium text-white">Allow WTD Opt-out</p>
                <p className="text-sm text-white/60 mt-1">
                  Allow employees to opt out of Working Time Directive limits
                </p>
              </div>
              <Switch
                checked={formData.allow_wtd_opt_out ?? DEFAULT_SHIFT_RULES.allow_wtd_opt_out}
                onChange={(checked) => updateField('allow_wtd_opt_out', checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Break Rules Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Break Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Break Required After (hours)
            </label>
            <Input
              type="number"
              min="0"
              max="12"
              step="0.5"
              value={((formData.break_threshold_minutes ?? DEFAULT_SHIFT_RULES.break_threshold_minutes) / 60).toString()}
              onChange={(e) => {
                const hours = parseFloat(e.target.value) || 0;
                updateField('break_threshold_minutes', Math.round(hours * 60));
              }}
              placeholder="6"
            />
            <p className="text-xs text-white/50 mt-1">Default: 6 hours (360 minutes)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Minimum Break Duration (minutes)
            </label>
            <Input
              type="number"
              min="0"
              max="120"
              value={formData.break_duration_minutes ?? DEFAULT_SHIFT_RULES.break_duration_minutes}
              onChange={(e) => updateField('break_duration_minutes', parseInt(e.target.value) || 0)}
              placeholder="20"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div>
                <p className="font-medium text-white">Paid Breaks</p>
                <p className="text-sm text-white/60 mt-1">
                  Breaks are paid and count towards working hours
                </p>
              </div>
              <Switch
                checked={formData.paid_breaks ?? DEFAULT_SHIFT_RULES.paid_breaks}
                onChange={(checked) => updateField('paid_breaks', checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Night Work Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Night Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Night Shift Start Time
            </label>
            <TimePicker
              value={formData.night_shift_start ?? DEFAULT_SHIFT_RULES.night_shift_start}
              onChange={(value) => updateField('night_shift_start', value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Night Shift End Time
            </label>
            <TimePicker
              value={formData.night_shift_end ?? DEFAULT_SHIFT_RULES.night_shift_end}
              onChange={(value) => updateField('night_shift_end', value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Max Night Shift Hours
            </label>
            <Input
              type="number"
              min="0"
              max="12"
              value={formData.max_night_shift_hours ?? DEFAULT_SHIFT_RULES.max_night_shift_hours}
              onChange={(e) => updateField('max_night_shift_hours', parseInt(e.target.value) || 0)}
              placeholder="8"
            />
          </div>
        </div>
      </div>

      {/* Overtime Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Overtime</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Daily Overtime After (hours)
            </label>
            <Input
              type="number"
              min="0"
              max="24"
              value={formData.overtime_threshold_daily?.toString() ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                updateField('overtime_threshold_daily', val === '' ? null : parseInt(val) || null);
              }}
              placeholder="Leave empty for no daily overtime"
            />
            <p className="text-xs text-white/50 mt-1">Leave empty to disable daily overtime</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Weekly Overtime After (hours)
            </label>
            <Input
              type="number"
              min="0"
              max="168"
              value={formData.overtime_threshold_weekly?.toString() ?? DEFAULT_SHIFT_RULES.overtime_threshold_weekly?.toString() ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                updateField('overtime_threshold_weekly', val === '' ? null : parseInt(val) || null);
              }}
              placeholder="40"
            />
            <p className="text-xs text-white/50 mt-1">Default: 40 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}

