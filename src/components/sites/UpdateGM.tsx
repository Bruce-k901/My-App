"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { ChevronUp } from "lucide-react";

type GM = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  home_site?: string | null;
  company_id?: string | null;
};

type UpdateGMProps = {
  siteId: string;
  gmList: GM[];
  currentGM?: string;
  renderExpandedOnly?: boolean;
};

export function UpdateGM({ siteId, gmList, currentGM, renderExpandedOnly = false }: UpdateGMProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState(currentGM || "");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleUpdate = async () => {
    if (!selectedGM) {
      showToast("Please select a GM", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("update_gm_link", {
        site_id: siteId,
        gm_id: selectedGM,
      });

      if (error) {
        showToast(`Error updating GM: ${error.message}`, "error");
      } else {
        showToast("GM updated successfully", "success");
        setIsOpen(false); // only close the expanded section
      }
    } catch (err) {
      showToast("Failed to update GM", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!renderExpandedOnly && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="border-magenta-500 text-magenta-500 hover:bg-magenta-500/10"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? "Close" : "Update GM"}
          </Button>
        </div>
      )}

      {/* Expanded panel below GM info fields */}
      {renderExpandedOnly && isOpen && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 w-full z-10 relative bg-neutral-950">
          <select
            value={selectedGM}
            onChange={(e) => setSelectedGM(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.1] rounded-md px-4 py-2 text-white min-w-[180px] h-11 hover:border-white/20 focus:border-pink-500 focus:outline-none"
          >
            <option value="">Select GM...</option>
            {gmList.map((gm) => (
              <option key={gm.id} value={gm.id} className="bg-neutral-900 text-white">
                {gm.full_name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            disabled={loading}
            onClick={handleUpdate}
            className="border-pink-500 text-pink-500 hover:bg-pink-500/10"
          >
            {loading ? "Saving..." : "Save & Sync"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="p-2 text-neutral-400 hover:text-white"
            title="Close section"
          >
            <ChevronUp size={18} />
          </Button>
        </div>
      )}
    </>
  );
}