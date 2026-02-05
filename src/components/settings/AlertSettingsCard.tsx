'use client';

import { useAlerts, AlertSettings } from '@/hooks/useAlerts';
import { Bell, Volume2, Vibrate, Clock, MessageSquare } from 'lucide-react';

/**
 * AlertSettingsCard - A reusable component for managing in-app alert preferences
 *
 * Includes toggles for:
 * - Sound alerts (works on all platforms)
 * - Vibration (Android only - iOS blocks web vibration API)
 * - Task reminders (alerts when tasks are due/overdue)
 * - Message alerts (alerts for new messages)
 *
 * Settings are persisted to localStorage and can optionally sync with the database.
 */
export function AlertSettingsCard() {
  const { settings, updateSettings } = useAlerts();

  const toggleSetting = (key: keyof AlertSettings) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="bg-white/[0.03] dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] rounded-xl p-6">
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
        <Bell className="w-5 h-5 text-pink-400" />
        In-App Alerts
      </h2>
      <p className="text-sm text-neutral-500 dark:text-white/50 mb-6">
        Configure sound and vibration alerts when the app is open.
        <span className="block mt-1 text-amber-600 dark:text-amber-400 text-xs">
          Note: Vibration only works on Android devices - iOS does not support web vibration.
        </span>
      </p>

      <div className="space-y-4">
        {/* Sound Alerts */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.05]">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">Sound Alerts</p>
              <p className="text-sm text-neutral-500 dark:text-white/60 mt-1">
                Play sounds for tasks and messages
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.soundsEnabled}
            onChange={() => toggleSetting('soundsEnabled')}
          />
        </div>

        {/* Vibration */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.05]">
          <div className="flex items-start gap-3">
            <Vibrate className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">Vibration</p>
              <p className="text-sm text-neutral-500 dark:text-white/60 mt-1">
                Vibrate on alerts (Android only)
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.vibrationEnabled}
            onChange={() => toggleSetting('vibrationEnabled')}
          />
        </div>

        {/* Task Reminders */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.05]">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">Task Reminders</p>
              <p className="text-sm text-neutral-500 dark:text-white/60 mt-1">
                Alert when tasks become due or overdue
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.taskRemindersEnabled}
            onChange={() => toggleSetting('taskRemindersEnabled')}
          />
        </div>

        {/* Message Alerts */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.05]">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-pink-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">Message Alerts</p>
              <p className="text-sm text-neutral-500 dark:text-white/60 mt-1">
                Alert for new messages (Msgly)
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.messagesEnabled}
            onChange={() => toggleSetting('messagesEnabled')}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400 dark:text-white/40 mt-4">
        Settings are saved automatically and apply immediately.
      </p>
    </div>
  );
}

// Simple toggle switch component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-neutral-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
    </label>
  );
}

export default AlertSettingsCard;
