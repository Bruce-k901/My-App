'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-departments';
import DepartmentFormComponent from '@/components/departments/DepartmentForm';
import DepartmentTree from '@/components/departments/DepartmentTree';
import { Button } from '@/components/ui/Button';
import { Building2, ArrowLeft, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Department, DepartmentForm } from '@/types/departments';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function SettingsDepartmentsPage() {
  const { loading: ctxLoading, profile } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  const companyId = profile?.company_id;
  const { data: departments = [], isLoading } = useDepartments(companyId);
  const createMutation = useCreateDepartment(companyId);
  const updateMutation = useUpdateDepartment(companyId);
  const deleteMutation = useDeleteDepartment(companyId);

  // Filter departments based on search query
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      dept.name.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query) ||
      dept.contact_name?.toLowerCase().includes(query) ||
      dept.contact_email?.toLowerCase().includes(query) ||
      dept.contact_phone?.includes(query)
    );
  });

  const handleSubmit = async (formData: DepartmentForm) => {
    try {
      if (editingDepartment) {
        await updateMutation.mutateAsync({
          id: editingDepartment.id,
          formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setFormOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      console.error('Error saving department:', error);
    }
  };

  const handleCreateParent = async (parentName: string, parentDescription?: string): Promise<void> => {
    try {
      // Create the parent department first
      const parentFormData: DepartmentForm = {
        name: parentName,
        description: parentDescription || '',
        status: 'active',
        parent_department_id: null,
      };
      
      await createMutation.mutateAsync(parentFormData);
      toast.success(`Created "${parentName}" department.`);
      
      // The query will automatically refetch via React Query
    } catch (error: any) {
      console.error('Error creating parent department:', error);
      toast.error(`Failed to create "${parentName}": ${error.message || 'Unknown error'}`);
      throw error; // Re-throw so the form can handle it
    }
  };

  const handleRefresh = async () => {
    // Force refetch of departments
    await refetchDepartments();
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormOpen(true);
  };

  const handleDelete = async (department: Department) => {
    try {
      await deleteMutation.mutateAsync(department.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting department:', error);
    }
  };

  const handleExport = () => {
    try {
      const fields = [
        'name',
        'description',
        'contact_name',
        'contact_email',
        'contact_phone',
        'contact_mobile',
        'status',
        'parent_department_id',
      ];

      const rows = departments.map((dept) => {
        const row: Record<string, any> = {};
        for (const f of fields) {
          if (f === 'parent_department_id' && dept.parent_department_id) {
            const parent = departments.find((d) => d.id === dept.parent_department_id);
            row[f] = parent?.name || dept.parent_department_id;
          } else {
            row[f] = dept[f as keyof Department] ?? '';
          }
        }
        // Add contact details
        if (dept.contact_details) {
          row['contact_address'] = dept.contact_details.address || '';
          row['contact_extension'] = dept.contact_details.extension || '';
          row['contact_office_location'] = dept.contact_details.office_location || '';
          row['contact_alternate_email'] = dept.contact_details.alternate_email || '';
          row['contact_notes'] = dept.contact_details.notes || '';
        }
        // Add metadata
        if (dept.metadata) {
          row['budget_code'] = dept.metadata.budget_code || '';
          row['cost_center'] = dept.metadata.cost_center || '';
          row['head_count'] = dept.metadata.head_count || '';
          row['location'] = dept.metadata.location || '';
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Departments');
      const xlsxArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'departments_export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Departments exported successfully');
    } catch (e: any) {
      console.error('Export failed:', e?.message || 'Unable to export');
      toast.error('Failed to export departments');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async ({ data }: any) => {
            try {
              if (!companyId) {
                toast.error('No company ID found');
                return;
              }

              const valid = data.filter(
                (r: any) => r.name && String(r.name).trim() !== ''
              );

              if (valid.length === 0) {
                toast.error('No valid rows found');
                return;
              }

              const payload = valid.map((r: any) => {
                const contactDetails: any = {};
                if (r.contact_address) contactDetails.address = r.contact_address;
                if (r.contact_extension) contactDetails.extension = r.contact_extension;
                if (r.contact_office_location)
                  contactDetails.office_location = r.contact_office_location;
                if (r.contact_alternate_email)
                  contactDetails.alternate_email = r.contact_alternate_email;
                if (r.contact_notes) contactDetails.notes = r.contact_notes;

                const metadata: any = {};
                if (r.budget_code) metadata.budget_code = r.budget_code;
                if (r.cost_center) metadata.cost_center = r.cost_center;
                if (r.head_count) metadata.head_count = parseInt(r.head_count) || null;
                if (r.location) metadata.location = r.location;

                // Find parent department by name
                let parentId = null;
                if (r.parent_department_id) {
                  const parent = departments.find(
                    (d) => d.name.toLowerCase() === r.parent_department_id.toLowerCase()
                  );
                  parentId = parent?.id || null;
                }

                return {
                  name: r.name,
                  description: r.description || null,
                  contact_name: r.contact_name || null,
                  contact_email: r.contact_email || null,
                  contact_phone: r.contact_phone || null,
                  contact_mobile: r.contact_mobile || null,
                  contact_details: Object.keys(contactDetails).length > 0 ? contactDetails : null,
                  status: r.status?.trim() || 'active',
                  parent_department_id: parentId,
                  metadata: Object.keys(metadata).length > 0 ? metadata : null,
                  company_id: companyId,
                };
              });

              // Import departments one by one
              let successCount = 0;
              for (const item of payload) {
                try {
                  // Remove company_id from the payload as it's added by the mutation
                  const { company_id: _, ...formData } = item;
                  await createMutation.mutateAsync(formData as DepartmentForm);
                  successCount++;
                } catch (err) {
                  console.error('Error importing department:', err);
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} of ${payload.length} departments`);
              } else {
                toast.error('Failed to import departments');
              }
            } catch (err: any) {
              console.error('Upload failed:', err);
              toast.error(`Upload failed: ${err.message || 'Unknown error'}`);
            }
          },
          error: (err: any) => {
            console.error('Upload failed:', err.message || 'Parsing error');
            toast.error('Failed to parse CSV file');
          },
        });
      } catch (err: any) {
        toast.error('Failed to process file');
      }
    };
    input.click();
  };

  if (ctxLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/people/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Departments
            </h1>
            <p className="text-gray-500 dark:text-white/60">
              Manage your company departments and contact information
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-white/12 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
            >
              Export
            </Button>
            <Button
              onClick={handleImport}
              variant="outline"
              className="border-white/12 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
            >
              Import
            </Button>
            <button
              onClick={() => {
                setEditingDepartment(null);
                setFormOpen(true);
              }}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-[#EC4899] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/40"
              title="Add Department"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search departments by name, description, or contact..."
          className="w-full pl-10 pr-10 py-2 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Departments List - Org Chart View */}
      {departments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg">
          <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">
            {searchQuery ? 'No departments found matching your search' : 'No departments yet'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                setEditingDepartment(null);
                setFormOpen(true);
              }}
              className="mt-4 bg-transparent border border-[#EC4899] text-blue-600 dark:text-blue-400 hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Department
            </Button>
          )}
        </div>
      ) : (
        <DepartmentTree
          departments={departments}
          onEdit={handleEdit}
          onDelete={(dept) => setDeleteConfirm(dept)}
          searchQuery={searchQuery}
        />
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 dark:bg-[#0B0D13] border border-gray-200 dark:border-white/[0.06] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingDepartment ? 'Edit Department' : 'Create New Department'}
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingDepartment(null);
                }}
                className="text-gray-400 hover:text-gray-900 dark:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DepartmentFormComponent
              department={editingDepartment}
              companyId={companyId || ''}
              departments={departments}
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormOpen(false);
                setEditingDepartment(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              onCreateParent={handleCreateParent}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 dark:bg-[#0B0D13] border border-gray-200 dark:border-white/[0.06] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Department</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="border-white/12 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

