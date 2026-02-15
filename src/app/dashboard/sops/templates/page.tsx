"use client";

import React, { useState } from 'react';
import { Plus, ChefHat, Users, Wine, Coffee, IceCream, Sparkles, Clock, Lock, Search } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';

const SOP_TEMPLATES = [
  {
    id: 'food-prep',
    title: 'Food Prep',
    description: 'Prep, cooking, and production procedures',
    icon: ChefHat,
    color: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    link: '/dashboard/sops/food-template',
    category: 'Food Prep'
  },
  {
    id: 'service',
    title: 'Service (FOH)',
    description: 'Front of house standards and procedures',
    icon: Users,
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    link: '/dashboard/sops/service-template',
    category: 'Service (FOH)'
  },
  {
    id: 'drinks',
    title: 'Drinks (Bar)',
    description: 'Cocktails, spirits, and beverage recipes',
    icon: Wine,
    color: 'from-purple-500/20 to-module-fg/25',
    borderColor: 'border-purple-500/30',
    link: '/dashboard/sops/drinks-template',
    category: 'Drinks'
  },
  {
    id: 'hot-drinks',
    title: 'Hot Beverages',
    description: 'Coffee, tea, and espresso standards',
    icon: Coffee,
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    link: '/dashboard/sops/hot-drinks-template',
    category: 'Hot Beverages'
  },
  {
    id: 'cold-drinks',
    title: 'Cold Beverages',
    description: 'Smoothies, shakes, and juices',
    icon: IceCream,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    link: '/dashboard/sops/cold-drinks-template',
    category: 'Cold Beverages'
  },
  {
    id: 'cleaning',
    title: 'Cleaning',
    description: 'Sanitation and hygiene procedures',
    icon: Sparkles,
    color: 'from-teal-500/20 to-blue-500/20',
    borderColor: 'border-module-fg/30',
    link: '/dashboard/sops/cleaning-template',
    category: 'Cleaning'
  },
  {
    id: 'opening',
    title: 'Opening Procedures',
    description: 'Daily opening checklist and startup',
    icon: Clock,
    color: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/30',
    link: '/dashboard/sops/opening-template',
    category: 'Opening'
  },
  {
    id: 'closing',
    title: 'Closing Procedures',
    description: 'End of shift and security checklist',
    icon: Lock,
    color: 'from-indigo-500/20 to-purple-500/20',
    borderColor: 'border-module-fg/30',
    link: '/dashboard/sops/closing-template',
    category: 'Closing'
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const handleCreateSOP = (templateLink) => {
    router.push(templateLink);
  };

  const filteredTemplates = SOP_TEMPLATES.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-[rgb(var(--text-primary))] dark:text-white placeholder-[rgb(var(--text-tertiary))] dark:placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-4 py-2 text-[rgb(var(--text-primary))] dark:text-white"
        >
          <option value="all">All Categories</option>
          <option value="Food Prep">Food Prep</option>
          <option value="Service (FOH)">Service (FOH)</option>
          <option value="Drinks">Drinks</option>
          <option value="Hot Beverages">Hot Beverages</option>
          <option value="Cold Beverages">Cold Beverages</option>
          <option value="Cleaning">Cleaning</option>
          <option value="Opening">Opening</option>
          <option value="Closing">Closing</option>
        </select>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          // Extract base color from template for light mode
          const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
            'food-prep': { 
              bg: 'bg-orange-50 dark:bg-gradient-to-br dark:from-orange-500/20 dark:to-red-500/20', 
              border: 'border-orange-200 dark:border-orange-500/30',
              text: 'text-orange-900 dark:text-white',
              icon: 'text-orange-600 dark:text-white'
            },
            'service': { 
              bg: 'bg-blue-50 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-cyan-500/20', 
              border: 'border-blue-200 dark:border-blue-500/30',
              text: 'text-blue-900 dark:text-white',
              icon: 'text-blue-600 dark:text-white'
            },
            'drinks': { 
              bg: 'bg-purple-50 dark:bg-gradient-to-br dark:from-purple-500/20 dark:to-module-fg/25', 
              border: 'border-purple-200 dark:border-purple-500/30',
              text: 'text-purple-900 dark:text-white',
              icon: 'text-purple-600 dark:text-white'
            },
            'hot-drinks': { 
              bg: 'bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/20 dark:to-yellow-500/20', 
              border: 'border-amber-200 dark:border-amber-500/30',
              text: 'text-amber-900 dark:text-white',
              icon: 'text-amber-600 dark:text-white'
            },
            'cold-drinks': { 
              bg: 'bg-green-50 dark:bg-gradient-to-br dark:from-green-500/20 dark:to-emerald-500/20', 
              border: 'border-green-200 dark:border-green-500/30',
              text: 'text-green-900 dark:text-white',
              icon: 'text-green-600 dark:text-white'
            },
            'cleaning': { 
              bg: 'bg-teal-50 dark:bg-gradient-to-br dark:from-teal-500/20 dark:to-blue-500/20', 
              border: 'border-teal-200 dark:border-module-fg/30',
              text: 'text-teal-900 dark:text-white',
              icon: 'text-module-fg'
            },
            'opening': { 
              bg: 'bg-yellow-50 dark:bg-gradient-to-br dark:from-yellow-500/20 dark:to-orange-500/20', 
              border: 'border-yellow-200 dark:border-yellow-500/30',
              text: 'text-yellow-900 dark:text-white',
              icon: 'text-yellow-600 dark:text-white'
            },
            'closing': { 
              bg: 'bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/20 dark:to-purple-500/20', 
              border: 'border-indigo-200 dark:border-module-fg/30',
              text: 'text-indigo-900 dark:text-white',
              icon: 'text-module-fg'
            }
          };
          const colors = colorMap[template.id] || { 
            bg: 'bg-gray-50 dark:bg-gradient-to-br dark:from-gray-500/20 dark:to-gray-500/20', 
            border: 'border-gray-200 dark:border-gray-500/30',
            text: 'text-theme-primary',
            icon: 'text-theme-secondary'
          };
          
          return (
            <button
              key={template.id}
              onClick={() => handleCreateSOP(template.link)}
              className={`${colors.bg} border ${colors.border} rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group hover:shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-lg bg-white/80 dark:bg-white/10 group-hover:bg-white dark:group-hover:bg-white/20 transition-colors`}>
                  <Icon size={24} className={colors.icon} />
                </div>
                <h3 className={`text-lg font-semibold ${colors.text}`}>{template.title}</h3>
              </div>
              <p className={`text-sm ${colors.text} opacity-80 dark:opacity-90`}>{template.description}</p>
              <div className={`mt-4 flex items-center gap-2 text-xs ${colors.text} opacity-70 dark:opacity-70`}>
                <Plus size={14} />
                <span>Create new</span>
              </div>
            </button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
 <div className="text-center py-12 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
          No templates found matching your search.
        </div>
      )}
    </div>
  );
}

