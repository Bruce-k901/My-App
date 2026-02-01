"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import Select from "@/components/ui/Select";
import { useAppContext } from "@/context/AppContext";

type Props = {
  onClose?: () => void;
  // Provide the newly inserted document id so the caller can highlight it
  onSuccess?: (newDocId?: string) => void;
  // Optional: replace an existing placeholder/global doc record instead of creating a new one
  existingDocumentId?: string;
  initialCategory?: string;
  initialName?: string;
  initialNotes?: string;
};

export default function UploadGlobalDocModal({
  onClose,
  onSuccess,
  existingDocumentId,
  initialCategory,
  initialName,
  initialNotes,
}: Props) {
  const { companyId } = useAppContext();
  const [form, setForm] = useState<{
    documentType: string;
    category: string;
    name: string;
    version: string;
    expiry_date: string;
    notes: string;
    file: File | null;
  }>({
    documentType: existingDocumentId || initialCategory || initialName ? "Other" : "",
    category: initialCategory || "",
    name: initialName || "",
    version: "v1",
    expiry_date: "",
    notes: initialNotes || "",
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // EHO Document Types - These map directly to readiness requirements
  const documentTypes = [
    // === ONBOARDING DOCUMENTS ===
    // Employment Contracts
    { value: "Employment Contract - FOH Hourly", category: "Onboarding - Contracts", required: true },
    { value: "Employment Contract - FOH Salaried", category: "Onboarding - Contracts", required: true },
    { value: "Employment Contract - BOH Hourly", category: "Onboarding - Contracts", required: true },
    { value: "Employment Contract - BOH Salaried", category: "Onboarding - Contracts", required: true },
    
    // Onboarding Policies
    { value: "Staff Handbook", category: "Onboarding - Policies", required: true },
    
    // Onboarding Forms
    { value: "New Starter Details Form", category: "Onboarding - Forms", required: true },
    { value: "Uniform Issued Record", category: "Onboarding - Forms", required: false },
    { value: "Wage Deduction Authorisation", category: "Onboarding - Forms", required: false },
    { value: "Right to Work Verification", category: "Onboarding - Forms", required: true },
    { value: "Health Declaration Form", category: "Onboarding - Forms", required: true },
    { value: "GDPR & Data Protection Consent", category: "Onboarding - Forms", required: true },
    
    // Onboarding Training
    { value: "Food Hygiene Certificate", category: "Onboarding - Training", required: true },
    { value: "Training Acknowledgment", category: "Onboarding - Training", required: true },
    
    // === COMPANY COMPLIANCE DOCUMENTS ===
    // Food Safety
    { value: "Food Safety Policy", category: "Food Safety & Hygiene", required: true },
    { value: "HACCP Plan", category: "Food Safety & Hygiene", required: true },
    { value: "Allergen Management Policy", category: "Food Safety & Hygiene", required: true },
    
    // Health & Safety
    { value: "Health & Safety Policy", category: "Health & Safety", required: true },
    { value: "Competent Person Appointment Letter", category: "Health & Safety", required: true },
    { value: "COSHH Register", category: "Health & Safety", required: true },
    { value: "Risk Assessments", category: "Health & Safety", required: true },
    
    // Fire Safety
    { value: "Fire Safety Policy", category: "Fire & Premises", required: true },
    { value: "Fire Risk Assessment", category: "Fire & Premises", required: true },
    
    // Training
    { value: "Training Matrix", category: "Training & Competency", required: true },
    { value: "Training Records", category: "Training & Competency", required: false },
    
    // Cleaning
    { value: "Cleaning Schedule", category: "Cleaning & Hygiene", required: true },
    { value: "Deep Clean Records", category: "Cleaning & Hygiene", required: false },
    
    // Legal & Insurance
    { value: "Public Liability Insurance", category: "Legal & Certificates", required: true },
    { value: "Employers Liability Insurance", category: "Legal & Certificates", required: true },
    { value: "Premises Licence", category: "Legal & Certificates", required: false },
    { value: "Food Business Registration", category: "Legal & Certificates", required: true },
    { value: "Gas Safety Certificate", category: "Legal & Certificates", required: false },
    { value: "Electrical Installation Certificate", category: "Legal & Certificates", required: false },
    
    // Environmental
    { value: "Waste Management Policy", category: "Environmental & Waste", required: true },
    { value: "Waste Transfer Notes", category: "Environmental & Waste", required: false },
    
    // Other
    { value: "Other", category: "Other", required: false },
  ];

  const categories = [
    "Onboarding - Contracts",
    "Onboarding - Policies",
    "Onboarding - Forms",
    "Onboarding - Training",
    "Food Safety & Hygiene",
    "Health & Safety",
    "Fire & Premises",
    "Training & Competency",
    "Cleaning & Hygiene",
    "Legal & Certificates",
    "Environmental & Waste",
    "Other",
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

  const handleDocumentTypeChange = (docType: string) => {
    const docTypeObj = documentTypes.find(dt => dt.value === docType)
    if (docTypeObj) {
      setForm(prev => ({
        ...prev,
        documentType: docType,
        category: docTypeObj.category,
        name: docType === "Other" ? "" : docType // Auto-fill name if not "Other"
      }))
    }
  }

  const handleUpload = async () => {
    // Validation: file and name are always required
    // Category is required if documentType is "Other", otherwise it's auto-filled
    if (!form.file || !form.name) {
      setError("Please fill all required fields (file and document name).");
      return;
    }
    
    // If "Other" is selected, category must be provided
    if (form.documentType === "Other" && !form.category) {
      setError("Please select a category for 'Other' document type.");
      return;
    }
    
    // Ensure category is set (should be auto-filled from document type)
    let finalCategory = form.category
    if (!finalCategory && form.documentType && form.documentType !== "Other") {
      const docTypeObj = documentTypes.find(dt => dt.value === form.documentType)
      if (docTypeObj) {
        finalCategory = docTypeObj.category
      }
    }
    
    if (!finalCategory) {
      setError("Category is required. Please select a document type or category.");
      return;
    }
    
    if (!companyId) {
      setError("Missing company context. Please refresh and try again.");
      console.error("Company context not loaded yet. Please refresh and try again.");
      return;
    }
    setLoading(true);
    setError("");

    // build folder path - use final category
    const folder = finalCategory
      .toLowerCase()
      .replace(/ & /g, "_")
      .replace(/\s+/g, "_");
    // Sanitize the filename before upload
    const sanitizedFileName = sanitizeFileName(form.file.name);
    // Company-scoped path to satisfy storage RLS and keep tenants isolated
    const filePath = existingDocumentId
      ? `${companyId}/${folder}/${existingDocumentId}_${Date.now()}_${sanitizedFileName}`
      : `${companyId}/${folder}/${sanitizedFileName}`;

    // Quick check: ensure we have an authenticated user
    const { data: authData } = await supabase.auth.getUser();
    console.log("User for upload:", authData);

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
      console.error(`Upload failed: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    // 2. insert/update metadata and return the document id for highlight
    // Store document type in name field (standardized) and also in notes for reference
    const documentName = form.documentType && form.documentType !== "Other" 
      ? form.documentType 
      : form.name
    
    if (existingDocumentId) {
      // Replace an existing placeholder/global doc record
      const updatePayload: Record<string, any> = {
        category: finalCategory,
        name: documentName,
        version: form.version,
        expiry_date: form.expiry_date || null,
        notes: form.documentType ? `${form.documentType}${form.notes ? ` - ${form.notes}` : ''}` : form.notes,
        file_path: filePath,
        uploaded_by: authData?.user?.id || null,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_placeholder: false,
      };

      // If the DB hasn't been migrated yet (missing is_placeholder), retry without it.
      const { error: updateError } = await supabase
        .from("global_documents")
        .update(updatePayload)
        .eq("id", existingDocumentId);

      if (updateError && (updateError.message?.includes("is_placeholder") || updateError.code === "PGRST204")) {
        delete updatePayload.is_placeholder;
        const { error: retryError } = await supabase
          .from("global_documents")
          .update(updatePayload)
          .eq("id", existingDocumentId);
        if (retryError) {
          setError(retryError.message);
          console.error(`Metadata update failed: ${retryError.message}`);
          setLoading(false);
          return;
        }
      } else if (updateError) {
        setError(updateError.message);
        console.error(`Metadata update failed: ${updateError.message}`);
        setLoading(false);
        return;
      }

      setLoading(false);
      console.log("Document replaced successfully!");
      onSuccess?.(existingDocumentId);
      onClose?.();
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("global_documents")
      .insert({
        category: finalCategory,
        name: documentName, // Use standardized document type name
        version: form.version,
        expiry_date: form.expiry_date || null,
        notes: form.documentType ? `${form.documentType}${form.notes ? ` - ${form.notes}` : ''}` : form.notes,
        file_path: filePath,
        company_id: companyId,
        uploaded_by: authData?.user?.id || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      console.error(`Metadata insert failed: ${insertError.message}`);
      setLoading(false);
      return;
    }

    setLoading(false);
    console.log("Document uploaded successfully!");
    onSuccess?.(inserted?.id);
    onClose?.();
  };

  return (
    <div className="p-6 bg-[#0b0f1a] rounded-2xl shadow-lg w-[500px] border border-white/10">
      <h2 className="text-xl font-semibold text-white mb-4">Upload Document</h2>

      <div className="space-y-3">
        <div>
          <Select
            label={
              <span className="text-sm text-white/80">
                Document Type <span className="text-pink-400">*</span>
                <span className="text-xs text-white/60 ml-2">(Select from EHO requirements)</span>
              </span>
            }
            value={form.documentType}
            onValueChange={handleDocumentTypeChange}
            placeholder="Select document type…"
            options={documentTypes.map((dt) => ({
              label: `${dt.value}${dt.required ? ' *' : ''}`,
              value: dt.value
            }))}
            className="text-white"
          />
          {form.documentType && form.documentType !== "Other" && (
            <p className="text-xs text-green-400 mt-1">
              ✓ This will be recognized by the EHO Readiness Pack
            </p>
          )}
        </div>

        {form.documentType === "Other" && (
          <div>
            <Select
              label="Category"
              value={form.category}
              onValueChange={(val) => handleChange("category", val)}
              placeholder="Select category…"
              options={categories.map((c) => ({ label: c, value: c }))}
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-white/80 mb-1">
            Document Name <span className="text-pink-400">*</span>
          </label>
          <Input
            placeholder={form.documentType && form.documentType !== "Other" ? form.documentType : "Enter document name"}
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={form.documentType && form.documentType !== "Other"}
          />
          {form.documentType && form.documentType !== "Other" && (
            <p className="text-xs text-white/60 mt-1">
              Name auto-filled from document type. You can edit if needed.
            </p>
          )}
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