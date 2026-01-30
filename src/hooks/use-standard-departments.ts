/**
 * React Query hooks for Standard Departments
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StandardDepartment } from '@/types/standard-departments';

/**
 * Fetch all standard departments with parent relationships
 */
export function useStandardDepartments() {
  return useQuery({
    queryKey: ['standard-departments'],
    queryFn: async (): Promise<StandardDepartment[]> => {
      const { data, error } = await supabase
        .from('standard_departments')
        .select(`
          *,
          parent:standard_departments!parent_department_id (
            id,
            name
          )
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching standard departments:', error);
        throw error;
      }

      return (data || []) as StandardDepartment[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data)
  });
}

/**
 * Fetch only top-level standard departments (no parent)
 */
export function useTopLevelStandardDepartments() {
  return useQuery({
    queryKey: ['standard-departments', 'top-level'],
    queryFn: async (): Promise<StandardDepartment[]> => {
      const { data, error } = await supabase
        .from('standard_departments')
        .select('*')
        .is('parent_department_id', null)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching top-level standard departments:', error);
        throw error;
      }

      return (data || []) as StandardDepartment[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data)
  });
}

/**
 * Fetch child departments for a specific parent
 */
export function useChildStandardDepartments(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ['standard-departments', 'children', parentId],
    queryFn: async (): Promise<StandardDepartment[]> => {
      if (!parentId) return [];

      const { data, error } = await supabase
        .from('standard_departments')
        .select('*')
        .eq('parent_department_id', parentId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching child standard departments:', error);
        throw error;
      }

      return (data || []) as StandardDepartment[];
    },
    enabled: !!parentId,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data)
  });
}

