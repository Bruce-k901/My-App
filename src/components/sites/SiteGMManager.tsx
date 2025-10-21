import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { updateGM } from "@/lib/updateGM";

interface GM {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  home_site: string | null;
  company_id: string;
}

interface Site {
  id: string;
  name: string;
  company_id: string;
}

interface SiteGMManagerProps {
  site: Site;
  companyId: string;
  onSaved?: () => void;
}

export default function SiteGMManager({ site, companyId, onSaved }: SiteGMManagerProps) {
  console.log("🔍 Rendered", "SiteGMManager");
  const [gmList, setGmList] = useState<GM[]>([]);
  const [selectedGM, setSelectedGM] = useState<GM | null>(null);
  const [currentGM, setCurrentGM] = useState<GM | null>(null);
  const [saving, setSaving] = useState(false);

  // 1. Load current GM data from gm_index
  useEffect(() => {
    const fetchCurrentGM = async () => {
      if (!site?.id) return;

      const { data: gmData } = await supabase
        .from("gm_index")
        .select("id, full_name, email, phone, home_site, company_id")
      .eq("home_site", site.id)
        .maybeSingle();

      if (gmData) {
        setCurrentGM(gmData);
      }
    };
    fetchCurrentGM();
  }, [site?.id]);

  // 2. Load all available GMs from gm_index table
  useEffect(() => {
    const fetchGMs = async () => {
      const { data: gmList, error } = await supabase
        .from("gm_index")
        .select("id, full_name")
        .eq("company_id", companyId)
        .order("full_name", { ascending: true });

      if (!error && gmList) {
        // Transform gm_index data to match GM interface
        const transformedData = gmList.map(gm => ({
          ...gm,
          email: "", // Not fetched in this phase
          phone: "", // Not fetched in this phase
          home_site: null,
          company_id: companyId
        }));
        setGmList(transformedData);
      }
    };
    fetchGMs();
  }, [companyId]);

  // 3. Handle selection + save
  const handleSaveGM = async () => {
    if (!selectedGM || !site?.id) return;

    setSaving(true);
    try {
      await updateGM(site.id, selectedGM.id);
      onSaved?.(); // trigger re-fetch after mirror refresh
    } catch (error) {
      console.error("Error updating GM:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Display current GM info if available */}
      {currentGM && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-neutral-800/50 rounded-lg">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Current GM</label>
            <div className="text-sm text-white">{currentGM.full_name || "No GM assigned"}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <div className="text-sm text-white">{currentGM.phone || "No phone"}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <div className="text-sm text-white">{currentGM.email || "No email"}</div>
          </div>
        </div>
      )}

      {/* GM Selection and Save */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">General Manager</label>
          <select
            className="bg-neutral-800 text-white border border-neutral-700 w-full rounded-md text-sm p-2 focus:outline-none focus:ring-2 focus:ring-magenta-500 hover:border-magenta-400 transition-colors"
            value={selectedGM?.id || ""}
            onChange={(e) =>
              setSelectedGM(gmList.find((gm) => gm.id === e.target.value) || null)
            }
          >
            <option value="" className="bg-neutral-800 text-white">Select a manager</option>
            {gmList.map((gm) => (
              <option key={gm.id} value={gm.id} className="bg-neutral-800 text-white hover:bg-magenta-500">
                {gm.full_name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleSaveGM}
          disabled={saving || !selectedGM}
          variant="outline"
          className="hover:shadow-magentaGlow"
        >
          {saving ? "Saving..." : "Save & Sync"}
        </Button>
      </div>
    </div>
  );
}