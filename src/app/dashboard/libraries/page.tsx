"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function LibrariesPage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ [k: string]: number }>({});

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [ingredients, ppe, chemicals, drinks, disposables, glassware, packaging, equipment] = await Promise.all([
        supabase.from('ingredients_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('ppe_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('chemicals_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('drinks_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('disposables_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('glassware_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('packaging_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('equipment_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);
      setCounts({
        ingredients: ingredients.count || 0,
        ppe: ppe.count || 0,
        chemicals: chemicals.count || 0,
        drinks: drinks.count || 0,
        disposables: disposables.count || 0,
        glassware: glassware.count || 0,
        packaging: packaging.count || 0,
        equipment: equipment.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [companyId]);

  const items = [
    { id: 'ingredients', name: 'Ingredients', href: '/dashboard/libraries/ingredients' },
    { id: 'ppe', name: 'PPE', href: '/dashboard/libraries/ppe' },
    { id: 'chemicals', name: 'Chemicals', href: '/dashboard/libraries/chemicals' },
    { id: 'drinks', name: 'Drinks', href: '/dashboard/libraries/drinks' },
    { id: 'disposables', name: 'Disposables', href: '/dashboard/libraries/disposables' },
    { id: 'glassware', name: 'Glassware', href: '/dashboard/libraries/glassware' },
    { id: 'packaging', name: 'Packaging', href: '/dashboard/libraries/packaging' },
    { id: 'equipment', name: 'Serving Equipment', href: '/dashboard/libraries/serving-equipment' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">All Libraries</h1>
      {loading ? (
        <div className="text-white/60">Loading libraries…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Link key={it.id} href={it.href} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{it.name}</div>
                  <div className="text-white/50 text-sm">{counts[it.id] ?? 0} items</div>
                </div>
                <div className="text-white/30">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
