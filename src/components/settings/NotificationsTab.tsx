'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Bell, BellOff, Clock, Mail, Smartphone, Monitor } from '@/components/ui/icons';
import type { NotificationChannelPrefs, QuietHours } from '@/types/user-preferences';
import { NOTIFICATION_TYPE_LABELS } from '@/types/user-preferences';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-neutral-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D37E91] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D37E91]" />
    </label>
  );
}

function ChannelCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[#D37E91] focus:ring-[#D37E91] bg-transparent"
      />
      <span className="text-sm text-theme-secondary/70">{label}</span>
    </label>
  );
}

export function NotificationsTab() {
  const { preferences, updatePreferences, updatePreference } = useUserPreferences();

  const notifications = preferences.notifications ?? {};
  const quietHours = preferences.quiet_hours ?? { enabled: false, start: '22:00', end: '07:00' };

  const updateNotification = (
    type: string,
    channel: keyof NotificationChannelPrefs,
    value: boolean,
  ) => {
    const current = notifications[type as keyof typeof notifications] ?? {
      in_app: true,
      email: false,
      push: false,
    };
    updatePreferences({
      notifications: {
        ...notifications,
        [type]: { ...current, [channel]: value },
      },
    });
  };

  const updateQuietHours = (updates: Partial<QuietHours>) => {
    updatePreference('quiet_hours', { ...quietHours, ...updates });
  };

  const notifTypes = Object.keys(NOTIFICATION_TYPE_LABELS);

  return (
    <div className="space-y-8">
      {/* Notification Channel Matrix */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Notification Channels</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Choose how you want to be notified for each event type.
        </p>

        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px] gap-2 px-4 pb-2 text-xs font-medium text-theme-tertiary/40 uppercase tracking-wider">
          <span>Event</span>
          <span className="text-center flex items-center justify-center gap-1">
            <Monitor className="w-3.5 h-3.5" /> In-App
          </span>
          <span className="text-center flex items-center justify-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Email
          </span>
          <span className="text-center flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> Push
          </span>
        </div>

        <div className="space-y-2">
          {notifTypes.map((type) => {
            const meta = NOTIFICATION_TYPE_LABELS[type];
            const prefs = notifications[type as keyof typeof notifications] ?? {
              in_app: true,
              email: false,
              push: false,
            };
            return (
              <div
                key={type}
                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_80px] gap-2 sm:gap-2 items-center p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme"
              >
                <div>
                  <p className="font-medium text-sm text-theme-primary">{meta.label}</p>
                  <p className="text-xs text-theme-tertiary/40">{meta.description}</p>
                </div>

                {/* Mobile: horizontal row of labelled checkboxes */}
                <div className="flex sm:hidden gap-4 mt-2">
                  <ChannelCheckbox
                    checked={prefs.in_app}
                    onChange={(v) => updateNotification(type, 'in_app', v)}
                    label="In-App"
                  />
                  <ChannelCheckbox
                    checked={prefs.email}
                    onChange={(v) => updateNotification(type, 'email', v)}
                    label="Email"
                  />
                  <ChannelCheckbox
                    checked={prefs.push}
                    onChange={(v) => updateNotification(type, 'push', v)}
                    label="Push"
                  />
                </div>

                {/* Desktop: centred checkboxes */}
                <div className="hidden sm:flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs.in_app}
                    onChange={(e) => updateNotification(type, 'in_app', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[#D37E91] focus:ring-[#D37E91] bg-transparent"
                  />
                </div>
                <div className="hidden sm:flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs.email}
                    onChange={(e) => updateNotification(type, 'email', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[#D37E91] focus:ring-[#D37E91] bg-transparent"
                  />
                </div>
                <div className="hidden sm:flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs.push}
                    onChange={(e) => updateNotification(type, 'push', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[#D37E91] focus:ring-[#D37E91] bg-transparent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1 flex items-center gap-2">
          <BellOff className="w-5 h-5 text-[#D37E91]" />
          Quiet Hours
        </h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Suppress all sounds and pop-up notifications during these hours.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
            <div>
              <p className="font-medium text-theme-primary">Enable Quiet Hours</p>
              <p className="text-sm text-theme-tertiary/50">No alerts between the set times</p>
            </div>
            <ToggleSwitch
              checked={quietHours.enabled}
              onChange={() => updateQuietHours({ enabled: !quietHours.enabled })}
            />
          </div>

          {quietHours.enabled && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
              <Clock className="w-5 h-5 text-theme-tertiary flex-shrink-0" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-theme-secondary/60">From</label>
                <input
                  type="time"
                  value={quietHours.start}
                  onChange={(e) => updateQuietHours({ start: e.target.value })}
                  className="text-sm rounded-lg px-3 py-2 bg-white dark:bg-white/[0.06] border border-theme text-theme-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-theme-secondary/60">To</label>
                <input
                  type="time"
                  value={quietHours.end}
                  onChange={(e) => updateQuietHours({ end: e.target.value })}
                  className="text-sm rounded-lg px-3 py-2 bg-white dark:bg-white/[0.06] border border-theme text-theme-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digest Mode */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Digest Preference</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          How you want to receive notification summaries.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updatePreference('digest_mode', 'realtime')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
              ${preferences.digest_mode === 'realtime'
                ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
                : 'border-theme bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
              }`}
          >
            <Bell className={`w-6 h-6 ${preferences.digest_mode === 'realtime' ? 'text-[#D37E91]' : 'text-theme-tertiary/50'}`} />
            <span className={`text-sm font-medium ${preferences.digest_mode === 'realtime' ? 'text-[#D37E91]' : 'text-theme-secondary'}`}>Real-time</span>
            <span className="text-xs text-theme-tertiary/40">Get alerts as they happen</span>
          </button>
          <button
            onClick={() => updatePreference('digest_mode', 'daily')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
              ${preferences.digest_mode === 'daily'
                ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
                : 'border-theme bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
              }`}
          >
            <Mail className={`w-6 h-6 ${preferences.digest_mode === 'daily' ? 'text-[#D37E91]' : 'text-theme-tertiary/50'}`} />
            <span className={`text-sm font-medium ${preferences.digest_mode === 'daily' ? 'text-[#D37E91]' : 'text-theme-secondary'}`}>Daily Digest</span>
            <span className="text-xs text-theme-tertiary/40">Summary email each morning</span>
          </button>
        </div>
      </div>

      {/* Sound & Vibration */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Sound & Vibration</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Control in-app alert sounds and haptic feedback.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
            <div>
              <p className="font-medium text-theme-primary">Sound Alerts</p>
              <p className="text-sm text-theme-tertiary/50">Play sounds for tasks and messages</p>
            </div>
            <ToggleSwitch
              checked={preferences.sound_enabled ?? true}
              onChange={() => updatePreference('sound_enabled', !(preferences.sound_enabled ?? true))}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
            <div>
              <p className="font-medium text-theme-primary">Vibration</p>
              <p className="text-sm text-theme-tertiary/50">Vibrate on alerts (Android only)</p>
            </div>
            <ToggleSwitch
              checked={preferences.vibration_enabled ?? true}
              onChange={() => updatePreference('vibration_enabled', !(preferences.vibration_enabled ?? true))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
