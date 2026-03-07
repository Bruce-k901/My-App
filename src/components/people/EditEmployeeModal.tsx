'use client';

import React, { useState } from 'react';
import type { EmployeeProfile, SiteOption, ManagerOption } from '@/types/employee';
import type { EmergencyContact } from '@/types/teamly';
import {
  X,
  User,
  Briefcase,
  Shield,
  CreditCard,
  Calendar,
  Save,
  Loader2,
  Trash2,
  Plus,
  GraduationCap,
  MapPin,
} from '@/components/ui/icons';
import { EmployeeTrainingEditor } from '@/components/people/EmployeeTrainingEditor';

export interface EditEmployeeModalProps {
  employee: EmployeeProfile;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  sites: SiteOption[];
  managers: ManagerOption[];
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  onOpenSiteAssignments?: (employee: EmployeeProfile) => void;
}

type TabId = 'personal' | 'employment' | 'compliance' | 'banking' | 'leave' | 'pay' | 'training';

const INPUT_CLS =
  'w-full px-3 py-2 bg-theme-surface-elevated border border-module-fg/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors';
const LABEL_CLS = 'block text-sm font-medium text-theme-secondary mb-1.5';
const CHECK_CLS = 'w-4 h-4 text-module-fg bg-theme-surface-elevated border-theme rounded focus:ring-module-fg';

