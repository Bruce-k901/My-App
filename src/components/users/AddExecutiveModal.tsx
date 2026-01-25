'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { User, Briefcase, Mail, Phone, X, Shield, CreditCard, Calendar, Home } from 'lucide-react';

interface AddExecutiveModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onRefresh?: () => Promise<void> | void;
}

export default function AddExecutiveModal({ open, onClose, companyId, onRefresh }: AddExecutiveModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'compliance' | 'banking'>('personal');
  
  const [form, setForm] = useState({
    // Personal
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    
    // Employment
    app_role: 'Admin',
    position_title: '',
    department: '',
    start_date: '',
    contract_type: 'permanent',
    salary: '',
    pay_frequency: 'monthly',
    
    // Compliance
    national_insurance_number: '',
    right_to_work_status: 'pending',
    right_to_work_document_type: '',
    right_to_work_expiry: '',
    
    // Banking
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_sort_code: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const executiveRoleOptions = [
    'Admin',
    'Owner',
    'CEO',
    'Managing Director',
    'COO',
    'CFO',
    'HR Manager',
    'Operations Manager',
    'Finance Manager',
    'Regional Manager',
    'Area Manager',
  ];

  const positionOptions = [
    { label: 'Chief Executive Officer', value: 'Chief Executive Officer' },
    { label: 'Managing Director', value: 'Managing Director' },
    { label: 'Chief Operating Officer', value: 'Chief Operating Officer' },
    { label: 'Chief Financial Officer', value: 'Chief Financial Officer' },
    { label: 'Director of Operations', value: 'Director of Operations' },
    { label: 'Director of Finance', value: 'Director of Finance' },
    { label: 'Head of HR', value: 'Head of HR' },
    { label: 'Head of Operations', value: 'Head of Operations' },
    { label: 'Head of Finance', value: 'Head of Finance' },
    { label: 'Regional Director', value: 'Regional Director' },
    { label: 'Area Director', value: 'Area Director' },
    { label: 'Operations Director', value: 'Operations Director' },
    { label: 'Finance Director', value: 'Finance Director' },
    { label: 'HR Director', value: 'HR Director' },
    { label: 'Executive Assistant', value: 'Executive Assistant' },
    { label: 'Office Manager', value: 'Office Manager' },
    { label: 'Administrator', value: 'Administrator' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        city: form.city.trim() || null,
        postcode: form.postcode.trim() || null,
        country: form.country,
        
        company_id: companyId,
        site_id: null, // Head office/executive - no site assignment
        app_role: form.app_role,
        position_title: form.position_title || null,
        department: form.department.trim() || null,
        start_date: form.start_date || null,
        contract_type: form.contract_type,
        salary: form.salary ? parseFloat(form.salary) : null,
        pay_frequency: form.pay_frequency,
        
        national_insurance_number: form.national_insurance_number.trim() || null,
        right_to_work_status: form.right_to_work_status,
        right_to_work_document_type: form.right_to_work_document_type || null,
        right_to_work_expiry: form.right_to_work_expiry || null,
        
        bank_name: form.bank_name.trim() || null,
        bank_account_name: form.bank_account_name.trim() || null,
        bank_account_number: form.bank_account_number.trim() || null,
        bank_sort_code: form.bank_sort_code.trim() || null,
        
        status: 'onboarding',
      };

      console.log('Creating executive/head office employee:', payload);

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      let json: any = null;

      if (contentType.includes('application/json')) {
        json = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => '');
        if (!res.ok) json = { error: text || 'Request failed' };
      }

      if (!res.ok || json?.error) {
        const code = json?.code;
        const msg = json?.error || 'Failed to create employee.';
        setError(msg);

        if (code === 'profile_exists') {
          toast.error('An employee with this email already exists in your company.');
        } else if (code === 'auth_exists_no_id') {
          toast.error('Auth user exists but ID could not be resolved.');
        } else {
          toast.error(msg);
        }
        setSaving(false);
        return;
      }

      toast.success(`${form.full_name} added successfully!`);
      
      // Reset form
      setForm({
        full_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        app_role: 'Admin',
        position_title: '',
        department: '',
        start_date: '',
        contract_type: 'permanent',
        salary: '',
        pay_frequency: 'monthly',
        national_insurance_number: '',
        right_to_work_status: 'pending',
        right_to_work_document_type: '',
        right_to_work_expiry: '',
        bank_name: '',
        bank_account_name: '',
        bank_account_number: '',
        bank_sort_code: '',
      });

      // Refresh parent list
      if (onRefresh) {
        await onRefresh();
      }

      setSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error creating executive:', err);
      setError(err?.message || 'Failed to create employee.');
      toast.error('Failed to create employee. Please try again.');
      setSaving(false);
    }
  }

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  if (!open) return null;

  const tabs = [
    { id: 'personal' as const, label: 'Personal', icon: User },
    { id: 'employment' as const, label: 'Employment', icon: Briefcase },
    { id: 'compliance' as const, label: 'Compliance', icon: Shield },
    { id: 'banking' as const, label: 'Banking', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl rounded-xl bg-theme-surface border border-theme p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">Add Head Office / Executive</h2>
              <p className="text-sm text-theme-secondary">Complete employee onboarding details</p>
            </div>
          </div>
          <button 
            className="text-theme-secondary hover:text-theme-primary transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 mb-6 border-b border-theme">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all relative ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 dark:border-blue-500 shadow-sm'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-blue-50/50 dark:hover:bg-blue-500/10 hover:border-b-2 hover:border-blue-300 dark:hover:border-blue-500/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 dark:bg-red-500/10 border border-red-500/50 dark:border-red-500/50 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Full Name */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Full Name *
                  </label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => updateForm({ full_name: e.target.value })}
                    placeholder="e.g., Jennifer Anderson"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder="e.g., jennifer@company.com"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={form.phone_number}
                    onChange={(e) => updateForm({ phone_number: e.target.value })}
                    placeholder="e.g., +44 20 1234 5678"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => updateForm({ date_of_birth: e.target.value })}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-theme pt-6 mt-6">
                <h3 className="text-sm font-semibold text-theme-primary mb-5 flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Address Line 1
                    </label>
                    <Input
                      value={form.address_line_1}
                      onChange={(e) => updateForm({ address_line_1: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Address Line 2
                    </label>
                    <Input
                      value={form.address_line_2}
                      onChange={(e) => updateForm({ address_line_2: e.target.value })}
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      City
                    </label>
                    <Input
                      value={form.city}
                      onChange={(e) => updateForm({ city: e.target.value })}
                      placeholder="e.g., London"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Postcode
                    </label>
                    <Input
                      value={form.postcode}
                      onChange={(e) => updateForm({ postcode: e.target.value })}
                      placeholder="e.g., SW1A 1AA"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Country
                    </label>
                    <Input
                      value={form.country}
                      onChange={(e) => updateForm({ country: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Role *
                  </label>
                  <Select
                    value={form.app_role}
                    options={executiveRoleOptions}
                    onValueChange={(val) => updateForm({ app_role: val })}
                    placeholder="Select role..."
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    Determines org chart placement
                  </p>
                </div>

                {/* Position Title */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Position Title
                  </label>
                  <Select
                    value={form.position_title}
                    options={positionOptions}
                    onValueChange={(val) => updateForm({ position_title: val })}
                    placeholder="Select position..."
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Department
                  </label>
                  <Input
                    value={form.department}
                    onChange={(e) => updateForm({ department: e.target.value })}
                    placeholder="e.g., Finance, HR, Operations"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => updateForm({ start_date: e.target.value })}
                  />
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Contract Type
                  </label>
                  <select
                    value={form.contract_type}
                    onChange={(e) => updateForm({ contract_type: e.target.value })}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="fixed_term">Fixed Term</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Annual Salary (£)
                  </label>
                  <Input
                    type="number"
                    value={form.salary}
                    onChange={(e) => updateForm({ salary: e.target.value })}
                    placeholder="e.g., 50000"
                    step="1000"
                  />
                </div>

                {/* Pay Frequency */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Pay Frequency
                  </label>
                  <select
                    value={form.pay_frequency}
                    onChange={(e) => updateForm({ pay_frequency: e.target.value })}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/50 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong className="font-semibold">Note:</strong> This employee will not be assigned to any site. 
                  They will appear in the organizational chart under their role category.
                </p>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* National Insurance Number */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    National Insurance Number
                  </label>
                  <Input
                    value={form.national_insurance_number}
                    onChange={(e) => updateForm({ national_insurance_number: e.target.value.toUpperCase() })}
                    placeholder="e.g., AB123456C"
                    className="uppercase"
                  />
                </div>

                {/* Right to Work Status */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Right to Work Status
                  </label>
                  <select
                    value={form.right_to_work_status}
                    onChange={(e) => updateForm({ right_to_work_status: e.target.value })}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="expired">Expired</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </div>

                {/* RTW Document Type */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    RTW Document Type
                  </label>
                  <select
                    value={form.right_to_work_document_type}
                    onChange={(e) => updateForm({ right_to_work_document_type: e.target.value })}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="passport">UK/EU Passport</option>
                    <option value="biometric_residence_permit">Biometric Residence Permit</option>
                    <option value="share_code">Share Code</option>
                    <option value="visa">Visa</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* RTW Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    RTW Expiry Date
                  </label>
                  <Input
                    type="date"
                    value={form.right_to_work_expiry}
                    onChange={(e) => updateForm({ right_to_work_expiry: e.target.value })}
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    Leave blank if no expiry (e.g., British citizen)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/50 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong className="font-semibold">Important:</strong> Ensure right to work documentation is verified before the employee starts work. This is a legal requirement in the UK.
                </p>
              </div>
            </div>
          )}

          {/* Banking Tab */}
          {activeTab === 'banking' && (
            <div className="space-y-8">
              <p className="text-sm text-theme-secondary">
                Bank details are used for payroll export only and are stored securely.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Bank Name
                  </label>
                  <Input
                    value={form.bank_name}
                    onChange={(e) => updateForm({ bank_name: e.target.value })}
                    placeholder="e.g., Barclays"
                  />
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Account Holder Name
                  </label>
                  <Input
                    value={form.bank_account_name}
                    onChange={(e) => updateForm({ bank_account_name: e.target.value })}
                    placeholder="Name on account"
                  />
                </div>

                {/* Sort Code */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Sort Code
                  </label>
                  <Input
                    value={form.bank_sort_code}
                    onChange={(e) => updateForm({ bank_sort_code: e.target.value })}
                    placeholder="XX-XX-XX"
                    maxLength={8}
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Account Number
                  </label>
                  <Input
                    value={form.bank_account_number}
                    onChange={(e) => updateForm({ bank_account_number: e.target.value })}
                    placeholder="8 digits"
                    maxLength={8}
                  />
                </div>
              </div>

              <div className="p-4 bg-green-500/10 dark:bg-green-500/10 border border-green-300 dark:border-green-500/50 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong className="font-semibold">Secure:</strong> Bank details are encrypted and only accessible to authorized payroll administrators.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-theme">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white border-0 shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_16px_rgba(59,130,246,0.6)] dark:hover:shadow-[0_0_16px_rgba(59,130,246,0.7)] transition-all duration-200"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Add Employee
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border-theme hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/10"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

