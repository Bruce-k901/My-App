"use client";

import { Settings, Construction } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/60">Platform configuration and preferences</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <Construction className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Platform settings including notification preferences, feature flags, and admin user management will be available here.
        </p>
      </div>
    </div>
  );
}

