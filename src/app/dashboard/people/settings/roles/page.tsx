'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  ArrowLeft,
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  Crown,
  Users,
  Building2,
  MapPin,
  Briefcase,
  Banknote,
  Map as MapIcon,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';
import {
  useRoles,
  useRole,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useUpdateRolePermissions,
} from '@/hooks/use-permissions';
import { Role, Permission, PermissionScope, PermissionAssignment, RoleForm } from '@/types/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// Function to get icon component - avoids webpack barrel optimization issues
const getRoleIcon = (iconKey: string | null | undefined): React.ComponentType<{ className?: string }> => {
  switch (iconKey) {
    case 'crown':
      return Crown;
    case 'shield':
      return Shield;
    case 'users':
    case 'users-round':
      return Users;
    case 'banknote':
      return Banknote;
    case 'map':
      return MapIcon;
    case 'map-pin':
      return MapPin;
    case 'building':
      return Building2;
    case 'briefcase':
      return Briefcase;
    case 'user':
    default:
      return User;
  }
};

const SCOPE_OPTIONS: { value: PermissionScope; label: string }[] = [
  { value: 'self', label: 'Self' },
  { value: 'team', label: 'Team' },
  { value: 'site', label: 'Site' },
  { value: 'area', label: 'Area' },
  { value: 'region', label: 'Region' },
  { value: 'all', label: 'All' },
];

