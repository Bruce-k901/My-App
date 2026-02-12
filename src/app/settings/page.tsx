'use client';

import { useState } from 'react';
import { Palette, Bell, Workflow, Accessibility } from '@/components/ui/icons';
import { PWAInstallSection } from '@/components/pwa/PWAInstallSection';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { WorkflowTab } from '@/components/settings/WorkflowTab';
import { AccessibilityTab } from '@/components/settings/AccessibilityTab';

const TABS = [
  { id: 'appearance',     label: 'Appearance',     icon: Palette },
  { id: 'notifications',  label: 'Notifications',  icon: Bell },
  { id: 'workflow',        label: 'Workflow',        icon: Workflow },
  { id: 'accessibility',  label: 'Accessibility',  icon: Accessibility },
] as const;

type TabId = (typeof TABS)[number]['id'];

function SettingsInner() {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-theme-primary">Settings</h1>
        <p className="text-sm text-theme-tertiary/50 mt-1">
          Personalise your experience — changes are saved automatically.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 overflow-x-auto no-scrollbar border-b border-theme">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
              ${activeTab === id
                ? 'border-[#D37E91] text-[#D37E91]'
                : 'border-transparent text-theme-tertiary/50 hover:text-theme-secondary dark:hover:text-theme-secondary hover:border-gray-300 dark:hover:border-white/20'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'workflow' && <WorkflowTab />}
        {activeTab === 'accessibility' && <AccessibilityTab />}
      </div>

      {/* PWA Install — always at the bottom */}
      <div className="mt-10 pt-8 border-t border-theme">
        <PWAInstallSection />
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return <SettingsInner />;
}
