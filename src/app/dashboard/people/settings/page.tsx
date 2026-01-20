'use client';

import Link from 'next/link';
import { 
  Settings, 
  Building2, 
  Users, 
  MapPin, 
  GitBranch, 
  Shield,
  Clock,
  Bell,
  ChevronRight 
} from 'lucide-react';

export default function PeopleSettingsPage() {
  // Settings overview page
  const settingsSections = [
    {
      title: 'General Settings',
      description: 'Company information, working hours, and general preferences',
      href: '/dashboard/people/settings/general',
      icon: Settings,
      color: 'blue',
    },
    {
      title: 'Sites',
      description: 'Manage your company locations and site-specific settings',
      href: '/dashboard/people/settings/sites',
      icon: Building2,
      color: 'green',
    },
    {
      title: 'Departments',
      description: 'Organize your teams into departments and manage structures',
      href: '/dashboard/people/settings/departments',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Areas & Regions',
      description: 'Define geographical areas and regional management structure',
      href: '/dashboard/people/settings/areas',
      icon: MapPin,
      color: 'orange',
    },
    {
      title: 'Approval Workflows',
      description: 'Configure approval processes for rota, payroll, and leave',
      href: '/dashboard/people/settings/approvals',
      icon: GitBranch,
      color: 'pink',
    },
    {
      title: 'Roles & Permissions',
      description: 'Define user roles and access control settings',
      href: '/dashboard/people/settings/roles',
      icon: Shield,
      color: 'red',
    },
    {
      title: 'Shift Rules',
      description: 'Working Time Directive compliance, breaks, and overtime settings',
      href: '/dashboard/people/settings/shift-rules',
      icon: Clock,
      color: 'cyan',
    },
    {
      title: 'Notifications',
      description: 'Configure alerts for shifts, approvals, and deadlines',
      href: '/dashboard/people/settings/notifications',
      icon: Bell,
      color: 'yellow',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:border-green-500/40',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:border-purple-500/40',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:border-orange-500/40',
    pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:border-pink-500/40',
    red: 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/40',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:border-yellow-500/40',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-neutral-400">
          Configure your organization's structure, workflows, and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`
              ${colorClasses[section.color as keyof typeof colorClasses]}
              border rounded-lg p-6 transition-all duration-200
              hover:shadow-lg group
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                <section.icon className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {section.title}
            </h3>
            <p className="text-sm text-neutral-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/dashboard/people/settings/areas"
            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          >
            <MapPin className="w-5 h-5 text-[#EC4899]" />
            <div>
              <p className="text-sm font-medium text-white">Create New Region</p>
              <p className="text-xs text-neutral-400">Add a regional structure</p>
            </div>
          </Link>
          <Link
            href="/dashboard/people/settings/approvals"
            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          >
            <GitBranch className="w-5 h-5 text-[#EC4899]" />
            <div>
              <p className="text-sm font-medium text-white">Setup Approval Flow</p>
              <p className="text-xs text-neutral-400">Configure workflows</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

