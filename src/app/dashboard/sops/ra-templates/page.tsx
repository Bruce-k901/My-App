"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Shield, Plus } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'general',
    title: 'General Risk Assessment',
    description: 'Comprehensive risk assessment for all activities',
    icon: FileText,
    color: 'from-red-500/20 to-orange-500/20',
    borderColor: 'border-red-500/30',
    link: '/dashboard/risk-assessments/general-template'
  },
  {
    id: 'coshh',
    title: 'COSHH Risk Assessment',
    description: 'Control of Substances Hazardous to Health',
    icon: Shield,
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    link: '/dashboard/risk-assessments/coshh-template'
  }
];

export default function RATemplatesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-neutral-700/20 to-neutral-800/20 rounded-2xl p-6 border border-neutral-700/30">
        <h1 className="text-2xl font-semibold mb-2">RA Templates</h1>
        <p className="text-neutral-300 text-sm">Select a template to create a new risk assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => router.push(template.link)}
              className={`bg-gradient-to-br ${template.color} border ${template.borderColor} rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{template.title}</h3>
              </div>
              <p className="text-sm text-neutral-300">{template.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
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
