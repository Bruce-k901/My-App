'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Type, Zap, Contrast } from '@/components/ui/icons';
import type { FontSizePreference, ContrastMode } from '@/types/user-preferences';

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

export function AccessibilityTab() {
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <div className="space-y-8">
      {/* Font Size */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
          <Type className="w-5 h-5 text-[#D37E91]" />
          Font Size
        </h3>
        <p className="text-sm text-neutral-500 dark:text-white/50 mb-4">
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
                    : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
                  }`}
              >
                <span className={`font-medium ${selected ? 'text-[#D37E91]' : 'text-neutral-700 dark:text-white/80'}`}>
                  {label}
                </span>
                <span className={`${sampleSize} text-neutral-500 dark:text-white/50`}>
                  Preview text
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reduce Animations */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#D37E91]" />
          Reduce Animations
        </h3>
        <p className="text-sm text-neutral-500 dark:text-white/50 mb-4">
          Minimise motion across the app. Also respects your OS "reduce motion" setting.
        </p>
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">Reduce Animations</p>
            <p className="text-sm text-neutral-500 dark:text-white/50">Disable transitions and motion effects</p>
          </div>
          <ToggleSwitch
            checked={preferences.reduce_animations ?? false}
            onChange={() => updatePreference('reduce_animations', !(preferences.reduce_animations ?? false))}
          />
        </div>
      </div>

      {/* High Contrast */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
          <Contrast className="w-5 h-5 text-[#D37E91]" />
          High Contrast
        </h3>
        <p className="text-sm text-neutral-500 dark:text-white/50 mb-4">
          Increase text and border contrast. Useful in bright environments like kitchens or warehouses.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updatePreference('high_contrast', 'normal')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
              ${(preferences.high_contrast ?? 'normal') === 'normal'
                ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
                : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
              }`}
          >
            <span className={`text-sm font-medium ${(preferences.high_contrast ?? 'normal') === 'normal' ? 'text-[#D37E91]' : 'text-neutral-700 dark:text-white/80'}`}>
              Normal
            </span>
            <span className="text-xs text-neutral-500 dark:text-white/40">Standard contrast</span>
          </button>
          <button
            onClick={() => updatePreference('high_contrast', 'high')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
              ${preferences.high_contrast === 'high'
                ? 'border-[#D37E91] bg-[#D37E91]/15 ring-1 ring-[#D37E91]/30'
                : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.15]'
              }`}
          >
            <span className={`text-sm font-medium ${preferences.high_contrast === 'high' ? 'text-[#D37E91]' : 'text-neutral-700 dark:text-white/80'}`}>
              High
            </span>
            <span className="text-xs text-neutral-500 dark:text-white/40">Enhanced readability</span>
          </button>
        </div>
      </div>
    </div>
  );
}
