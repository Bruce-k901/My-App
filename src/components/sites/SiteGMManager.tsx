import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

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
        .select("full_name, email, phone, home_site")
        .eq("home_site", site.id)
        .maybeSingle();

      if (gmData) {
        setCurrentGM(gmData);
      }
    };
    fetchCurrentGM();
  }, [site?.id]);

  // 2. Load all available GMs
  useEffect(() => {
    const fetchGMs = async () => {
      const { data, error } = await supabase
        .from("gm_index")
        .select("id, full_name, email, phone, home_site, company_id")
        .eq("company_id", companyId)
        .order("full_name", { ascending: true });

      if (!error) setGmList(data || []);
    };
    fetchGMs();
  }, [companyId]);

  // 3. Handle selection + save
  const handleSaveGM = async () => {
    if (!selectedGM || !site?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ home_site_id: site.id })
      .eq("id", selectedGM.id);

    if (error) console.error("Error updating GM:", error.message);
    else onSaved?.(); // trigger re-fetch after mirror refresh

    setSaving(false);
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
      <div className="flex items-center gap-2 justify-start">
        <div className="w-1/2">
          <label className="block text-sm text-gray-400 mb-1">General Manager</label>
          <select
            className="bg-surface-dark text-gray-100 border border-gray-700 w-full rounded-md text-sm p-2"
            value={selectedGM?.id || ""}
            onChange={(e) =>
              setSelectedGM(gmList.find((gm) => gm.id === e.target.value) || null)
            }
          >
            <option value="">Select a manager</option>
            {gmList.map((gm) => (
              <option key={gm.id} value={gm.id}>
                {gm.full_name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleSaveGM}
          disabled={saving || !selectedGM}
          variant="magentaOutline"
          className="ml-2 hover:shadow-magentaGlow"
        >
          {saving ? "Saving..." : "Save & Sync"}
        </Button>
      </div>
    </div>
  );
}