"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Shield, FlaskConical, Coffee, ShoppingBag, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

export default function LibrariesPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [libraryCounts, setLibraryCounts] = useState({
    ingredients: 0,
    ppe: 0,
    chemicals: 0,
    drinks: 0,
    disposables: 0
  });

  const LIBRARIES = [
    {
      id: 'ingredients',
      title: 'Ingredients Library',
      description: 'Manage food ingredients, allergens, and costs',
      icon: Package,
      count: libraryCounts.ingredients,
      link: '/dashboard/sops/libraries/ingredients',
      color: 'from-orange-500/20 to-red-500/20',
      borderColor: 'border-orange-500/30'
    },
    {
      id: 'ppe',
      title: 'PPE Library',
      description: 'Personal protective equipment catalog',
      icon: Shield,
      count: libraryCounts.ppe,
      link: '/dashboard/sops/libraries/ppe',
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'chemicals',
      title: 'Chemicals Library',
      description: 'Cleaning chemicals, hazards, and COSHH data',
      icon: FlaskConical,
      count: libraryCounts.chemicals,
      link: '/dashboard/sops/libraries/chemicals',
      color: 'from-teal-500/20 to-blue-500/20',
      borderColor: 'border-teal-500/30'
    },
    {
      id: 'drinks',
      title: 'Drinks Library',
      description: 'Spirits, mixers, garnishes, and bar ingredients',
      icon: Coffee,
      count: libraryCounts.drinks,
      link: '/dashboard/sops/libraries/drinks',
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'disposables',
      title: 'Disposables Library',
      description: 'Napkins, straws, packaging, and disposable items',
      icon: ShoppingBag,
      count: libraryCounts.disposables,
      link: '/dashboard/sops/libraries/disposables',
      color: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/30'
    },
    {
      id: 'colours',
      title: 'Tool Colour Codes',
      description: 'UK food safety colour-coding reference',
      icon: Palette,
      count: '7 codes',
      link: '#',
      color: 'from-yellow-500/20 to-orange-500/20',
      borderColor: 'border-yellow-500/30'
    }
  ];

  useEffect(() => {
    loadLibraryCounts();
  }, [companyId]);

  const loadLibraryCounts = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [ingredients, ppe, chemicals, drinks, disposables] = await Promise.all([
        supabase.from('ingredients_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('ppe_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('chemicals_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('drinks_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('disposables_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
      ]);

      setLibraryCounts({
        ingredients: ingredients.count || 0,
        ppe: ppe.count || 0,
        chemicals: chemicals.count || 0,
        drinks: drinks.count || 0,
        disposables: disposables.count || 0
      });
    } catch (error) {
      console.error('Error loading library counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLibraryClick = (link) => {
    if (link && link !== '#') {
      router.push(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Libraries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIBRARIES.map((library) => {
          const Icon = library.icon;
          return (
            <div
              key={library.id}
              onClick={() => handleLibraryClick(library.link)}
              className={`bg-gradient-to-br ${library.color} border ${library.borderColor} rounded-xl p-6 cursor-pointer hover:scale-105 transition-all`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-lg bg-white/10">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{library.title}</h3>
              </div>
              <p className="text-sm text-neutral-300 mb-4">{library.description}</p>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{typeof library.count === 'number' ? `${library.count} items` : library.count}</span>
                {library.id !== 'colours' && <span>Click to manage</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