export function EditEmployeeModal({
  employee,
  formData,
  setFormData,
  emergencyContacts,
  setEmergencyContacts,
  sites,
  managers,
  onClose,
  onSave,
  saving,
  onOpenSiteAssignments,
}: EditEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('personal');

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updateField(name, checked);
    } else {
      updateField(name, value);
    }
  };

  const handleEmergencyContactChange = (
    index: number,
    field: keyof EmergencyContact,
    value: string,
  ) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', relationship: '', phone: '', email: '' },
    ]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'pay', label: 'Pay & Tax', icon: CreditCard },
    { id: 'training', label: 'Training', icon: GraduationCap },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface rounded-xl border border-theme w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary">Edit Employee</h2>
            <p className="text-theme-secondary mt-1">{employee.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-hover rounded-lg text-theme-secondary hover:text-theme-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-theme overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-theme-surface-elevated text-theme-primary border-b-2 border-module-fg'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-module-fg" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name || ''}
                    onChange={handleChange}
                    required
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    required
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="border-t border-theme pt-6 mt-6">
                <h3 className="text-md font-medium text-theme-primary mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-3">
                    <label className={LABEL_CLS}>Address Line 1</label>
                    <input
                      type="text"
                      name="address_line_1"
                      value={formData.address_line_1 || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className={LABEL_CLS}>Address Line 2</label>
                    <input
                      type="text"
                      name="address_line_2"
                      value={formData.address_line_2 || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>County</label>
                    <input
                      type="text"
                      name="county"
                      value={formData.county || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Postcode</label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country || 'United Kingdom'}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="border-t border-theme pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-theme-primary">Emergency Contacts</h3>
                  <button
                    type="button"
                    onClick={addEmergencyContact}
                    className="flex items-center gap-1 text-sm text-module-fg hover:text-module-fg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>

                {emergencyContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 p-5 bg-theme-button rounded-lg"
                  >
                    <div>
                      <label className={LABEL_CLS}>Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) =>
                          handleEmergencyContactChange(index, 'name', e.target.value)
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Relationship</label>
                      <input
                        type="text"
                        value={contact.relationship}
                        onChange={(e) =>
                          handleEmergencyContactChange(index, 'relationship', e.target.value)
                        }
                        placeholder="e.g., Spouse, Parent"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          handleEmergencyContactChange(index, 'phone', e.target.value)
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className={LABEL_CLS}>Email</label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) =>
                            handleEmergencyContactChange(index, 'email', e.target.value)
                          }
                          className={INPUT_CLS}
                        />
                      </div>
                      {emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Briefcase className="w-5 h-5 text-module-fg" />
                Employment Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <select
                    name="status"
                    value={formData.status || 'active'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="active">Active</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="offboarding">Offboarding</option>
                    <option value="inactive">Inactive (Archived)</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Employee Number</label>
                  <input
                    type="text"
                    name="employee_number"
                    value={formData.employee_number || ''}
                    onChange={handleChange}
                    placeholder="e.g., EMP001"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Position / Job Title</label>
                  <input
                    type="text"
                    name="position_title"
                    value={formData.position_title || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>App Role</label>
                  <select
                    name="app_role"
                    value={formData.app_role || 'Staff'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Home Site</label>
                  <select
                    name="home_site"
                    value={formData.home_site || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="">Head Office (No Site)</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Reports To</label>
                  <select
                    name="reports_to"
                    value={formData.reports_to || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="">Select manager...</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {onOpenSiteAssignments && (
                  <div className="md:col-span-3 pt-4 border-t border-theme">
                    <button
                      onClick={() => onOpenSiteAssignments(employee)}
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all"
                    >
                      <MapPin className="w-4 h-4" />
                      Manage Site Assignments
                    </button>
                    <p className="text-xs text-theme-tertiary mt-2">
                      Allow this employee to work at other sites during specified date ranges
                    </p>
                  </div>
                )}

                <div>
                  <label className={LABEL_CLS}>BOH / FOH</label>
                  <select
                    name="boh_foh"
                    value={formData.boh_foh || 'FOH'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="FOH">Front of House</option>
                    <option value="BOH">Back of House</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Probation End Date</label>
                  <input
                    type="date"
                    name="probation_end_date"
                    value={formData.probation_end_date || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Contract Type</label>
                  <select
                    name="contract_type"
                    value={formData.contract_type || 'permanent'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="permanent">Permanent</option>
                    <option value="fixed_term">Fixed Term</option>
                    <option value="zero_hours">Zero Hours</option>
                    <option value="casual">Casual</option>
                    <option value="agency">Agency</option>
                    <option value="contractor">Contractor</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Contracted Hours (per week)</label>
                  <input
                    type="number"
                    name="contracted_hours"
                    value={formData.contracted_hours || ''}
                    onChange={handleChange}
                    step="0.5"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Hourly Rate (&pound;)</label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate || ''}
                    onChange={handleChange}
                    step="0.01"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Annual Salary (&pound;)</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary || ''}
                    onChange={handleChange}
                    step="100"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Pay Frequency</label>
                  <select
                    name="pay_frequency"
                    value={formData.pay_frequency || 'monthly'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="four_weekly">Four Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Notice Period (weeks)</label>
                  <input
                    type="number"
                    name="notice_period_weeks"
                    value={formData.notice_period_weeks || '1'}
                    onChange={handleChange}
                    min="1"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Shield className="w-5 h-5 text-module-fg" />
                Compliance & Right to Work
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>National Insurance Number</label>
                  <input
                    type="text"
                    name="national_insurance_number"
                    value={formData.national_insurance_number || ''}
                    onChange={handleChange}
                    placeholder="e.g., AB123456C"
                    className={`${INPUT_CLS} uppercase`}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Right to Work Status</label>
                  <select
                    name="right_to_work_status"
                    value={formData.right_to_work_status || 'pending'}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="expired">Expired</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>RTW Document Type</label>
                  <select
                    name="right_to_work_document_type"
                    value={formData.right_to_work_document_type || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  >
                    <option value="">Select...</option>
                    <option value="passport">UK/EU Passport</option>
                    <option value="biometric_residence_permit">Biometric Residence Permit</option>
                    <option value="share_code">Share Code</option>
                    <option value="visa">Visa</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>RTW Document Number</label>
                  <input
                    type="text"
                    name="right_to_work_document_number"
                    value={formData.right_to_work_document_number || ''}
                    onChange={handleChange}
                    placeholder="e.g., passport number, share code"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>RTW Expiry Date</label>
                  <input
                    type="date"
                    name="right_to_work_expiry"
                    value={formData.right_to_work_expiry || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                  <p className="text-xs text-theme-secondary mt-1">
                    Leave blank if no expiry (e.g., British citizen)
                  </p>
                </div>
              </div>

              {/* DBS Section */}
              <div className="border-t border-theme pt-6 mt-6">
                <h3 className="text-md font-medium text-theme-primary mb-5">DBS Check</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className={LABEL_CLS}>DBS Status</label>
                    <select
                      name="dbs_status"
                      value={formData.dbs_status || 'not_required'}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    >
                      <option value="not_required">Not Required</option>
                      <option value="pending">Pending</option>
                      <option value="clear">Clear</option>
                      <option value="issues_found">Issues Found</option>
                    </select>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>DBS Certificate Number</label>
                    <input
                      type="text"
                      name="dbs_certificate_number"
                      value={formData.dbs_certificate_number || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>DBS Check Date</label>
                    <input
                      type="date"
                      name="dbs_check_date"
                      value={formData.dbs_check_date || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <CreditCard className="w-5 h-5 text-module-fg" />
                Bank Details
              </h2>
              <p className="text-sm text-theme-secondary">
                Bank details are used for payroll export only and are stored securely.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Account Holder Name</label>
                  <input
                    type="text"
                    name="bank_account_name"
                    value={formData.bank_account_name || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Sort Code</label>
                  <input
                    type="text"
                    name="bank_sort_code"
                    value={formData.bank_sort_code || ''}
                    onChange={handleChange}
                    placeholder="XX-XX-XX"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number || ''}
                    onChange={handleChange}
                    placeholder="8 digits"
                    maxLength={8}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Calendar className="w-5 h-5 text-module-fg" />
                Leave Allowance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>Annual Leave Allowance (days)</label>
                  <input
                    type="number"
                    name="annual_leave_allowance"
                    value={formData.annual_leave_allowance || '28'}
                    onChange={handleChange}
                    step="0.5"
                    className={INPUT_CLS}
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    UK statutory minimum is 28 days (including bank holidays)
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pay' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <CreditCard className="w-5 h-5 text-module-fg" />
                Pay & Tax Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL_CLS}>Tax Code</label>
                  <input
                    type="text"
                    name="tax_code"
                    value={formData.tax_code || ''}
                    onChange={handleChange}
                    placeholder="e.g., 1257L"
                    className={`${INPUT_CLS} uppercase`}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Student Loan</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="student_loan"
                      checked={formData.student_loan || false}
                      onChange={(e) => updateField('student_loan', e.target.checked)}
                      className={CHECK_CLS}
                    />
                    <span className="text-sm text-theme-secondary">Has student loan</span>
                  </div>
                </div>

                {formData.student_loan && (
                  <div>
                    <label className={LABEL_CLS}>Student Loan Plan</label>
                    <select
                      name="student_loan_plan"
                      value={formData.student_loan_plan || ''}
                      onChange={handleChange}
                      className={INPUT_CLS}
                    >
                      <option value="">Select plan...</option>
                      <option value="plan_1">Plan 1</option>
                      <option value="plan_2">Plan 2</option>
                      <option value="plan_4">Plan 4</option>
                      <option value="plan_5">Plan 5</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className={LABEL_CLS}>Pension Enrolled</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="pension_enrolled"
                      checked={formData.pension_enrolled || false}
                      onChange={(e) => updateField('pension_enrolled', e.target.checked)}
                      className={CHECK_CLS}
                    />
                    <span className="text-sm text-theme-tertiary">Enrolled in pension</span>
                  </div>
                </div>

                {formData.pension_enrolled && (
                  <div>
                    <label className={LABEL_CLS}>Pension Contribution (%)</label>
                    <input
                      type="number"
                      name="pension_contribution_percent"
                      value={formData.pension_contribution_percent || ''}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className={INPUT_CLS}
                    />
                  </div>
                )}

                <div>
                  <label className={LABEL_CLS}>P45 Received</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="p45_received"
                      checked={formData.p45_received || false}
                      onChange={(e) => updateField('p45_received', e.target.checked)}
                      className={CHECK_CLS}
                    />
                    <span className="text-sm text-theme-tertiary">P45 received</span>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>P45 Date</label>
                  <input
                    type="date"
                    name="p45_date"
                    value={formData.p45_date || ''}
                    onChange={handleChange}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>P45 Reference</label>
                  <input
                    type="text"
                    name="p45_reference"
                    value={formData.p45_reference || ''}
                    onChange={handleChange}
                    placeholder="P45 reference number"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <EmployeeTrainingEditor
              data={formData}
              onChange={handleChange}
              updateField={updateField}
              mode="form"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-theme-surface-elevated hover:bg-theme-hover text-theme-primary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg font-medium transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
