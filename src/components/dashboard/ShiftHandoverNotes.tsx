"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function ShiftHandoverNotes() {
  const { companyId } = useAppContext();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      let q = supabase.from("profile_settings").select("id,value,company_id,key").eq("key", `handover:${today}`);
      if (companyId) q = q.eq("company_id", companyId);
      const { data } = await q.limit(1).maybeSingle();
      const initial = (data as any)?.value || "";
      if (typeof initial === "string") setNotes(initial);
    };
    load();
  }, [companyId]);

  const save = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const row = { key: `handover:${today}`, value: notes, company_id: companyId } as any;
      // Upsert into profile_settings as a lightweight key-value store
      await supabase.from("profile_settings").upsert(row, { onConflict: "key,company_id" });
      setSavedAt(new Date().toLocaleTimeString());
    } catch {}
    setSaving(false);
  };

  return (
    <section className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(211, 126, 145,0.05)] fade-in-soft">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-2xl font-semibold">Shift Handover Notes</h3>
        {savedAt && <span className="text-xs text-theme-tertiary">Saved at {savedAt}</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Key updates for the next shift..."
        className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 textarea-hover-glow"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-sm px-3 py-1 rounded-full border border-white/20 text-theme-secondary hover:bg-white/10 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>
    </section>
  );
}