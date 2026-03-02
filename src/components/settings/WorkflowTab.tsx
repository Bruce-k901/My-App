'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useSiteContext } from '@/contexts/SiteContext';
import { MapPin, Table2, LayoutGrid, Hash, Save } from '@/components/ui/icons';
import type { ItemsPerPage } from '@/types/user-preferences';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-neutral-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D37E91] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D37E91]" />
    </label>
  );
}

function SettingsRow({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && <div className="text-theme-tertiary mt-0.5 flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-theme-primary">{label}</p>
          {description && (
            <p className="text-sm text-theme-tertiary/50 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

const VIEW_SECTIONS = [
  { key: 'stock-items', label: 'Stock Items' },
  { key: 'assets', label: 'Assets' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'documents', label: 'Documents' },
  { key: 'staff', label: 'Staff' },
];

export function WorkflowTab() {
  const { preferences, updatePreference, updatePreferences } = useUserPreferences();

  // Try to get sites; if context unavailable, show nothing for site picker
  let sites: { id: string; name: string }[] = [];
  let hasSiteContext = false;
  try {
    const ctx = useSiteContext();
    sites = ctx.accessibleSites || [];
    hasSiteContext = true;
  } catch {
    // SiteContext not available
  }

  const showSitePicker = hasSiteContext && sites.length > 1;

  const defaultViews = preferences.default_views ?? {};

  const setViewForSection = (sectionKey: string, view: 'table' | 'card') => {
    updatePreference('default_views', { ...defaultViews, [sectionKey]: view });
  };

  return (
    <div className="space-y-8">
      {/* Default Site */}
      {showSitePicker && (
        <div>
          <h3 className="text-lg font-semibold text-theme-primary mb-1">Default Site</h3>
          <p className="text-sm text-theme-tertiary/50 mb-4">
            Which site is pre-selected when you open the app.
          </p>
          <SettingsRow
            label="Site"
            description="Applies on next login"
            icon={<MapPin className="w-5 h-5" />}
          >
            <select
              value={preferences.default_site_id ?? ''}
              onChange={(e) => updatePreference('default_site_id', e.target.value || null)}
              className="text-sm rounded-lg px-3 py-2 min-w-[180px]"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </SettingsRow>
        </div>
      )}

      {/* Default Views */}
      <div>
        <h3 className="text-lg font-semibold text-theme-primary mb-1">Default Views</h3>
        <p className="text-sm text-theme-tertiary/50 mb-4">
          Choose table or card layout for each section.
        </p>
        <div className="space-y-2">
          {VIEW_SECTIONS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-theme"
            >
              <span className="text-sm font-medium text-theme-primary">{label}</span>
              <div className="flex rounded-lg overflow-hidden border border-theme">
                <button
                  onClick={() => setViewForSection(key, 'table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors
                    ${(defaultViews[key] ?? 'table') === 'table'
                      ? 'bg-[#D37E91]/20 text-[#D37E91] font-medium'
                      : 'text-theme-tertiary/50 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                    }`}
                >
                  <Table2 className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewForSection(key, 'card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-theme
                    ${defaultViews[key] === 'card'
                      ? 'bg-[#D37E91]/20 text-[#D37E91] font-medium'
                      : 'text-theme-tertiary/50 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                    }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items Per Page */}
      <SettingsRow
        label="Items Per Page"
        description="Default row count for tables"
        icon={<Hash className="w-5 h-5" />}
      >
        <select
          value={preferences.items_per_page ?? 25}
          onChange={(e) => updatePreference('items_per_page', Number(e.target.value) as ItemsPerPage)}
          className="text-sm rounded-lg px-3 py-2 min-w-[100px]"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </SettingsRow>

      {/* Auto-save */}
      <SettingsRow
        label="Auto-Save Drafts"
        description="Automatically save form drafts as you type"
        icon={<Save className="w-5 h-5" />}
      >
        <ToggleSwitch
          checked={preferences.auto_save_drafts ?? true}
          onChange={() => updatePreference('auto_save_drafts', !(preferences.auto_save_drafts ?? true))}
        />
      </SettingsRow>
    </div>
  );
}