export default function RolesAndPermissionsPage() {
  const { profile } = useAppContext();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>({
    name: '',
    slug: '',
    description: '',
    hierarchy_level: 100,
    color: '#6B7280',
    icon: 'user',
    is_active: true,
  });

  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
  
  // Debug logging
  React.useEffect(() => {
    if (rolesError) {
      console.error('❌ Roles query error:', {
        message: rolesError.message,
        name: rolesError.name,
        stack: rolesError.stack,
        fullError: rolesError
      });
    }
    if (!rolesLoading && roles.length === 0) {
      console.log('⚠️ No roles found. Company ID:', profile?.company_id);
      console.log('🔍 Profile:', profile);
    }
  }, [rolesError, rolesLoading, roles.length, profile?.company_id]);
  const { data: role, isLoading: roleLoading } = useRole(selectedRoleId);
  const { data: permissions = [], isLoading: permissionsLoading } = usePermissions();
  
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const updatePermissionsMutation = useUpdateRolePermissions();

  // Permission assignments state
  const [permissionAssignments, setPermissionAssignments] = useState<Map<string, PermissionAssignment>>(new Map());

  // Group permissions by area
  const permissionsByArea = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.area]) {
        grouped[perm.area] = [];
      }
      grouped[perm.area].push(perm);
    });
    return grouped;
  }, [permissions]);

  // Update form when role is selected
  useMemo(() => {
    if (role && !isCreating) {
      setRoleForm({
        name: role.name,
        slug: role.slug,
        description: role.description || '',
        hierarchy_level: role.hierarchy_level,
        color: role.color,
        icon: role.icon,
        is_active: role.is_active,
      });
    } else if (isCreating) {
      // Reset form for new role
      setRoleForm({
        name: '',
        slug: '',
        description: '',
        hierarchy_level: 100,
        color: '#6B7280',
        icon: 'user',
        is_active: true,
      });
    }
  }, [role, isCreating]);

  // Initialize permission assignments when role is loaded
  useMemo(() => {
    if (role && permissions.length > 0) {
      const assignments = new Map<string, PermissionAssignment>();
      
      permissions.forEach(perm => {
        const existing = role.permissions.find(rp => rp.permission_id === perm.id);
        assignments.set(perm.id, {
          permission_id: perm.id,
          scope: existing?.scope || 'self',
          enabled: !!existing,
        });
      });
      
      setPermissionAssignments(assignments);
    } else if (!role && permissions.length > 0 && isCreating) {
      // Reset for new role
      const assignments = new Map<string, PermissionAssignment>();
      permissions.forEach(perm => {
        assignments.set(perm.id, {
          permission_id: perm.id,
          scope: 'self',
          enabled: false,
        });
      });
      setPermissionAssignments(assignments);
    }
  }, [role, permissions, isCreating]);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsCreating(false);
  };

  const handleNewRole = () => {
    setSelectedRoleId(null);
    setIsCreating(true);
    // Reset form
    setPermissionAssignments(new Map());
  };

  const handleSeedDefaultRoles = async () => {
    if (!profile?.company_id) {
      toast.error('Company ID not found');
      return;
    }

    try {
      console.log('🌱 Seeding default roles for company:', profile.company_id);
      const { error, data } = await supabase.rpc('seed_default_roles', {
        p_company_id: profile.company_id,
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      console.log('✅ Seed function completed:', data);
      toast.success('Default roles seeded successfully!');
      
      // Wait a moment then refetch roles
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['roles', profile.company_id] });
        queryClient.refetchQueries({ queryKey: ['roles', profile.company_id] });
      }, 500);
    } catch (error: any) {
      console.error('❌ Error seeding default roles:', error);
      toast.error(`Failed to seed default roles: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId && !isCreating) return;

    // Validate form
    if (!roleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    // Generate slug from name if not provided
    const slug = roleForm.slug.trim() || roleForm.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    try {
      // First, save the role details
      if (isCreating) {
        const newRole: RoleForm = {
          ...roleForm,
          slug,
        };
        
        const created = await createMutation.mutateAsync(newRole);
        setSelectedRoleId(created.id);
        setIsCreating(false);
        
        // Then save permissions
        const assignments = Array.from(permissionAssignments.values());
        await updatePermissionsMutation.mutateAsync({
          roleId: created.id,
          permissions: assignments,
        });
        
        toast.success('Role created successfully');
      } else if (selectedRoleId) {
        // Update role details
        await updateMutation.mutateAsync({
          id: selectedRoleId,
          ...roleForm,
          slug,
        });
        
        // Update permissions
        const assignments = Array.from(permissionAssignments.values());
        await updatePermissionsMutation.mutateAsync({
          roleId: selectedRoleId,
          permissions: assignments,
        });
        
        toast.success('Role updated successfully');
      }
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error(`Failed to save role: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    if (roleToDelete.is_system_role) {
      toast.error('System roles cannot be deleted');
      return;
    }

    try {
      await deleteMutation.mutateAsync(roleId);
      toast.success('Role deleted successfully');
      setSelectedRoleId(null);
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(`Failed to delete role: ${error.message || 'Unknown error'}`);
    }
  };

  const togglePermission = (permissionId: string) => {
    const assignment = permissionAssignments.get(permissionId);
    if (assignment) {
      setPermissionAssignments(new Map(permissionAssignments).set(permissionId, {
        ...assignment,
        enabled: !assignment.enabled,
      }));
    }
  };

  const updatePermissionScope = (permissionId: string, scope: PermissionScope) => {
    const assignment = permissionAssignments.get(permissionId);
    if (assignment) {
      setPermissionAssignments(new Map(permissionAssignments).set(permissionId, {
        ...assignment,
        scope,
      }));
    }
  };

  const getSensitivityColor = (sensitivity: string) => {
    switch (sensitivity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 dark:text-white">Loading roles and permissions...</div>
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
              <Shield className="w-6 h-6 text-[#EC4899]" />
              Roles & Permissions
            </h1>
            <p className="text-gray-500 dark:text-white/60">
              Define user roles and configure access permissions
            </p>
          </div>
          <PermissionGate permission="settings.roles">
            <Button
              onClick={handleNewRole}
              className="bg-transparent border border-blue-600 dark:border-blue-400 text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Roles</h2>
            {rolesLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Loading roles...</p>
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No roles found</p>
                {rolesError && (
                  <p className="text-xs text-red-400 mb-2">Error: {rolesError.message}</p>
                )}
                {profile?.company_id && (
                  <p className="text-xs text-gray-500 mb-4">Company ID: {profile.company_id}</p>
                )}
                <div className="flex flex-col gap-2 items-center">
                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['roles'] });
                      queryClient.refetchQueries({ queryKey: ['roles'] });
                    }}
                    className="bg-transparent border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white/70 hover:border-gray-400 dark:hover:border-white/40 text-xs mb-2"
                  >
                    Refresh
                  </Button>
                  <Button
                    onClick={handleSeedDefaultRoles}
                    className="bg-transparent border border-blue-600 dark:border-blue-400 text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] text-sm"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Seed Default Roles
                  </Button>
                  <span className="text-xs text-gray-500">or</span>
                  <Button
                    onClick={handleNewRole}
                    className="bg-transparent border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white/70 hover:border-gray-400 dark:hover:border-white/40 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Role
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => {
                // Get icon component safely using function to avoid webpack issues
                const IconComponent = getRoleIcon(role.icon);
                const isSelected = selectedRoleId === role.id;
                
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#EC4899]/10 border-blue-200 dark:border-blue-500/50'
                        : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-1.5 rounded"
                          style={{ backgroundColor: `${role.color}20`, color: role.color }}
                        >
                          {React.createElement(IconComponent, { className: "w-4 h-4" })}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</p>
                          {role.is_system_role && (
                            <span className="text-xs text-gray-400">System Role</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#EC4899]" />
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {/* Role Editor */}
        <div className="lg:col-span-2">
          {selectedRoleId || isCreating ? (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6">
              {roleLoading ? (
                <div className="text-center py-8 text-gray-400">Loading role...</div>
              ) : (
                <>
                  {/* Role Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isCreating ? 'Create New Role' : role?.name || 'Edit Role'}
                    </h2>
                    <div className="flex items-center gap-2">
                      {!isCreating && role && !role.is_system_role && (
                        <Button
                          onClick={() => setShowDeleteConfirm(role.id)}
                          className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                      <Button
                        onClick={handleSaveRole}
                        disabled={updateMutation.isPending || updatePermissionsMutation.isPending}
                        className="bg-transparent border border-blue-600 dark:border-blue-400 text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Role Details Form */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Role Name <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder="e.g., Assistant Manager"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Slug (auto-generated from name)
                      </label>
                      <Input
                        value={roleForm.slug || roleForm.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}
                        onChange={(e) => setRoleForm({ ...roleForm, slug: e.target.value })}
                        placeholder="e.g., assistant_manager"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder="Describe this role's responsibilities..."
                        rows={3}
                        className="w-full px-3 py-2 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Hierarchy Level
                        </label>
                        <Input
                          type="number"
                          value={roleForm.hierarchy_level}
                          onChange={(e) => setRoleForm({ ...roleForm, hierarchy_level: parseInt(e.target.value) || 100 })}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-400 mt-1">Lower = more access (0 = Owner, 100 = Employee)</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={roleForm.color}
                            onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                            className="w-12 h-10 rounded border border-gray-200 dark:border-white/[0.06] cursor-pointer"
                          />
                          <Input
                            value={roleForm.color}
                            onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                            placeholder="#6B7280"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {role && role.is_system_role && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-400">
                          This is a system role. It cannot be deleted, but permissions can be customized.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Permissions Matrix */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions</h3>
                    
                    {Object.entries(permissionsByArea).map(([area, areaPermissions]) => (
                      <div key={area} className="border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-white/[0.02] px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">{area}</h4>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                          {areaPermissions.map((permission) => {
                            const assignment = permissionAssignments.get(permission.id);
                            const isEnabled = assignment?.enabled || false;
                            
                            return (
                              <div
                                key={permission.id}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={() => togglePermission(permission.id)}
                                      className="w-4 h-4 rounded border-gray-300 dark:border-white/[0.2] bg-white dark:bg-white/[0.05] text-[#EC4899] focus:ring-[#EC4899]/50"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {permission.name}
                                        </p>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs border ${getSensitivityColor(permission.sensitivity)}`}
                                        >
                                          {permission.sensitivity}
                                        </span>
                                      </div>
                                      {permission.description && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          {permission.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isEnabled && permission.supports_scope && (
                                    <select
                                      value={assignment?.scope || 'self'}
                                      onChange={(e) => updatePermissionScope(permission.id, e.target.value as PermissionScope)}
                                      className="ml-4 px-3 py-1.5 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {SCOPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-50 dark:bg-[#0B0D13] text-gray-900 dark:text-white">
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-12 text-center">
              <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Select a role to view and edit permissions</p>
              <p className="text-sm text-gray-500">
                Or create a new custom role to match your organization's needs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-50 dark:bg-[#0B0D13] border border-gray-200 dark:border-white/[0.06] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Role</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this role? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleDeleteRole(showDeleteConfirm)}
                className="flex-1 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
              >
                Delete
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border-white/12 text-gray-300 hover:bg-white/[0.08]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

