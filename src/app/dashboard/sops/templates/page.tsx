"use client";

import React, { useState } from 'react';
import { Plus, ChefHat, Users, Wine, Coffee, IceCream, Sparkles, Clock, Lock, Search } from 'lucide-react';
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
    color: 'from-purple-500/20 to-pink-500/20',
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
    borderColor: 'border-teal-500/30',
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
    borderColor: 'border-indigo-500/30',
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
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
          return (
            <button
              key={template.id}
              onClick={() => handleCreateSOP(template.link)}
              className={`bg-gradient-to-br ${template.color} border ${template.borderColor} rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors`}>
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

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-neutral-400">
          No templates found matching your search.
        </div>
      )}
    </div>
  );
}

