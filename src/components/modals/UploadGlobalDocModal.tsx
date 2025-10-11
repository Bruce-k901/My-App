"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  onClose?: () => void;
  onSuccess?: () => void;
};

export default function UploadGlobalDocModal({ onClose, onSuccess }: Props) {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState<{
    category: string;
    name: string;
    version: string;
    expiry_date: string;
    notes: string;
    file: File | null;
  }>({
    category: "",
    name: "",
    version: "v1",
    expiry_date: "",
    notes: "",
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const categories = [
    "Food Safety & Hygiene",
    "Health & Safety",
    "Fire & Premises",
    "Environmental & Waste",
    "Legal & Certificates",
  ];

  const handleChange = (key: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleChange("file", e.target.files?.[0] || null);

  // Auto-sanitise filenames to prevent Supabase Storage 400 errors
  function sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .replace(/\s+/g, "_") // replace spaces with underscores
      .replace(/[^\w.-]/g, "_") // replace disallowed characters
      .toLowerCase(); // keep file names consistent
  }

  const handleUpload = async () => {
    if (!form.file || !form.category || !form.name) {
      setError("Please fill all required fields.");
      showToast("Please fill all required fields.", "error");
      return;
    }
    if (!companyId) {
      setError("Missing company context. Please refresh and try again.");
      showToast("Company context not loaded yet. Please refresh and try again.", "error");
      return;
    }
    setLoading(true);
    setError("");

    // build folder path
    const folder = form.category
      .toLowerCase()
      .replace(/ & /g, "_")
      .replace(/\s+/g, "_");
    // Sanitize the filename before upload
    const sanitizedFileName = sanitizeFileName(form.file.name);
    const filePath = `${folder}/${sanitizedFileName}`;

    // Quick check: ensure we have an authenticated user
    const { data } = await supabase.auth.getUser();
    console.log("User for upload:", data);

    // 1. upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("global_docs")
      .upload(filePath, form.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: form.file.type || "application/octet-stream",
      });

    if (uploadError) {
      setError(uploadError.message);
      showToast(`Upload failed: ${uploadError.message}`, "error");
      setLoading(false);
      return;
    }

    // 2. insert metadata
    const { error: insertError } = await supabase
      .from("global_documents")
      .insert({
        category: form.category,
        // Keep user-facing name untouched
        name: form.name,
        version: form.version,
        expiry_date: form.expiry_date || null,
        notes: form.notes,
        file_path: filePath,
        company_id: companyId,
      });

    if (insertError) {
      setError(insertError.message);
      showToast(`Metadata insert failed: ${insertError.message}`, "error");
      setLoading(false);
      return;
    }

    setLoading(false);
    showToast("Document uploaded successfully!", "success");
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="p-6 bg-[#0b0f1a] rounded-2xl shadow-lg w-[500px] border border-white/10">
      <h2 className="text-xl font-semibold text-white mb-4">Upload Document</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-white/80 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full h-11 rounded-md px-4 text-white bg-white/[0.03] border border-white/[0.15] focus:border-pink-500 focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c} value={c} className="text-black">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/80 mb-1">Document Name</label>
          <Input
            placeholder="Fire Safety Policy"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/80 mb-1">Expiry Date (optional)</label>
          <Input
            type="date"
            value={form.expiry_date}
            onChange={(e) => handleChange("expiry_date", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/80 mb-1">Notes (optional)</label>
          <textarea
            placeholder="Short description or purpose"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="w-full min-h-[90px] rounded-md px-4 py-2 text-white placeholder:text-white/40 bg-white/[0.03] border border-white/[0.15] focus:border-pink-500 focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-gray-300 mb-1 block">Select File</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                setForm(prev => ({ ...prev, file }));
              }
            }}
            className="w-full text-sm text-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#EC4899]/20 file:text-white hover:file:bg-[#EC4899]/30"
          />
          {form.file && (
            <p className="text-xs text-gray-400 mt-1">
              Selected: {form.file.name}
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} variant="ghost">Cancel</Button>
        <Button onClick={handleUpload} loading={loading} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}