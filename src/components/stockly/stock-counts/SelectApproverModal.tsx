'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle2, Bell, MessageSquare, Calendar, Building2, MapPin, Users, Crown } from 'lucide-react';

interface Approver {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface SelectApproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (approver: Approver) => void;
  countId: string;
  countName?: string;
}

export default function SelectApproverModal({
  isOpen,
  onClose,
  onSelect,
  countId,
  countName,
}: SelectApproverModalProps) {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(null);

  useEffect(() => {
    if (isOpen && countId) {
      loadApprovers();
    } else {
      setApprovers([]);
      setSelectedApprover(null);
    }
  }, [isOpen, countId]);

  const loadApprovers = async () => {
    setLoading(true);
    try {
      console.log('🔍 SelectApproverModal: Loading approvers for count:', countId);
      const response = await fetch(`/api/stock-counts/get-available-approvers/${countId}`);
      
      if (!response.ok) {
        console.error('❌ API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return;
      }
      
      const data = await response.json();
      console.log('📊 SelectApproverModal: API response:', data);

      if (data.success && data.approvers) {
        console.log(`✅ SelectApproverModal: Found ${data.approvers.length} approver(s):`, data.approvers);
        setApprovers(data.approvers);
      } else {
        console.error('❌ SelectApproverModal: Failed to load approvers:', data.error || 'Unknown error');
        console.error('Full response:', data);
        if (data.debug) {
          console.error('🔍 Debug info:', data.debug);
          if (data.debug.diagnostic) {
            console.error('📊 Diagnostic results:', data.debug.diagnostic);
            console.error('📋 Profiles found:', data.debug.diagnostic.profiles);
            console.error('🏢 Site data:', data.debug.diagnostic.siteData);
            console.error('👥 Managers found:', data.debug.diagnostic.managers);
            console.error('🏷️ Unique roles in company:', data.debug.diagnostic.uniqueRolesInCompany);
          }
        }
        setApprovers([]);
      }
    } catch (error) {
      console.error('❌ SelectApproverModal: Error loading approvers:', error);
      setApprovers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedApprover) {
      onSelect(selectedApprover);
      onClose();
    }
  };

  // Group approvers by org chart level
  const groupedApprovers = useMemo(() => {
    const groups: Record<string, Approver[]> = {
      'Executive': [],
      'Regional': [],
      'Area': [],
      'Site': [],
      'Other': [],
    };

    approvers.forEach(approver => {
      const role = approver.role.toLowerCase();
      if (role.includes('owner') || role.includes('admin') || role.includes('super admin')) {
        groups['Executive'].push(approver);
      } else if (role.includes('regional')) {
        groups['Regional'].push(approver);
      } else if (role.includes('area')) {
        groups['Area'].push(approver);
      } else if (role.includes('site') || role.includes('manager') && !role.includes('area') && !role.includes('regional')) {
        groups['Site'].push(approver);
      } else {
        groups['Other'].push(approver);
      }
    });

    return groups;
  }, [approvers]);

  // Get recommended approver (first in hierarchy: Site > Area > Regional > Executive)
  const recommendedApprover = useMemo(() => {
    if (groupedApprovers['Site'].length > 0) return groupedApprovers['Site'][0];
    if (groupedApprovers['Area'].length > 0) return groupedApprovers['Area'][0];
    if (groupedApprovers['Regional'].length > 0) return groupedApprovers['Regional'][0];
    if (groupedApprovers['Executive'].length > 0) return groupedApprovers['Executive'][0];
    return approvers[0] || null;
  }, [groupedApprovers, approvers]);

  const getRoleBadgeColor = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('owner') || roleLower.includes('admin') || roleLower.includes('super admin')) {
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-600/30';
    }
    if (roleLower.includes('regional')) {
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-600/30';
    }
    if (roleLower.includes('area')) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-600/30';
    }
    if (roleLower.includes('site') || (roleLower.includes('manager') && !roleLower.includes('area') && !roleLower.includes('regional'))) {
      return 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-600/30';
    }
    return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600/30';
  };

  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('owner') || roleLower.includes('admin')) {
      return Crown;
    }
    if (roleLower.includes('regional')) {
      return MapPin;
    }
    if (roleLower.includes('area')) {
      return Building2;
    }
    if (roleLower.includes('site') || roleLower.includes('manager')) {
      return Users;
    }
    return Users;
  };

  const getGroupTitle = (group: string) => {
    switch (group) {
      case 'Executive': return 'Executive Leadership';
      case 'Regional': return 'Regional Managers';
      case 'Area': return 'Area Managers';
      case 'Site': return 'Site Managers';
      default: return 'Other Approvers';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0f1220] border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold">
            Select Approver for Stock Count
          </DialogTitle>
          {countName && (
            <p className="text-sm text-gray-400 mt-1">{countName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading approvers...</span>
            </div>
          ) : approvers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No approvers found. Please ensure managers are assigned in your organization structure.
              </p>
            </div>
          ) : (
            <>
              {/* Group approvers by org chart hierarchy */}
              <div className="space-y-4">
                {(['Executive', 'Regional', 'Area', 'Site', 'Other'] as const).map((group) => {
                  if (groupedApprovers[group].length === 0) return null;
                  
                  const GroupIcon = group === 'Executive' ? Crown : 
                                   group === 'Regional' ? MapPin :
                                   group === 'Area' ? Building2 : Users;
                  
                  return (
                    <div key={group} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <GroupIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {getGroupTitle(group)}
                        </h3>
                      </div>
                      {groupedApprovers[group].map((approver) => {
                        const isRecommended = recommendedApprover?.id === approver.id;
                        const RoleIcon = getRoleIcon(approver.role);
                        
                        return (
                          <button
                            key={approver.id}
                            onClick={() => setSelectedApprover(approver)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left relative ${
                              selectedApprover?.id === approver.id
                                ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : isRecommended
                                ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 hover:border-blue-400 dark:hover:border-blue-500'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            {isRecommended && !selectedApprover && (
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-600/30">
                                  Recommended
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <RoleIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {approver.name}
                                  </h3>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(approver.role)}`}>
                                    {approver.role}
                                  </span>
                                </div>
                                {approver.email && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">{approver.email}</p>
                                )}
                              </div>
                              {selectedApprover?.id === approver.id && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {selectedApprover && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/30 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                    {selectedApprover.name} will receive:
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                    <li className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span>In-app notification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Msgly message (from Opsly System)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Calendar task</span>
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedApprover}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select {selectedApprover ? selectedApprover.name : 'Approver'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
