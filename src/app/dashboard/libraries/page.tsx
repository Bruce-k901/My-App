"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { LIBRARIES } from "@/lib/navigation-constants";

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
      const [ingredients, ppe, chemicals, drinks, disposables, glassware, packaging, equipment, appliances, firstAid] = await Promise.all([
        supabase.from('ingredients_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('ppe_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('chemicals_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('drinks_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('disposables_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('glassware_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('packaging_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('equipment_library').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('pat_appliances').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('first_aid_supplies_library').select('id', { count: 'exact', head: true }).or(`company_id.eq.${companyId},company_id.is.null`),
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
        appliances: appliances.count || 0,
        firstAid: firstAid.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [companyId]);

  // Map LIBRARIES constant to items format, matching the id keys used in counts
  const libraryIdMap: { [key: string]: string } = {
    'ingredients': 'ingredients',
    'ppe': 'ppe',
    'chemicals': 'chemicals',
    'drinks': 'drinks',
    'disposables': 'disposables',
    'glassware': 'glassware',
    'packaging': 'packaging',
    'serving-equipment': 'equipment',
    'appliances': 'appliances',
    'first-aid': 'firstAid',
  };

  const items = LIBRARIES.map(lib => ({
    id: libraryIdMap[lib.id] || lib.id,
    name: lib.name.replace(' Library', ''), // Remove "Library" suffix for display
    href: lib.href,
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-theme-primary mb-6">All Libraries</h1>
      {loading ? (
        <div className="text-theme-tertiary">Loading libraries…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Link key={it.id} href={it.href} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-theme-primary font-semibold">{it.name}</div>
                  <div className="text-theme-tertiary text-sm">{counts[it.id] ?? 0} items</div>
                </div>
                <div className="text-theme-disabled">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
