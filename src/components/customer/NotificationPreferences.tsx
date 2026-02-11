'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface NotificationPreferences {
  id?: string;
  customer_id: string;
  email_enabled: boolean;
  notify_on_auto_generation: boolean;
  notify_on_confirmation: boolean;
  notify_on_delivery_day: boolean;
}

interface Props {
  customerId: string;
}

export function NotificationPreferences({ customerId }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    customer_id: customerId,
    email_enabled: true,
    notify_on_auto_generation: true,
    notify_on_confirmation: true,
    notify_on_delivery_day: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/planly/notifications/preferences?customer_id=${customerId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setPreferences(data.preferences);
          }
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [customerId]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/planly/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h3>
      </div>

      <div className="space-y-4">
        {/* Email Enabled */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={(e) =>
                setPreferences({ ...preferences, email_enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 flex items-center justify-center transition-colors">
              {preferences.email_enabled && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Enable email notifications
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Receive email updates about your orders
            </div>
          </div>
        </label>

        {/* Auto-generation notifications */}
        <label
          className={`flex items-start gap-3 cursor-pointer group ${
            !preferences.email_enabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={preferences.notify_on_auto_generation}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  notify_on_auto_generation: e.target.checked,
                })
              }
              disabled={!preferences.email_enabled}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 flex items-center justify-center transition-colors">
              {preferences.notify_on_auto_generation && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Standing order notifications
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Get notified when orders are automatically generated from your standing order
            </div>
          </div>
        </label>

        {/* Order confirmation notifications */}
        <label
          className={`flex items-start gap-3 cursor-pointer group ${
            !preferences.email_enabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={preferences.notify_on_confirmation}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  notify_on_confirmation: e.target.checked,
                })
              }
              disabled={!preferences.email_enabled}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 flex items-center justify-center transition-colors">
              {preferences.notify_on_confirmation && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Order confirmations
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Receive confirmation emails when orders are confirmed
            </div>
          </div>
        </label>

        {/* Delivery day reminders */}
        <label
          className={`flex items-start gap-3 cursor-pointer group ${
            !preferences.email_enabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={preferences.notify_on_delivery_day}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  notify_on_delivery_day: e.target.checked,
                })
              }
              disabled={!preferences.email_enabled}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 flex items-center justify-center transition-colors">
              {preferences.notify_on_delivery_day && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Delivery reminders
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Get reminded about upcoming deliveries
            </div>
          </div>
        </label>
      </div>

      <div className="pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
