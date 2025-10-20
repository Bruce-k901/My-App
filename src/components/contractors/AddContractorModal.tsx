"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import ContractorForm from "./ContractorForm";

type Prefill = {
  name?: string;
  email?: string;
  phone?: string;
  postcode?: string;
  ooh?: string;
  hourly_rate?: number | null;
  callout_fee?: number | null;
  service_description?: string;
  website?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contractor?: any;
  prefill?: Prefill;
};

export default function AddContractorModal({ isOpen, onClose, onSuccess, contractor, prefill }: Props) {
  const { companyId } = useAppContext();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    ooh: "",
    category: "",
    service_description: "",
    postcode: "",
    hourly_rate: "",
    callout_fee: "",
    website: "",
    created_at: null,
    updated_at: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const isEdit = !!contractor?.id;
    
    if (isEdit) {
      setForm({
        name: contractor.name || "",
        email: contractor.email || "",
        phone: contractor.phone || "",
        ooh: contractor.ooh || contractor.emergency_phone || "",
        category: contractor.category || "",
        service_description: contractor.service_description || contractor.notes || "",
        postcode: contractor.postcode || "",
        hourly_rate: contractor.hourly_rate || "",
        callout_fee: contractor.callout_fee || "",
        website: contractor.website || "",
        created_at: contractor.created_at || null,
        updated_at: contractor.updated_at || null,
      });
    } else if (prefill) {
      setForm({
        name: prefill.name || "",
        email: prefill.email || "",
        phone: prefill.phone || "",
        ooh: prefill.ooh || "",
        category: "",
        service_description: prefill.service_description || "",
        postcode: prefill.postcode || "",
        hourly_rate: prefill.hourly_rate !== null && prefill.hourly_rate !== undefined ? String(prefill.hourly_rate) : "",
        callout_fee: prefill.callout_fee !== null && prefill.callout_fee !== undefined ? String(prefill.callout_fee) : "",
        website: prefill.website || "",
        created_at: null,
        updated_at: null,
      });
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        ooh: "",
        category: "",
        service_description: "",
        postcode: "",
        hourly_rate: "",
        callout_fee: "",
        website: "",
        created_at: null,
        updated_at: null,
      });
    }
  }, [isOpen, contractor, prefill]);

  const showToast = (msg: string) => alert(msg);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Please enter a contractor name");
      return;
    }

    if (!companyId) {
      showToast("Company context missing — please refresh or reselect company.");
      return;
    }

    setLoading(true);

    try {
      const contractorData = {
        company_id: companyId,
        name: form.name.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        ooh: form.ooh?.trim() || null,
        postcode: form.postcode?.trim() || null,
        hourly_rate: form.hourly_rate !== null && form.hourly_rate !== "" ? Number(form.hourly_rate) : null,
        callout_fee: form.callout_fee !== null && form.callout_fee !== "" ? Number(form.callout_fee) : null,
        notes: form.service_description || null,
        website: form.website || null,
        // category and region will be set by triggers if not provided
      };

      console.log("companyId:", companyId, "contractorData:", contractorData);

      if (contractor?.id) {
        const { data: updated, error: uerr } = await supabase
          .from("contractors")
          .update(contractorData)
          .eq("id", contractor.id)
          .select("*")
          .throwOnError();
        
        console.log("UPDATE result", updated);
        if (uerr) throw uerr;
      } else {
        const { data: inserted, error: ierr } = await supabase
          .from("contractors")
          .insert(contractorData)
          .select("*")
          .throwOnError();
        
        console.log("INSERT result", inserted);
        if (ierr) throw ierr;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving contractor:", err);
      showToast("Failed to save contractor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on dropdown content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-neutral-900 border border-white/10 rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-6">
          {contractor ? "Edit Contractor" : "Add Contractor"}
        </h2>

        <ContractorForm form={form} setForm={setForm} isEditing={!!contractor?.id} />

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="ghost" 
            className="border border-white/[0.1] hover:border-white/[0.25] hover:bg-white/[0.07]" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Contractor"}
          </Button>
        </div>
      </div>
    </div>
  );
}
