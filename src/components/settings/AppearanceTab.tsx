'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Sun, Moon, Monitor, Columns2, Columns3, PanelLeft, PanelLeftClose, Type, Zap, Contrast } from '@/components/ui/icons';
import type { DateFormatOption, TimeFormatOption, FontSizePreference, ContrastMode } from '@/types/user-preferences';
import { LANDING_PAGE_OPTIONS } from '@/types/user-preferences';

function OptionCard({
  selected,
  onClick,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
        ${selected
          ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
          : 'border-theme bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
        }`}
    >
      <div className={`${selected ? 'text-[#D37E91]' : 'text-theme-tertiary/50'}`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${selected ? 'text-[#D37E91]' : 'text-theme-secondary'}`}>
        {label}
      </span>
      {description && (
        <span className="text-xs text-theme-tertiary/40">{description}</span>
      )}
    </button>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-theme-primary">{label}</p>
        {description && (
          <p className="text-sm text-theme-tertiary/50 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-neutral-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D37E91] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D37E91]" />
    </label>
  );
}

const FONT_SIZE_OPTIONS: { value: FontSizePreference; label: string; sampleSize: string }[] = [
  { value: 'small',  label: 'Small',  sampleSize: 'text-[13px]' },
  { value: 'medium', label: 'Medium', sampleSize: 'text-[14px]' },
  { value: 'large',  label: 'Large',  sampleSize: 'text-[16px]' },
];

export function AppearanceTab() {
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Theme</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">Choose your preferred colour scheme.</p>
        <div className="grid grid-cols-3 gap-3">
          <OptionCard
            selected={preferences.theme === 'light'}
            onClick={() => updatePreference('theme', 'light')}
            icon={<Sun className="w-6 h-6" />}
            label="Light"
          />
          <OptionCard
            selected={preferences.theme === 'dark'}
            onClick={() => updatePreference('theme', 'dark')}
            icon={<Moon className="w-6 h-6" />}
            label="Dark"
          />
          <OptionCard
            selected={preferences.theme === 'system'}
            onClick={() => updatePreference('theme', 'system')}
            icon={<Monitor className="w-6 h-6" />}
            label="System"
            description="Follows your OS"
          />
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1 flex items-center gap-2">
          <Type className="w-5 h-5 text-[#D37E91]" />
          Font Size
        </h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Adjust the base font size across the entire app.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZE_OPTIONS.map(({ value, label, sampleSize }) => {
            const selected = (preferences.font_size ?? 'medium') === value;
            return (
              <button
                key={value}
                onClick={() => updatePreference('font_size', value)}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all
                  ${selected
                    ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
                    : 'border-theme bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
                  }`}
              >
                <span className={`font-medium ${selected ? 'text-[#D37E91]' : 'text-theme-secondary'}`}>
                  {label}
                </span>
                <span className={`${sampleSize} text-theme-tertiary/50`}>
                  Preview text
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Display Density</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">Adjust spacing and padding across the app.</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            selected={preferences.density === 'comfortable'}
            onClick={() => updatePreference('density', 'comfortable')}
            icon={<Columns2 className="w-6 h-6" />}
            label="Comfortable"
            description="More spacing, larger touch targets"
          />
          <OptionCard
            selected={preferences.density === 'compact'}
            onClick={() => updatePreference('density', 'compact')}
            icon={<Columns3 className="w-6 h-6" />}
            label="Compact"
            description="See more data at once"
          />
        </div>
      </div>

      {/* High Contrast */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1 flex items-center gap-2">
          <Contrast className="w-5 h-5 text-[#D37E91]" />
          High Contrast
        </h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Increase text and border contrast. Useful in bright environments like kitchens or warehouses.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            selected={(preferences.high_contrast ?? 'normal') === 'normal'}
            onClick={() => updatePreference('high_contrast', 'normal')}
            icon={<Contrast className="w-6 h-6" />}
            label="Normal"
            description="Standard contrast"
          />
          <OptionCard
            selected={preferences.high_contrast === 'high'}
            onClick={() => updatePreference('high_contrast', 'high')}
            icon={<Contrast className="w-6 h-6" />}
            label="High"
            description="Enhanced readability"
          />
        </div>
      </div>

      {/* Reduce Animations */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#D37E91]" />
          Reduce Animations
        </h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Minimise motion across the app. Also respects your OS &quot;reduce motion&quot; setting.
        </p>
        <SettingsRow
          label="Reduce Animations"
          description="Disable transitions and motion effects"
        >
          <ToggleSwitch
            checked={preferences.reduce_animations ?? false}
            onChange={() => updatePreference('reduce_animations', !(preferences.reduce_animations ?? false))}
          />
        </SettingsRow>
      </div>

      {/* Sidebar */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Sidebar</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">How the main sidebar appears on desktop.</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            selected={preferences.sidebar_mode === 'collapsed'}
            onClick={() => updatePreference('sidebar_mode', 'collapsed')}
            icon={<PanelLeftClose className="w-6 h-6" />}
            label="Collapsed"
            description="Icons only"
          />
          <OptionCard
            selected={preferences.sidebar_mode === 'expanded'}
            onClick={() => updatePreference('sidebar_mode', 'expanded')}
            icon={<PanelLeft className="w-6 h-6" />}
            label="Expanded"
            description="Icons with labels"
          />
        </div>
      </div>

      {/* Landing Page */}
      <SettingsRow
        label="Default Landing Page"
        description="Where you go after logging in"
      >
        <select
          value={preferences.landing_page || '/dashboard'}
          onChange={(e) => updatePreference('landing_page', e.target.value)}
          className="text-sm rounded-lg px-3 py-2 min-w-[160px]"
        >
          {LANDING_PAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </SettingsRow>

      {/* Date/Time Format */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Date & Time Format</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">Override company defaults for your account.</p>
        <div className="space-y-3">
          <SettingsRow label="Date Format">
            <select
              value={preferences.date_format ?? ''}
              onChange={(e) =>
                updatePreference('date_format', (e.target.value || null) as DateFormatOption | null)
              }
              className="text-sm rounded-lg px-3 py-2 min-w-[160px]"
            >
              <option value="">Company default</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </SettingsRow>

          <SettingsRow label="Time Format">
            <select
              value={preferences.time_format ?? ''}
              onChange={(e) =>
                updatePreference('time_format', (e.target.value || null) as TimeFormatOption | null)
              }
              className="text-sm rounded-lg px-3 py-2 min-w-[160px]"
            >
              <option value="">Company default</option>
              <option value="24h">24-hour (14:30)</option>
              <option value="12h">12-hour (2:30 PM)</option>
            </select>
          </SettingsRow>
        </div>
      </div>

    </div>
  );
}
