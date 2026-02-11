"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function LibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [library, setLibrary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { company } = useAppContext();

  useEffect(() => {
    async function fetchLibrary() {
      if (!company?.id) return;

      const { data: libraryData } = await supabase
        .from('libraries')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      setLibrary(libraryData);

      const { data: itemsData } = await supabase
        .from('library_items')
        .select('*')
        .eq('library_id', id)
        .order('name');

      setItems(itemsData || []);
      setLoading(false);
    }

    fetchLibrary();
  }, [id, company?.id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/[0.05] rounded w-64 mb-4"></div>
          <div className="h-4 bg-white/[0.05] rounded w-96"></div>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Library Not Found</h1>
        <p className="text-white/60">This library doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{library.name}</h1>
        <p className="text-white/60">{library.description || 'Manage items in this library'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-white/60">No items in this library yet.</p>
            <button className="mt-4 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200">
              Add First Item
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-[#D37E91]/20 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-white/60">{item.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
