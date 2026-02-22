'use client';

import { useState, useEffect } from 'react';
import { Department, DepartmentForm, DEFAULT_DEPARTMENT_FORM } from '@/types/departments';
import { useStandardDepartments } from '@/hooks/use-standard-departments';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { X } from '@/components/ui/icons';
import { toast } from 'sonner';

interface DepartmentFormProps {
  department?: Department | null;
  companyId: string;
  departments?: Department[]; // For parent department selection
  onSubmit: (data: DepartmentForm) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onCreateParent?: (parentName: string, parentDescription?: string) => Promise<void>; // Optional callback to create parent
  onRefresh?: () => void; // Callback to refresh departments list
}

export default function DepartmentFormComponent({
  department,
  companyId,
  departments = [],
  onSubmit,
  onCancel,
  isLoading = false,
  onCreateParent,
  onRefresh,
}: DepartmentFormProps) {
  const [formData, setFormData] = useState<DepartmentForm>(DEFAULT_DEPARTMENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departmentNameMode, setDepartmentNameMode] = useState<'standard' | 'custom'>('standard');
  const [customDepartmentName, setCustomDepartmentName] = useState('');
  const [creatingParent, setCreatingParent] = useState(false);
  const [showCreateParentForm, setShowCreateParentForm] = useState(false);
  const [parentFormData, setParentFormData] = useState<DepartmentForm>(DEFAULT_DEPARTMENT_FORM);
  const [pendingParentName, setPendingParentName] = useState<string | null>(null);
  
  const { data: standardDepartments = [], isLoading: loadingStandard } = useStandardDepartments();

  // Watch for newly created parent department and auto-select it
  useEffect(() => {
    if (pendingParentName && departments.length > 0) {
      const newParent = departments.find((d) => d.name === pendingParentName && d.status === 'active');
      if (newParent) {
        setFormData((prev) => ({ ...prev, parent_department_id: newParent.id }));
        toast.success(`Parent department "${pendingParentName}" created and selected`);
        setPendingParentName(null);
        setShowCreateParentForm(false);
        setParentFormData(DEFAULT_DEPARTMENT_FORM);
      }
    }
  }, [departments, pendingParentName]);

  useEffect(() => {
    if (department) {
      const isStandard = standardDepartments.some((sd) => sd.name === department.name);
      setDepartmentNameMode(isStandard ? 'standard' : 'custom');
      setCustomDepartmentName(isStandard ? '' : department.name || '');
      
      setFormData({
        name: department.name || '',
        description: department.description || '',
        contact_name: department.contact_name || '',
        contact_email: department.contact_email || '',
        contact_phone: department.contact_phone || '',
        contact_mobile: department.contact_mobile || '',
        contact_details: department.contact_details || {},
        status: department.status || 'active',
        parent_department_id: department.parent_department_id || null,
        metadata: department.metadata || {},
      });
    } else {
      setFormData(DEFAULT_DEPARTMENT_FORM);
      setDepartmentNameMode('standard');
      setCustomDepartmentName('');
    }
  }, [department, standardDepartments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Set the department name based on mode
    const finalName = departmentNameMode === 'standard' 
      ? formData.name 
      : customDepartmentName.trim();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!finalName) {
      newErrors.name = 'Department name is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        ...formData,
        name: finalName,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const updateContactDetails = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contact_details: {
        ...(prev.contact_details || {}),
        [key]: value,
      },
    }));
  };

  const updateMetadata = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        [key]: value,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-theme-primary">Basic Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Department Name <span className="text-red-400">*</span>
          </label>
          
          {/* Mode selector */}
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="departmentNameMode"
                value="standard"
                checked={departmentNameMode === 'standard'}
                onChange={(e) => {
                  setDepartmentNameMode('standard');
                  if (standardDepartments.length > 0) {
                    setFormData({ ...formData, name: standardDepartments[0].name });
                  }
                }}
                className="w-4 h-4 text-[#D37E91] bg-white/[0.03] border-white/[0.06] focus:ring-[#D37E91]/50"
              />
              <span className="text-sm text-theme-tertiary">Standard</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="departmentNameMode"
                value="custom"
                checked={departmentNameMode === 'custom'}
                onChange={(e) => {
                  setDepartmentNameMode('custom');
                  setFormData({ ...formData, name: '' });
                }}
                className="w-4 h-4 text-[#D37E91] bg-white/[0.03] border-white/[0.06] focus:ring-[#D37E91]/50"
              />
              <span className="text-sm text-theme-tertiary">Other (Custom)</span>
            </label>
          </div>

          {/* Standard departments dropdown */}
          {departmentNameMode === 'standard' && (
            <div>
              <select
                value={formData.name}
                onChange={(e) => {
                  const selected = standardDepartments.find((sd) => sd.name === e.target.value);
                  if (!selected) {
                    setFormData({
                      ...formData,
                      name: '',
                      description: '',
                      parent_department_id: null,
                    });
                    return;
                  }

                  // Automatically find and set parent department if it exists
                  let parentDepartmentId: string | null = null;
                  if (selected.parent_department_id) {
                    // Find the parent standard department
                    const parentStandardDept = standardDepartments.find(
                      (sd) => sd.id === selected.parent_department_id
                    );
                    
                    if (parentStandardDept) {
                      // Find the matching company department by exact name match
                      const matchingCompanyDept = departments.find(
                        (d) => d.name === parentStandardDept.name && d.status === 'active'
                      );
                      
                      if (matchingCompanyDept) {
                        parentDepartmentId = matchingCompanyDept.id;
                        console.log(`Auto-setting parent: ${parentStandardDept.name} (ID: ${parentDepartmentId})`);
                      } else {
                        console.log(`Parent department "${parentStandardDept.name}" not found in company departments`);
                      }
                    } else {
                      console.log(`Parent standard department not found for ID: ${selected.parent_department_id}`);
                    }
                  }

                  setFormData({
                    ...formData,
                    name: e.target.value,
                    description: selected.description || '',
                    parent_department_id: parentDepartmentId,
                  });
                  
                  console.log('Form data after selection:', {
                    name: e.target.value,
                    parent_department_id: parentDepartmentId,
                    selectedStandard: selected.name,
                    selectedParentId: selected.parent_department_id,
                  });
                }}
                className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingStandard}
              >
                <option value="" className="bg-[#0B0D13] text-white">Select a standard department...</option>
                {standardDepartments
                  .sort((a, b) => {
                    // Sort by parent first, then by display_order, then by name
                    if (a.parent_department_id && !b.parent_department_id) return 1;
                    if (!a.parent_department_id && b.parent_department_id) return -1;
                    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
                    return a.name.localeCompare(b.name);
                  })
                  .map((sd) => {
                    const parentName = sd.parent?.name || 
                      (sd.parent_department_id ? standardDepartments.find((p) => p.id === sd.parent_department_id)?.name : null);
                    const displayName = parentName ? `${sd.name} (${parentName})` : sd.name;
                    return (
                      <option key={sd.id} value={sd.name} className="bg-[#0B0D13] text-white">
                        {displayName} {sd.description ? `- ${sd.description}` : ''}
                      </option>
                    );
                  })}
              </select>
              {formData.name && (() => {
                const selected = standardDepartments.find((sd) => sd.name === formData.name);
                if (selected?.parent_department_id) {
                  const parentStandardDept = standardDepartments.find((sd) => sd.id === selected.parent_department_id);
                  if (!parentStandardDept) return null;
                  
                  const matchingCompanyDept = departments.find(
                    (d) => d.name === parentStandardDept.name && d.status === 'active'
                  );
                  
                  if (!matchingCompanyDept) {
                    return (
                      <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                        <p className="text-xs text-yellow-400 mb-2">
                          ⚠ Parent department "{parentStandardDept.name}" not found.
                        </p>
                        {onCreateParent && (
                          <button
                            type="button"
                            onClick={() => {
                              onCreateParent(
                                parentStandardDept.name,
                                parentStandardDept.description || undefined
                              );
                            }}
                            className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                          >
                            Create "{parentStandardDept.name}" first
                          </button>
                        )}
                        {!onCreateParent && (
                          <p className="text-xs text-yellow-400">
                            Please create "{parentStandardDept.name}" first, or manually select a different parent below.
                          </p>
                        )}
                      </div>
                    );
                  }
                  
                  if (matchingCompanyDept && formData.parent_department_id === matchingCompanyDept.id) {
                    return (
                      <p className="mt-2 text-xs text-green-400">
                        ✓ Parent department "{parentStandardDept.name}" automatically set
                      </p>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}

          {/* Custom department name input */}
          {departmentNameMode === 'custom' && (
            <Input
              value={customDepartmentName}
              onChange={(e) => setCustomDepartmentName(e.target.value)}
              placeholder="Enter custom department name"
              className={errors.name ? 'border-red-500' : ''}
            />
          )}

          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the department"
            rows={3}
            className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-theme-tertiary">
              Parent Department
            </label>
            {!showCreateParentForm && (
              <button
                type="button"
                onClick={() => setShowCreateParentForm(true)}
                className="text-xs text-[#D37E91] hover:text-[#D37E91]/80 underline"
              >
                + Create New Parent
              </button>
            )}
          </div>

          {showCreateParentForm ? (
            <div className="space-y-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-theme-primary">Create Parent Department</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateParentForm(false);
                    setParentFormData(DEFAULT_DEPARTMENT_FORM);
                  }}
                  className="text-theme-tertiary hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-tertiary mb-1">
                  Parent Department Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={parentFormData.name}
                  onChange={(e) => setParentFormData({ ...parentFormData, name: e.target.value })}
                  placeholder="e.g., Finance, Operations"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-tertiary mb-1">
                  Description
                </label>
                <textarea
                  value={parentFormData.description || ''}
                  onChange={(e) => setParentFormData({ ...parentFormData, description: e.target.value })}
                  placeholder="Brief description"
                  rows={2}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    if (!parentFormData.name.trim()) {
                      toast.error('Parent department name is required');
                      return;
                    }
                    try {
                      setCreatingParent(true);
                      if (onCreateParent) {
                        await onCreateParent(parentFormData.name, parentFormData.description || undefined);
                        // Refresh departments list
                        if (onRefresh) {
                          await onRefresh();
                        }
                        // Set pending parent name - useEffect will watch for it and auto-select
                        setPendingParentName(parentFormData.name);
                        setCreatingParent(false);
                      }
                    } catch (error) {
                      console.error('Error creating parent:', error);
                    } finally {
                      setCreatingParent(false);
                    }
                  }}
                  disabled={creatingParent || !parentFormData.name.trim()}
                  className="bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] text-sm px-3 py-1.5"
                >
                  {creatingParent ? 'Creating...' : 'Create & Select'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateParentForm(false);
                    setParentFormData(DEFAULT_DEPARTMENT_FORM);
                  }}
                  className="border-white/12 text-theme-tertiary hover:bg-white/[0.08] text-sm px-3 py-1.5"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <select
                value={formData.parent_department_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  // Don't allow selecting suggestions - they're disabled anyway, but just in case
                  if (value.startsWith('suggestion-')) {
                    return;
                  }
                  setFormData({
                    ...formData,
                    parent_department_id: value || null,
                  });
                }}
                className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50"
              >
                <option value="" className="bg-[#0B0D13] text-white">None (Top Level)</option>
                
                {/* Standard Top-Level Departments (suggestions) */}
                {standardDepartments
                  .filter((sd) => !sd.parent_department_id) // Only top-level standard departments
                  .sort((a, b) => {
                    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
                    return a.name.localeCompare(b.name);
                  })
                  .map((sd) => {
                    // Check if this standard department exists in company departments
                    const existingDept = departments.find(
                      (d) => d.name === sd.name && d.status === 'active' && d.id !== department?.id
                    );
                    
                    if (existingDept) {
                      // If it exists, use the actual department ID
                      return (
                        <option key={`existing-${existingDept.id}`} value={existingDept.id} className="bg-[#0B0D13] text-white">
                          {sd.name} {sd.description ? `- ${sd.description}` : ''}
                        </option>
                      );
                    } else {
                      // If it doesn't exist, show it as a suggestion (will need to be created)
                      return (
                        <option key={`suggestion-${sd.id}`} value={`suggestion-${sd.id}`} className="bg-[#0B0D13] text-white" disabled>
                          {sd.name} {sd.description ? `- ${sd.description}` : ''} (Create first)
                        </option>
                      );
                    }
                  })}
                
                {/* Separator if both standard and custom departments exist */}
                {standardDepartments.filter((sd) => !sd.parent_department_id).length > 0 &&
                  departments.filter((d) => d.id !== department?.id && d.status === 'active').length > 0 && (
                    <option disabled className="bg-[#0B0D13] text-theme-tertiary">
                      ────────────────────
                    </option>
                  )}
                
                {/* Company's Custom Departments */}
                {departments
                  .filter((d) => {
                    // Only show departments that:
                    // 1. Are not the current department being edited
                    // 2. Are active
                    // 3. Are not already shown in the standard departments list above
                    if (d.id === department?.id || d.status !== 'active') return false;
                    const isStandardTopLevel = standardDepartments.some(
                      (sd) => !sd.parent_department_id && sd.name === d.name
                    );
                    return !isStandardTopLevel; // Only show if not a standard top-level
                  })
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((d) => {
                    // Build hierarchy display
                    const getHierarchy = (dept: Department, depth = 0): string => {
                      if (dept.parent_department_id) {
                        const parent = departments.find((p) => p.id === dept.parent_department_id);
                        if (parent) {
                          return getHierarchy(parent, depth + 1) + ' → ' + dept.name;
                        }
                      }
                      return dept.name;
                    };
                    return (
                      <option key={d.id} value={d.id} className="bg-[#0B0D13] text-white">
                        {getHierarchy(d)}
                      </option>
                    );
                  })}
              </select>
              
              {/* Show info about standard departments that aren't created yet */}
              {standardDepartments
                .filter((sd) => !sd.parent_department_id)
                .some((sd) => {
                  const exists = departments.some((d) => d.name === sd.name && d.status === 'active');
                  return !exists;
                }) && (
                <p className="mt-1 text-xs text-theme-tertiary">
                  💡 Standard departments shown above. Disabled options need to be created first.
                </p>
              )}
              
              {formData.parent_department_id && (
                <p className="mt-1 text-xs text-theme-tertiary">
                  Selected: {departments.find((d) => d.id === formData.parent_department_id)?.name || 'Unknown'}
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as 'active' | 'inactive' | 'archived',
              })
            }
            className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50"
          >
            <option value="active" className="bg-[#0B0D13] text-white">Active</option>
            <option value="inactive" className="bg-[#0B0D13] text-white">Inactive</option>
            <option value="archived" className="bg-[#0B0D13] text-white">Archived</option>
          </select>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-theme-primary">Contact Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Contact Name
          </label>
          <Input
            value={formData.contact_name || ''}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            placeholder="Primary contact person"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Contact Email
            </label>
            <Input
              type="email"
              value={formData.contact_email || ''}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="contact@example.com"
              className={errors.contact_email ? 'border-red-500' : ''}
            />
            {errors.contact_email && (
              <p className="mt-1 text-sm text-red-400">{errors.contact_email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Contact Phone
            </label>
            <Input
              value={formData.contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              placeholder="+44 20 1234 5678"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Mobile Phone
          </label>
          <Input
            value={formData.contact_mobile || ''}
            onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value })}
            placeholder="+44 7700 900123"
          />
        </div>

        {/* Additional Contact Details */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-theme-tertiary mb-2">
            Additional Contact Details
          </label>
          <div className="space-y-2">
            <Input
              value={formData.contact_details?.address || ''}
              onChange={(e) => updateContactDetails('address', e.target.value)}
              placeholder="Office Address"
            />
            <Input
              value={formData.contact_details?.extension || ''}
              onChange={(e) => updateContactDetails('extension', e.target.value)}
              placeholder="Extension"
            />
            <Input
              value={formData.contact_details?.office_location || ''}
              onChange={(e) => updateContactDetails('office_location', e.target.value)}
              placeholder="Office Location (e.g., Building A, Floor 2)"
            />
            <Input
              type="email"
              value={formData.contact_details?.alternate_email || ''}
              onChange={(e) => updateContactDetails('alternate_email', e.target.value)}
              placeholder="Alternate Email"
            />
            <textarea
              value={formData.contact_details?.notes || ''}
              onChange={(e) => updateContactDetails('notes', e.target.value)}
              placeholder="Additional notes (e.g., Available 9-5 weekdays)"
              rows={2}
              className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-theme-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
            />
          </div>
        </div>
      </div>

      {/* Additional Metadata */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-theme-primary">Additional Metadata</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Budget Code
            </label>
            <Input
              value={formData.metadata?.budget_code || ''}
              onChange={(e) => updateMetadata('budget_code', e.target.value)}
              placeholder="DEPT-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Cost Center
            </label>
            <Input
              value={formData.metadata?.cost_center || ''}
              onChange={(e) => updateMetadata('cost_center', e.target.value)}
              placeholder="CC-123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Head Count
            </label>
            <Input
              type="number"
              value={formData.metadata?.head_count || ''}
              onChange={(e) => updateMetadata('head_count', e.target.value)}
              placeholder="25"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-tertiary mb-2">
              Location
            </label>
            <Input
              value={formData.metadata?.location || ''}
              onChange={(e) => updateMetadata('location', e.target.value)}
              placeholder="Head Office"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border-white/12 text-theme-tertiary hover:bg-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)]"
        >
          {isLoading ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
        </Button>
      </div>
    </form>
  );
}

