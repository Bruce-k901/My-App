"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext, AppProvider } from "@/context/AppContext";
import { useRouter } from "next/navigation";

function NewIncidentForm() {
  const router = useRouter();
  const { companyId, siteId, userId } = useAppContext();
  const [type, setType] = useState("Equipment");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!companyId || !siteId || !userId) {
        setError("Missing company/site/user context");
        setSubmitting(false);
        return;
      }

      const incidentId = crypto.randomUUID();
      let photoPath: string | null = null;
      if (photoFile) {
        const filename = photoFile.name;
        photoPath = `${companyId}/${siteId}/${incidentId}/${filename}`;
        const { error: uploadErr } = await supabase.storage
          .from("incident_photos")
          .upload(photoPath, photoFile, { upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
      }

      const { error: insErr } = await supabase.from("incidents").insert({
        id: incidentId,
        company_id: companyId,
        site_id: siteId,
        reported_by: userId,
        type,
        description,
        severity,
        status: "open",
        photo_url: photoPath,
      });
      if (insErr) throw new Error(insErr.message);

      router.replace("/incidents");
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit incident");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xl font-semibold mb-4">Report an Incident</h1>
      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-3">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option>Equipment</option>
            <option>Safety</option>
            <option>Food</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe the issue, context, and any immediate actions taken"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Severity</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-transparent border border-[#D37E91] text-[#D37E91] px-4 py-2 rounded hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] disabled:opacity-50 disabled:border-white/20 disabled:text-white/40 transition-all duration-200"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewIncidentPage() {
  return (
    <AppProvider>
      <NewIncidentForm />
    </AppProvider>
  );
}