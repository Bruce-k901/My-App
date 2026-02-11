'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNotificationTypes, useNotificationSettings, useUpdateNotificationSetting } from '@/hooks/use-notification-settings';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { toast } from 'sonner';
import { Bell, Save, ArrowLeft, Mail, Smartphone, MessageSquare } from '@/components/ui/icons';
import Link from 'next/link';
import { NotificationCategory, NotificationSetting, NotificationType } from '@/types/teamly-settings';

export default function NotificationsPage() {
  const { companyId } = useAppContext();
  const { data: notificationTypes = [], isLoading: typesLoading } = useNotificationTypes();
  const { data: settings = [], isLoading: settingsLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSetting();
  
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all');
  const [hasChanges, setHasChanges] = useState(false);

  // Group notification types by category
  const groupedTypes = useMemo(() => {
    const groups: Record<string, NotificationType[]> = {
      all: notificationTypes,
      shifts: [],
      approvals: [],
      deadlines: [],
      compliance: [],
    };

    notificationTypes.forEach(type => {
      groups[type.category].push(type);
    });

    return groups;
  }, [notificationTypes]);

  // Get setting for a notification type, or return default
  const getSetting = (typeId: string): Partial<NotificationSetting> => {
    const existing = settings.find(s => s.notification_type === typeId);
    const type = notificationTypes.find(t => t.id === typeId);
    
    if (existing) {
      return existing;
    }
    
    // Return default from type
    return {
      notification_type: typeId,
      company_id: companyId || '',
      enabled: type?.default_enabled ?? true,
      channels: type?.default_channels ?? { in_app: true, email: false, push: false },
      timing_config: type?.default_timing ?? {},
      recipient_roles: type?.default_recipients ?? [],
    };
  };

  // Update a setting
  const updateSetting = async (typeId: string, updates: Partial<NotificationSetting>) => {
    if (!companyId) {
      toast.error('No company ID found');
      return;
    }

    const current = getSetting(typeId);
    const newSetting = {
      ...current,
      ...updates,
      company_id: companyId,
      notification_type: typeId,
    };

    try {
      await updateMutation.mutateAsync(newSetting as Partial<NotificationSetting> & { 
        company_id: string; 
        notification_type: string;
      });
      setHasChanges(false);
      toast.success('Notification setting updated');
    } catch (error: any) {
      console.error('Error updating notification setting:', error);
      toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
    }
  };

  // Toggle notification enabled/disabled
  const toggleEnabled = (typeId: string) => {
    const current = getSetting(typeId);
    updateSetting(typeId, { enabled: !current.enabled });
    setHasChanges(true);
  };

  // Toggle channel
  const toggleChannel = (typeId: string, channel: 'in_app' | 'email' | 'push') => {
    const current = getSetting(typeId);
    const channels = current.channels || { in_app: true, email: false, push: false };
    updateSetting(typeId, {
      channels: {
        ...channels,
        [channel]: !channels[channel],
      },
    });
    setHasChanges(true);
  };

  // Update timing config
  const updateTiming = (typeId: string, key: string, value: number) => {
    const current = getSetting(typeId);
    const timing = current.timing_config || {};
    updateSetting(typeId, {
      timing_config: {
        ...timing,
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  const categories: Array<{ id: NotificationCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Notifications' },
    { id: 'shifts', label: 'Shifts' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'deadlines', label: 'Deadlines' },
    { id: 'compliance', label: 'Compliance' },
  ];

  const displayTypes = activeCategory === 'all' 
    ? groupedTypes.all 
    : groupedTypes[activeCategory];

  if (typesLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-900 dark:text-white/60">Loading notification settings...</p>
        </div>
      </div>
    );
  }

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
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Notification Settings
          </h1>
          <p className="text-gray-500 dark:text-white/60">
            Configure alerts for shifts, approvals, and deadlines
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-white/[0.1] overflow-x-auto">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          const count = category.id === 'all' 
            ? groupedTypes.all.length 
            : groupedTypes[category.id].length;
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2
                ${isActive
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/80"
                }
              `}
            >
              {category.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-white/10 text-gray-900 dark:text-white/60'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification Settings List */}
      <div className="space-y-4">
        {displayTypes.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-gray-900 dark:text-white/60">No notifications in this category</p>
          </div>
        ) : (
          displayTypes.map((type) => {
            const setting = getSetting(type.id);
            const hasTiming = Object.keys(setting.timing_config || {}).length > 0;

            return (
              <div
                key={type.id}
                className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{type.name}</h3>
                      <Switch
                        checked={setting.enabled ?? true}
                        onChange={() => toggleEnabled(type.id)}
                      />
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-900 dark:text-white/60">{type.description}</p>
                    )}
                  </div>
                </div>

                {setting.enabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                    {/* Delivery Channels */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-800 dark:text-white/80 mb-3">
                        Delivery Channels
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-900 dark:text-white/60" />
                            <span className="text-sm text-gray-900 dark:text-white">In-App</span>
                          </div>
                          <Switch
                            checked={setting.channels?.in_app ?? true}
                            onChange={() => toggleChannel(type.id, 'in_app')}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-900 dark:text-white/60" />
                            <span className="text-sm text-gray-900 dark:text-white">Email</span>
                          </div>
                          <Switch
                            checked={setting.channels?.email ?? false}
                            onChange={() => toggleChannel(type.id, 'email')}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-gray-900 dark:text-white/60" />
                            <span className="text-sm text-gray-900 dark:text-white">Push</span>
                          </div>
                          <Switch
                            checked={setting.channels?.push ?? false}
                            onChange={() => toggleChannel(type.id, 'push')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timing Configuration */}
                    {hasTiming && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-800 dark:text-white/80 mb-3">
                          Timing Configuration
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(setting.timing_config || {}).map(([key, value]) => {
                            const label = key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase());
                            
                            return (
                              <div key={key}>
                                <label className="block text-xs text-gray-900 dark:text-white/60 mb-1">
                                  {label}
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={typeof value === 'number' ? value : 0}
                                  onChange={(e) => updateTiming(type.id, key, parseInt(e.target.value) || 0)}
                                  placeholder="0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

