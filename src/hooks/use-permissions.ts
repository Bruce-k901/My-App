/**
 * React Query hooks for Roles & Permissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { 
  Role, 
  Permission, 
  RoleWithPermissions, 
  UserRole, 
  PermissionScope,
  EffectivePermission,
  PermissionCheck,
  RoleForm,
  PermissionAssignment
} from '@/types/permissions';

// Fetch all roles for company
export function useRoles() {
  const { profile } = useAppContext();
  
  return useQuery({
    queryKey: ['roles', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) {
        console.log('❌ No company_id in profile');
        return [];
      }
      
      console.log('🔍 Fetching roles for company:', profile.company_id);
      console.log('🔍 User ID:', profile.id);
      
      // Try querying without filters first to see if RLS is the issue
      const { data: allData, error: allError } = await supabase
        .from('roles')
        .select('*');
      
      console.log('🔍 All roles query result:', { 
        count: allData?.length || 0, 
        error: allError,
        sample: allData?.slice(0, 2)
      });
      
      // Now try with filters
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching roles:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        // Try to get more error info
        try {
          console.error('❌ Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        } catch (e) {
          console.error('❌ Could not stringify error:', e);
        }
        throw error;
      }
      
      console.log('✅ Fetched roles:', data?.length || 0, 'roles');
      if (data && data.length > 0) {
        console.log('📋 Sample role:', data[0]);
      }
      return (data || []) as Role[];
    },
    enabled: !!profile?.company_id,
  });
}

// Fetch single role with permissions
export function useRole(roleId: string | null) {
  return useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      if (!roleId) return null;
      
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
      
      if (roleError) throw roleError;
      
      const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:permissions(*)
        `)
        .eq('role_id', roleId);
      
      if (permError) throw permError;
      
      return {
        ...role,
        permissions: (rolePermissions || []).map((rp: any) => ({
          ...rp,
          permission: rp.permission,
        })),
      } as RoleWithPermissions;
    },
    enabled: !!roleId,
  });
}

// Fetch all available permissions
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Permission[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data)
  });
}

// Fetch current user's roles
export function useUserRoles(profileId?: string) {
  const { profile } = useAppContext();
  const userId = profileId || profile?.id;
  
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('profile_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      
      if (error) throw error;
      return (data || []).map((ur: any) => ({
        ...ur,
        role: ur.role,
      })) as (UserRole & { role: Role })[];
    },
    enabled: !!userId,
  });
}

// Get user's effective permissions (flattened from all roles)
export function useEffectivePermissions(profileId?: string) {
  const { data: userRoles, isLoading } = useUserRoles(profileId);
  
  return useQuery({
    queryKey: ['effective-permissions', userRoles?.map(r => r.role_id).join(',')],
    queryFn: async () => {
      if (!userRoles || userRoles.length === 0) return [];
      
      const roleIds = userRoles.map(ur => ur.role_id);
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id, scope')
        .in('role_id', roleIds);
      
      if (error) throw error;
      
      // Merge permissions - take highest scope for each permission
      const scopeOrder: PermissionScope[] = ['self', 'team', 'site', 'area', 'region', 'all'];
      const permissionMap = new Map<string, EffectivePermission>();
      
      (data || []).forEach((rp: any) => {
        const existing = permissionMap.get(rp.permission_id);
        if (!existing || scopeOrder.indexOf(rp.scope) > scopeOrder.indexOf(existing.scope)) {
          permissionMap.set(rp.permission_id, {
            permission_id: rp.permission_id,
            scope: rp.scope,
          });
        }
      });
      
      return Array.from(permissionMap.values());
    },
    enabled: !isLoading && !!userRoles && userRoles.length > 0,
  });
}

// Check if user has a specific permission
export function useHasPermission(permissionId: string, requiredScope?: PermissionScope): PermissionCheck {
  const { data: effectivePermissions, isLoading } = useEffectivePermissions();
  
  if (isLoading) {
    return { allowed: false, scope: 'self', reason: 'Loading permissions' };
  }
  
  if (!effectivePermissions || effectivePermissions.length === 0) {
    return { allowed: false, scope: 'self', reason: 'No permissions loaded' };
  }
  
  const permission = effectivePermissions.find(p => p.permission_id === permissionId);
  
  if (!permission) {
    return { allowed: false, scope: 'self', reason: 'Permission not granted' };
  }
  
  if (requiredScope) {
    const scopeOrder: PermissionScope[] = ['self', 'team', 'site', 'area', 'region', 'all'];
    const hasScope = scopeOrder.indexOf(permission.scope) >= scopeOrder.indexOf(requiredScope);
    
    if (!hasScope) {
      return { 
        allowed: false, 
        scope: permission.scope, 
        reason: `Requires ${requiredScope} scope, has ${permission.scope}` 
      };
    }
  }
  
  return { allowed: true, scope: permission.scope };
}

// Mutations
export function useCreateRole() {
  const { profile } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (role: RoleForm) => {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          ...role,
          company_id: profile!.company_id,
          created_by: profile!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoleForm> & { id: string }) => {
      const { data, error } = await supabase
        .from('roles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Role;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', data.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('roles')
        .update({ is_active: false }) // Soft delete
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      roleId, 
      permissions 
    }: { 
      roleId: string; 
      permissions: PermissionAssignment[] 
    }) => {
      // Delete existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      
      // Insert new permissions (only enabled ones)
      const enabledPermissions = permissions.filter(p => p.enabled);
      if (enabledPermissions.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            enabledPermissions.map(p => ({
              role_id: roleId,
              permission_id: p.permission_id,
              scope: p.scope,
            }))
          );
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
    },
  });
}

export function useAssignRole() {
  const { profile } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignment: Omit<UserRole, 'id' | 'assigned_at' | 'assigned_by'>) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          ...assignment,
          assigned_by: profile!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as UserRole;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', data.profile_id] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userRoleId, profileId }: { userRoleId: string; profileId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);
      
      if (error) throw error;
      return { profileId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', data.profileId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
    },
  });
}

