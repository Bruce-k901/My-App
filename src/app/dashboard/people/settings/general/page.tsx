'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useGeneralSettings, useUpdateGeneralSettings } from '@/hooks/use-general-settings';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import TimePicker from '@/components/ui/TimePicker';
import { Settings, Save, ArrowLeft, Building2, Clock, DollarSign, Calendar, Download, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS, BusinessHours, DayHours } from '@/types/general-settings';
import { useCompanyClosures, useCreateCompanyClosure, useDeleteCompanyClosure } from '@/hooks/use-company-closures';
import { CompanyClosureForm } from '@/types/company-closures';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function GeneralSettingsPage() {
  const { companyId } = useAppContext();
  const { data: settings, isLoading } = useGeneralSettings();
  const updateMutation = useUpdateGeneralSettings();
  
  const [formData, setFormData] = useState<Partial<GeneralSettings>>(DEFAULT_GENERAL_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  
  // Company closures
  const { data: closures, isLoading: loadingClosures } = useCompanyClosures();
  const createClosure = useCreateCompanyClosure();
  const deleteClosure = useDeleteCompanyClosure();
  const [newClosure, setNewClosure] = useState<CompanyClosureForm>({ start: '', end: '', notes: '' });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  const updateField = <K extends keyof GeneralSettings>(field: K, value: GeneralSettings[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateBusinessHours = (day: keyof BusinessHours, hours: Partial<DayHours>) => {
    const currentHours = formData.default_business_hours || DEFAULT_GENERAL_SETTINGS.default_business_hours!;
    setFormData(prev => ({
      ...prev,
      default_business_hours: {
        ...currentHours,
        [day]: {
          ...currentHours[day],
          ...hours,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleImportFromBusinessDetails = async () => {
    if (!companyId) {
      toast.error('No company ID found');
      return;
    }

    setLoadingCompany(true);
    try {
      // Fetch company data from API route (bypasses RLS)
      const response = await fetch(`/api/company/get?id=${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }
      
      const company = await response.json();
      
      // Map company fields to general settings
      const importedData: Partial<GeneralSettings> = {
        company_name: company.name || formData.company_name,
        company_logo_url: company.logo_url || formData.company_logo_url,
        company_address: company.address_line1 || formData.company_address,
        company_city: company.city || formData.company_city,
        company_postcode: company.postcode || formData.company_postcode,
        company_country: company.country || formData.company_country || 'United Kingdom',
        company_phone: company.phone || formData.company_phone,
        company_email: company.contact_email || company.email || formData.company_email,
        company_website: company.website || formData.company_website,
      };
      
      // Only update fields that have values from company data
      setFormData(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(importedData).filter(([_, value]) => value !== undefined && value !== null && value !== '')
        ),
      }));
      
      setHasChanges(true);
      toast.success('Company information imported from Business Details');
    } catch (error: any) {
      console.error('Error importing company data:', error);
      toast.error(`Failed to import: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingCompany(false);
    }
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
      } as Partial<GeneralSettings> & { company_id: string });
      
      toast.success('General settings saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving general settings:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-900 dark:text-white/60">Loading general settings...</p>
        </div>
      </div>
    );
  }

  const businessHours = formData.default_business_hours || DEFAULT_GENERAL_SETTINGS.default_business_hours!;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/people/settings"
            className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-white/60 hover:text-gray-900 dark:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#EC4899]" />
            General Settings
          </h1>
          <p className="text-gray-500 dark:text-white/60">
            Configure company information, working hours, and general preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleImportFromBusinessDetails}
            disabled={loadingCompany || !companyId}
            loading={loadingCompany}
            variant="outline"
            className="border-blue-600 dark:border-blue-400 text-[#EC4899] hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Import from Business Details
          </Button>
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
      </div>

      {/* Company Info Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#EC4899]" />
          Company Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Company Name</label>
            <Input
              value={formData.company_name || ''}
              onChange={(e) => updateField('company_name', e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Logo URL</label>
            <Input
              value={formData.company_logo_url || ''}
              onChange={(e) => updateField('company_logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Address</label>
            <Input
              value={formData.company_address || ''}
              onChange={(e) => updateField('company_address', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">City</label>
            <Input
              value={formData.company_city || ''}
              onChange={(e) => updateField('company_city', e.target.value)}
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Postcode</label>
            <Input
              value={formData.company_postcode || ''}
              onChange={(e) => updateField('company_postcode', e.target.value)}
              placeholder="Postcode"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Country</label>
            <Input
              value={formData.company_country || ''}
              onChange={(e) => updateField('company_country', e.target.value)}
              placeholder="Country"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Phone</label>
            <Input
              value={formData.company_phone || ''}
              onChange={(e) => updateField('company_phone', e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Email</label>
            <Input
              type="email"
              value={formData.company_email || ''}
              onChange={(e) => updateField('company_email', e.target.value)}
              placeholder="company@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Website</label>
            <Input
              value={formData.company_website || ''}
              onChange={(e) => updateField('company_website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Time & Locale Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#EC4899]" />
          Time & Locale
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Timezone</label>
            <Input
              value={formData.timezone || ''}
              onChange={(e) => updateField('timezone', e.target.value)}
              placeholder="Europe/London"
            />
            <p className="text-xs text-neutral-500 mt-1">e.g., Europe/London, America/New_York</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Date Format</label>
            <Select
              value={formData.date_format || 'DD/MM/YYYY'}
              onValueChange={(val) => updateField('date_format', val as any)}
              options={[
                { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Time Format</label>
            <Select
              value={formData.time_format || '24h'}
              onValueChange={(val) => updateField('time_format', val as any)}
              options={[
                { label: '24 Hour', value: '24h' },
                { label: '12 Hour', value: '12h' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Week Start Day</label>
            <Select
              value={formData.week_start_day || 'Monday'}
              onValueChange={(val) => updateField('week_start_day', val as any)}
              options={[
                { label: 'Monday', value: 'Monday' },
                { label: 'Sunday', value: 'Sunday' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Working Hours Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#EC4899]" />
          Working Hours
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Standard Shift Length (hours)</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={formData.standard_shift_length_hours || 8}
              onChange={(e) => updateField('standard_shift_length_hours', parseFloat(e.target.value) || 8)}
              className="w-32"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-4">Default Business Hours</label>
            <div className="space-y-3">
              {days.map((day) => {
                const dayHours = businessHours[day];
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                return (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg flex-wrap">
                    <div className="w-24 text-sm text-gray-900 dark:text-white font-medium flex-shrink-0">{dayName}</div>
                    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/60 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={!dayHours.closed}
                        onChange={(e) => updateBusinessHours(day, { closed: !e.target.checked })}
                        className="rounded"
                      />
                      Open
                    </label>
                    {!dayHours.closed && (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 min-w-0">
                          <TimePicker
                            value={dayHours.open || '09:00'}
                            onChange={(value) => updateBusinessHours(day, { open: value })}
                            className="w-full min-w-[140px]"
                          />
                        </div>
                        <span className="text-neutral-500 dark:text-white/60 flex-shrink-0 px-1">to</span>
                        <div className="flex-shrink-0 min-w-0">
                          <TimePicker
                            value={dayHours.close || '17:00'}
                            onChange={(value) => updateBusinessHours(day, { close: value })}
                            className="w-full min-w-[140px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pay Periods Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#EC4899]" />
          Pay Periods
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Pay Period Type</label>
            <Select
              value={formData.pay_period_type || 'monthly'}
              onValueChange={(val) => updateField('pay_period_type', val as any)}
              options={[
                { label: 'Weekly', value: 'weekly' },
                { label: 'Fortnightly', value: 'fortnightly' },
                { label: 'Monthly', value: 'monthly' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Pay Day</label>
            <Select
              value={formData.pay_day || 'last_friday'}
              onValueChange={(val) => updateField('pay_day', val as any)}
              options={[
                { label: 'Last Friday', value: 'last_friday' },
                { label: 'Last Monday', value: 'last_monday' },
                { label: 'Last Wednesday', value: 'last_wednesday' },
                { label: 'Last Day of Month', value: 'last_day' },
                { label: 'Specific Day', value: 'specific_day' },
              ]}
            />
          </div>
          {formData.pay_day === 'specific_day' && (
            <div>
              <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Day of Month (1-31)</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.pay_day_specific || ''}
                onChange={(e) => updateField('pay_day_specific', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 25"
              />
            </div>
          )}
        </div>
      </div>

      {/* Currency Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#EC4899]" />
          Currency
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Currency Code</label>
            <Select
              value={formData.currency_code || 'GBP'}
              onValueChange={(val) => {
                const symbols: Record<string, string> = {
                  GBP: '£',
                  USD: '$',
                  EUR: '€',
                  CAD: 'C$',
                  AUD: 'A$',
                };
                updateField('currency_code', val as any);
                updateField('currency_symbol', symbols[val] || '£');
              }}
              options={[
                { label: 'GBP (£)', value: 'GBP' },
                { label: 'USD ($)', value: 'USD' },
                { label: 'EUR (€)', value: 'EUR' },
                { label: 'CAD (C$)', value: 'CAD' },
                { label: 'AUD (A$)', value: 'AUD' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Currency Symbol</label>
            <Input
              value={formData.currency_symbol || '£'}
              onChange={(e) => updateField('currency_symbol', e.target.value)}
              placeholder="£"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Currency Format</label>
            <Select
              value={formData.currency_format || 'symbol_before'}
              onValueChange={(val) => updateField('currency_format', val as any)}
              options={[
                { label: 'Symbol Before (£100)', value: 'symbol_before' },
                { label: 'Symbol After (100£)', value: 'symbol_after' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Fiscal Year Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#EC4899]" />
          Fiscal Year
        </h2>
        <div>
          <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Fiscal Year Start Month</label>
          <Select
            value={String(formData.fiscal_year_start_month || 4)}
            onValueChange={(val) => updateField('fiscal_year_start_month', parseInt(val))}
            options={[
              { label: 'January', value: '1' },
              { label: 'February', value: '2' },
              { label: 'March', value: '3' },
              { label: 'April', value: '4' },
              { label: 'May', value: '5' },
              { label: 'June', value: '6' },
              { label: 'July', value: '7' },
              { label: 'August', value: '8' },
              { label: 'September', value: '9' },
              { label: 'October', value: '10' },
              { label: 'November', value: '11' },
              { label: 'December', value: '12' },
            ]}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Used for reporting and financial periods (UK default: April)
          </p>
        </div>
      </div>

      {/* Company-Wide Planned Closures Section */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#EC4899]" />
          Company-Wide Planned Closures
        </h2>
        <p className="text-sm text-gray-500 dark:text-white/60 mb-4">
          Add company-wide closure dates that apply to all sites. These will be displayed alongside site-specific closures.
        </p>
        
        {/* Add New Closure */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.04] rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Start Date</label>
              <DatePicker
                selected={newClosure.start ? new Date(newClosure.start) : null}
                onChange={(date: Date | null) => setNewClosure(prev => ({
                  ...prev,
                  start: date ? date.toISOString().split('T')[0] : ''
                }))}
                placeholderText="Select start date"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] rounded text-sm text-gray-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">End Date</label>
              <DatePicker
                selected={newClosure.end ? new Date(newClosure.end) : null}
                onChange={(date: Date | null) => setNewClosure(prev => ({
                  ...prev,
                  end: date ? date.toISOString().split('T')[0] : ''
                }))}
                minDate={newClosure.start ? new Date(newClosure.start) : undefined}
                placeholderText="Select end date"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] rounded text-sm text-gray-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-white/60 mb-2">Notes (optional)</label>
              <Input
                value={newClosure.notes}
                onChange={(e) => setNewClosure(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g., Bank Holiday, Annual Shutdown"
                className="text-sm"
              />
            </div>
          </div>
          <Button
            onClick={async () => {
              if (!newClosure.start || !newClosure.end) {
                toast.error('Please select both start and end dates');
                return;
              }
              if (!companyId) {
                toast.error('No company ID found');
                return;
              }
              
              try {
                await createClosure.mutateAsync({
                  company_id: companyId,
                  closure_start: newClosure.start,
                  closure_end: newClosure.end,
                  notes: newClosure.notes || null,
                  is_active: true,
                });
                setNewClosure({ start: '', end: '', notes: '' });
                toast.success('Closure added successfully');
              } catch (error: any) {
                console.error('Error adding closure:', error);
                toast.error(`Failed to add closure: ${error.message || 'Unknown error'}`);
              }
            }}
            disabled={!newClosure.start || !newClosure.end || createClosure.isPending}
            loading={createClosure.isPending}
            variant="outline"
            className="border-blue-600 dark:border-blue-400 text-[#EC4899] hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Closure
          </Button>
        </div>

        {/* Existing Closures */}
        {loadingClosures ? (
          <div className="text-center py-4">
            <p className="text-gray-900 dark:text-white/60">Loading closures...</p>
          </div>
        ) : closures && closures.length > 0 ? (
          <div className="space-y-2">
            {closures.map((closure) => (
              <div
                key={closure.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.04] rounded-lg"
              >
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white font-medium">
                    {new Date(closure.closure_start).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })} → {new Date(closure.closure_end).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  {closure.notes && (
                    <div className="text-sm text-gray-500 dark:text-white/60 mt-1">{closure.notes}</div>
                  )}
                </div>
                <Button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this closure?')) return;
                    try {
                      await deleteClosure.mutateAsync(closure.id);
                      toast.success('Closure deleted successfully');
                    } catch (error: any) {
                      console.error('Error deleting closure:', error);
                      toast.error(`Failed to delete closure: ${error.message || 'Unknown error'}`);
                    }
                  }}
                  disabled={deleteClosure.isPending}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No company-wide closures scheduled
          </div>
        )}
      </div>
    </div>
  );
}

