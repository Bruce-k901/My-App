/**
 * React Query hooks for Departments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Department, DepartmentForm } from '@/types/departments';
import { toast } from 'sonner';

/**
 * Fetch all departments for a company
 */
export function useDepartments(companyId: string | undefined) {
  return useQuery({
    queryKey: ['departments', companyId],
    queryFn: async (): Promise<Department[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching departments:', error);
        throw error;
      }

      return (data || []) as Department[];
    },
    enabled: !!companyId,
  });
}

/**
 * Fetch a single department by ID
 */
export function useDepartment(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department', departmentId],
    queryFn: async (): Promise<Department | null> => {
      if (!departmentId) return null;

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (error) {
        console.error('Error fetching department:', error);
        throw error;
      }

      return data as Department;
    },
    enabled: !!departmentId,
  });
}

/**
 * Create a new department
 */
export function useCreateDepartment(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: DepartmentForm): Promise<Department> => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...formData,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating department:', error);
        throw error;
      }

      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', companyId] });
      toast.success('Department created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating department:', error);
      toast.error(error.message || 'Failed to create department');
    },
  });
}

/**
 * Update an existing department
 */
export function useUpdateDepartment(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: Partial<DepartmentForm>;
    }): Promise<Department> => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('departments')
        .update(formData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating department:', error);
        throw error;
      }

      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', companyId] });
      toast.success('Department updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating department:', error);
      toast.error(error.message || 'Failed to update department');
    },
  });
}

/**
 * Delete (soft delete) a department
 */
export function useDeleteDepartment(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Soft delete by setting status to archived
      const { error } = await supabase
        .from('departments')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting department:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', companyId] });
      toast.success('Department deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Failed to delete department');
    },
  });
}

