"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Shield, Plus } from '@/components/ui/icons';

const TEMPLATES = [
  {
    id: 'general',
    title: 'General Risk Assessment',
    description: 'Comprehensive risk assessment for all activities',
    icon: FileText,
    color: 'from-red-500/20 to-orange-500/20',
    lightBg: 'bg-red-50',
    lightText: 'text-red-900',
    lightIcon: 'text-red-600',
    borderColor: 'border-red-500/30',
    lightBorder: 'border-red-200',
    link: '/dashboard/risk-assessments/general-template'
  },
  {
    id: 'coshh',
    title: 'COSHH Risk Assessment',
    description: 'Control of Substances Hazardous to Health',
    icon: Shield,
    color: 'from-amber-500/20 to-yellow-500/20',
    lightBg: 'bg-amber-50',
    lightText: 'text-amber-900',
    lightIcon: 'text-amber-600',
    borderColor: 'border-amber-500/30',
    lightBorder: 'border-amber-200',
    link: '/dashboard/risk-assessments/coshh-template'
  }
];

export default function RATemplatesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gradient-to-r dark:from-neutral-700/20 dark:to-neutral-800/20 rounded-2xl p-6 border border-theme/30">
        <h1 className="text-2xl font-semibold text-theme-primary mb-2">RA Templates</h1>
        <p className="text-gray-600 dark:text-neutral-300 text-sm">Select a template to create a new risk assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => router.push(template.link)}
              className={`rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group border ${template.lightBg} dark:bg-gradient-to-br dark:${template.color} ${template.lightBorder} dark:${template.borderColor}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-lg bg-white/50 dark:bg-white/10 group-hover:bg-white/70 dark:group-hover:bg-white/20 transition-colors`}>
                  <Icon size={24} className={`${template.lightIcon} dark:text-white`} />
                </div>
                <h3 className={`text-lg font-semibold ${template.lightText} dark:text-white`}>{template.title}</h3>
              </div>
              <p className={`text-sm ${template.lightText} opacity-90 dark:text-neutral-300`}>{template.description}</p>
 <div className={`mt-4 flex items-center gap-2 text-xs font-medium ${template.lightIcon} dark:text-theme-tertiary`}>
                <Plus size={14} />
                <span>Create new</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
