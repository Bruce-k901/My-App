"use client";

import { Settings, Construction } from '@/components/ui/icons';

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">Settings</h1>
        <p className="text-theme-tertiary">Platform configuration and preferences</p>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 text-center">
        <Construction className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-theme-primary mb-2">Coming Soon</h2>
        <p className="text-theme-tertiary max-w-md mx-auto">
          Platform settings including notification preferences, feature flags, and admin user management will be available here.
        </p>
      </div>
    </div>
  );
}

