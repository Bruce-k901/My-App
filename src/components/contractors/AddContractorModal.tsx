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
    contact_name: "",
    email: "",
    phone: "",
    ooh_phone: "",
    address: "",
    category: "", // Always use empty string (controlled) - never undefined
    notes: "",
    service_description: "", // Keep for backward compatibility
    postcode: "",
    region: "",
    hourly_rate: "",
    callout_fee: "",
    website: "",
    site_id: "",
    type: "",
    status: "active",
    is_active: true,
    wa_opted_in: false,
    contract_start: "",
    contract_expiry: "",
    contract_file: "",
    created_at: null,
    updated_at: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const isEdit = !!contractor?.id;
    
    if (isEdit) {
      // When editing, we need to look up the category ID from the category name
      // The form stores category as ID (UUID), but the database stores it as name (text)
      const loadCategoryId = async () => {
        if (contractor.category) {
          try {
            const { data: categoryData } = await supabase
              .from("contractor_categories")
              .select("id")
              .eq("name", contractor.category)
              .maybeSingle();
            
            if (categoryData?.id) {
              setForm(prev => ({ ...prev, category: categoryData.id }));
              return;
            }
          } catch (err) {
            console.warn("Could not lookup category ID:", err);
          }
        }
        // If lookup fails or no category, set to empty string
        setForm(prev => ({ ...prev, category: "" }));
      };
      
      setForm({
        name: contractor.name || "",
        contact_name: contractor.contact_name || "",
        email: contractor.email || "",
        phone: contractor.phone || "",
        ooh_phone: contractor.ooh_phone || contractor.ooh || contractor.emergency_phone || "",
        address: contractor.address || "",
        category: "", // Will be set after lookup
        notes: contractor.notes || contractor.service_description || "",
        service_description: contractor.service_description || contractor.notes || "",
        postcode: contractor.postcode || "",
        region: contractor.region || "",
        hourly_rate: contractor.hourly_rate || "",
        callout_fee: contractor.callout_fee || "",
        website: contractor.website || "",
        site_id: contractor.site_id || "",
        type: contractor.type || "",
        status: contractor.status || "active",
        is_active: contractor.is_active !== undefined ? contractor.is_active : true,
        wa_opted_in: contractor.wa_opted_in || false,
        contract_start: contractor.contract_start ? (typeof contractor.contract_start === 'string' ? contractor.contract_start.split('T')[0] : contractor.contract_start) : "",
        contract_expiry: contractor.contract_expiry ? (typeof contractor.contract_expiry === 'string' ? contractor.contract_expiry.split('T')[0] : contractor.contract_expiry) : "",
        contract_file: contractor.contract_file || "",
        created_at: contractor.created_at || null,
        updated_at: contractor.updated_at || null,
      });
      
      // Look up category ID after setting initial form
      loadCategoryId();
    } else if (prefill) {
      setForm({
        name: prefill.name || "",
        contact_name: "",
        email: prefill.email || "",
        phone: prefill.phone || "",
        ooh_phone: prefill.ooh || "",
        address: "",
        category: "", // Always use empty string (controlled)
        notes: prefill.service_description || "",
        service_description: prefill.service_description || "",
        postcode: prefill.postcode || "",
        region: "",
        hourly_rate: prefill.hourly_rate !== null && prefill.hourly_rate !== undefined ? String(prefill.hourly_rate) : "",
        callout_fee: prefill.callout_fee !== null && prefill.callout_fee !== undefined ? String(prefill.callout_fee) : "",
        website: prefill.website || "",
        site_id: "",
        type: "",
        status: "active",
        is_active: true,
        wa_opted_in: false,
        contract_start: "",
        contract_expiry: "",
        contract_file: "",
        created_at: null,
        updated_at: null,
      });
    } else {
      setForm({
        name: "",
        contact_name: "",
        email: "",
        phone: "",
        ooh_phone: "",
        address: "",
        category: "", // Always use empty string (controlled)
        notes: "",
        service_description: "",
        postcode: "",
        region: "",
        hourly_rate: "",
        callout_fee: "",
        website: "",
        site_id: "",
        type: "",
        status: "active",
        is_active: true,
        wa_opted_in: false,
        contract_start: "",
        contract_expiry: "",
        contract_file: "",
        created_at: null,
        updated_at: null,
      });
    }
  }, [isOpen, contractor, prefill]);

  const showToast = (msg: string) => alert(msg);

  const handleSave = async () => {
    console.log("🚀 [AddContractorModal] handleSave called - NEW CODE VERSION");
    
    // Only validate required fields (name and category are NOT NULL in table)
    if (!form.name.trim()) {
      showToast("Please enter a contractor name");
      return;
    }

    if (!form.category || form.category.trim() === "") {
      showToast("Please select a category");
      return;
    }

    if (!companyId) {
      showToast("Company context missing — please refresh or reselect company.");
      return;
    }

    setLoading(true);

    try {
      // Look up category name from category ID
      // Only try to lookup if it looks like a UUID (36 chars with dashes)
      let categoryName = form.category || '';
      if (form.category && form.category.trim() !== '') {
        const categoryValue = form.category.trim();
        // Check if it looks like a UUID (basic validation)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryValue);
        
        if (isUUID) {
          try {
            const { data: categoryData, error: catError } = await supabase
              .from("contractor_categories")
              .select("name")
              .eq("id", categoryValue)
              .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors if not found
            
            if (!catError && categoryData && categoryData.name) {
              categoryName = categoryData.name;
              console.log("✅ Category lookup successful:", categoryName);
            } else {
              // If lookup fails, use the value as-is (might already be a name)
              console.warn("⚠️ Category lookup failed, using value as-is:", catError);
              categoryName = categoryValue; // Use the ID or value as-is
            }
          } catch (err) {
            console.error("❌ Category lookup error:", err);
            categoryName = categoryValue; // Fallback to form value
          }
        } else {
          // Not a UUID, assume it's already a category name
          categoryName = categoryValue;
          console.log("📝 Using category as name (not a UUID):", categoryName);
        }
      } else {
        console.warn("⚠️ No category selected in form");
        categoryName = ''; // Default to empty string for NOT NULL column
      }
      
      console.log("📝 Final categoryName:", categoryName, "form.category:", form.category);
      console.log("📝 Category details:", {
        formCategory: form.category,
        categoryName: categoryName,
        categoryNameType: typeof categoryName,
        categoryNameLength: categoryName?.length,
        isEmpty: !categoryName || categoryName.trim() === ''
      });

      // Build notes field - just the service description, not other fields
      // Other fields (postcode, website, hourly_rate, callout_fee) are saved to their own columns
      let notes = form.notes || form.service_description || "";

      // Use contractors table directly - include ALL form fields in their proper columns
      // CRITICAL: Ensure category is always a non-empty string (NOT NULL constraint)
      const finalCategory = categoryName && categoryName.trim() !== '' ? categoryName.trim() : '';
      
      const contractorTableData: any = {
        company_id: companyId,
        name: form.name.trim(),
        contact_name: form.contact_name?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        ooh_phone: form.ooh_phone?.trim() || null,
        ooh: form.ooh_phone?.trim() || null, // Also set ooh for compatibility
        address: form.address?.trim() || null,
        postcode: form.postcode?.trim() || null,
        region: form.region?.trim() || null,
        website: form.website?.trim() || null,
        hourly_rate: form.hourly_rate !== null && form.hourly_rate !== "" ? Number(form.hourly_rate) : null,
        callout_fee: form.callout_fee !== null && form.callout_fee !== "" ? Number(form.callout_fee) : null,
        category: finalCategory, // Required field - must be text, NOT NULL, ensure it's never null or undefined
        notes: notes || null,
        site_id: form.site_id && form.site_id.trim() !== '' ? form.site_id : null,
        type: form.type && form.type.trim() !== '' ? form.type.trim() : null,
        status: form.status || 'active',
        is_active: form.is_active !== undefined ? form.is_active : true,
        contract_start: form.contract_start ? form.contract_start : null,
        contract_expiry: form.contract_expiry ? form.contract_expiry : null,
        contract_file: form.contract_file?.trim() || null,
      };
      
      // Explicit validation for category
      if (!contractorTableData.category || contractorTableData.category === '') {
        console.error("❌ CRITICAL: Category is empty! This will fail NOT NULL constraint!");
        showToast("Category is required. Please select a category.");
        setLoading(false);
        return;
      }
      
      console.log("✅ Category validation passed:", {
        category: contractorTableData.category,
        type: typeof contractorTableData.category,
        length: contractorTableData.category.length
      });
      
      // Ensure contact_name is properly set (nullable field - use null if empty)
      const trimmedContactName = contractorTableData.contact_name?.trim();
      if (!trimmedContactName || trimmedContactName === '') {
        contractorTableData.contact_name = null;
        console.warn("⚠️ contact_name is empty, setting to null");
      } else {
        contractorTableData.contact_name = trimmedContactName;
      }
      
      // Ensure category is never null (it's NOT NULL in the table)
      const trimmedCategory = contractorTableData.category?.trim();
      if (!trimmedCategory || trimmedCategory === '') {
        contractorTableData.category = ''; // Use empty string, not null (required by NOT NULL constraint)
        console.warn("⚠️ category is empty, using default empty string");
      } else {
        contractorTableData.category = trimmedCategory;
      }
      
      console.log("📋 [AddContractorModal] Full contractor data being saved:", {
        companyId,
        contractorTableData,
        contact_name: contractorTableData.contact_name,
        address: contractorTableData.address,
        category: contractorTableData.category,
        site_id: contractorTableData.site_id,
        type: contractorTableData.type,
        categoryName,
        formCategory: form.category,
        formSiteId: form.site_id,
        formType: form.type,
        contact_name_type: typeof contractorTableData.contact_name,
        category_type: typeof contractorTableData.category,
        site_id_type: typeof contractorTableData.site_id,
        type_type: typeof contractorTableData.type
      });

      // Use RPC function to bypass PostgREST schema cache issues
      // This ensures contact_name, address, and category are definitely saved
      if (contractor?.id) {
        console.log("🔵 [AddContractorModal] Updating via RPC:", contractor.id);
        
        // Build RPC parameters - ensure all are explicitly set (even if null)
        const rpcParams: any = {
          p_id: contractor.id,
          p_company_id: contractorTableData.company_id,
          p_name: contractorTableData.name,
          p_category: contractorTableData.category || '', // Required, never null
          p_contact_name: contractorTableData.contact_name ?? null,
          p_email: contractorTableData.email ?? null,
          p_phone: contractorTableData.phone ?? null,
          p_ooh_phone: contractorTableData.ooh_phone ?? null,
          p_address: contractorTableData.address ?? null,
          p_postcode: contractorTableData.postcode ?? null,
          p_region: contractorTableData.region ?? null,
          p_website: contractorTableData.website ?? null,
          p_hourly_rate: contractorTableData.hourly_rate ?? null,
          p_callout_fee: contractorTableData.callout_fee ?? null,
          p_notes: contractorTableData.notes ?? null,
          p_site_id: contractorTableData.site_id ?? null,
          p_type: contractorTableData.type ?? null,
          p_status: contractorTableData.status || 'active',
          p_is_active: contractorTableData.is_active !== undefined ? contractorTableData.is_active : true,
          p_contract_start: contractorTableData.contract_start ?? null,
          p_contract_expiry: contractorTableData.contract_expiry ?? null,
          p_contract_file: contractorTableData.contract_file ?? null,
        };
        
        console.log("📤 [AddContractorModal] RPC Parameters being sent:", {
          contact_name: rpcParams.p_contact_name,
          address: rpcParams.p_address,
          category: rpcParams.p_category,
          site_id: rpcParams.p_site_id,
          type: rpcParams.p_type,
        });
        
        console.log("🔵 [AddContractorModal] Calling RPC with params:", JSON.stringify(rpcParams, null, 2));
        
        const { data: updated, error: uerr } = await supabase
          .rpc("update_contractor_simple", rpcParams);
        
        if (uerr) {
          console.error("❌ [AddContractorModal] RPC Update error:", uerr);
          console.error("❌ [AddContractorModal] Error code:", uerr.code);
          console.error("❌ [AddContractorModal] Error message:", uerr.message);
          console.error("❌ [AddContractorModal] Error details:", uerr.details);
          console.error("❌ [AddContractorModal] Error hint:", uerr.hint);
          throw uerr;
        }
        
        if (!updated || updated.length === 0) {
          console.error("❌ [AddContractorModal] RPC returned no data!");
          throw new Error("Update returned no data");
        }
        
        console.log("✅ [AddContractorModal] RPC Update result:", updated);
        if (updated && updated[0]) {
          const result = updated[0];
          console.log("📊 SAVED VALUES (FULL):", JSON.stringify(result, null, 2));
          console.log("📊 SAVED VALUES (KEY FIELDS):");
          console.log("  - contact_name:", result.contact_name, "(sent:", contractorTableData.contact_name, ")");
          console.log("  - address:", result.address, "(sent:", contractorTableData.address, ")");
          console.log("  - category:", result.category, "(sent:", contractorTableData.category, ")");
          console.log("  - website:", result.website, "(sent:", contractorTableData.website, ")");
          console.log("  - site_id:", result.site_id, "(sent:", contractorTableData.site_id, ")");
          console.log("  - type:", result.type, "(sent:", contractorTableData.type, ")");
          console.log("  - contract_start:", result.contract_start, "(sent:", contractorTableData.contract_start, ")");
          console.log("  - contract_expiry:", result.contract_expiry, "(sent:", contractorTableData.contract_expiry, ")");
          
          // Verify by querying the database directly
          console.log("🔍 [AddContractorModal] Verifying by querying database directly...");
          const { data: verifyData, error: verifyError } = await supabase
            .from("contractors")
            .select("id, contact_name, address, category, website, site_id, type, contract_start, contract_expiry")
            .eq("id", contractor.id)
            .single();
          
          if (verifyError) {
            console.error("❌ [AddContractorModal] Verification query error:", verifyError);
          } else {
            console.log("🔍 [AddContractorModal] Database verification:", verifyData);
            console.log("🔍 [AddContractorModal] Verification comparison:", {
              contact_name: { rpc: result.contact_name, db: verifyData.contact_name, match: result.contact_name === verifyData.contact_name },
              address: { rpc: result.address, db: verifyData.address, match: result.address === verifyData.address },
              category: { 
                rpc: result.category, 
                db: verifyData.category, 
                sent: contractorTableData.category,
                match: result.category === verifyData.category,
                rpcMatchesSent: result.category === contractorTableData.category,
                dbMatchesSent: verifyData.category === contractorTableData.category
              },
              website: { rpc: result.website, db: verifyData.website, match: result.website === verifyData.website },
              site_id: { rpc: result.site_id, db: verifyData.site_id, match: result.site_id === verifyData.site_id },
              type: { rpc: result.type, db: verifyData.type, match: result.type === verifyData.type },
            });
            
            // Explicit check for category
            if (verifyData.category !== contractorTableData.category) {
              console.error("❌ CRITICAL: Category mismatch!", {
                sent: contractorTableData.category,
                rpcReturned: result.category,
                databaseHas: verifyData.category
              });
            } else {
              console.log("✅ Category verified in database:", verifyData.category);
            }
          }
          
          // Helper function to normalize values for comparison (treat null, undefined, and empty string as equivalent)
          const normalize = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            return String(val).trim();
          };
          
          // Check for mismatches (using normalized comparison)
          const sentContactName = normalize(contractorTableData.contact_name);
          const savedContactName = normalize(result.contact_name);
          if (sentContactName !== savedContactName) {
            console.warn("⚠️ contact_name mismatch:", { sent: sentContactName, saved: savedContactName });
          }
          
          const sentAddress = normalize(contractorTableData.address);
          const savedAddress = normalize(result.address);
          if (sentAddress !== savedAddress) {
            console.warn("⚠️ address mismatch:", { sent: sentAddress, saved: savedAddress });
          }
          
          const sentCategory = normalize(contractorTableData.category) || '';
          const savedCategory = normalize(result.category) || '';
          if (sentCategory !== savedCategory) {
            console.warn("⚠️ category mismatch:", { sent: sentCategory, saved: savedCategory });
          }
          
          // For site_id, compare as strings (UUIDs) - handle null/undefined
          const sentSiteId = contractorTableData.site_id ? String(contractorTableData.site_id) : null;
          const savedSiteId = result.site_id ? String(result.site_id) : null;
          if (sentSiteId !== savedSiteId) {
            console.warn("⚠️ site_id mismatch:", { sent: sentSiteId, saved: savedSiteId });
          }
          
          const sentType = normalize(contractorTableData.type);
          const savedType = normalize(result.type);
          if (sentType !== savedType) {
            console.warn("⚠️ type mismatch:", { sent: sentType, saved: savedType });
          }
        }
      } else {
        console.log("🔵 [AddContractorModal] Inserting via RPC:", contractorTableData);
        
        // Build RPC parameters - ensure all are explicitly set (even if null)
        const rpcParams: any = {
          p_company_id: contractorTableData.company_id,
          p_name: contractorTableData.name,
          p_category: contractorTableData.category || '', // Required, never null
          p_contact_name: contractorTableData.contact_name ?? null,
          p_email: contractorTableData.email ?? null,
          p_phone: contractorTableData.phone ?? null,
          p_ooh_phone: contractorTableData.ooh_phone ?? null,
          p_address: contractorTableData.address ?? null,
          p_postcode: contractorTableData.postcode ?? null,
          p_region: contractorTableData.region ?? null,
          p_website: contractorTableData.website ?? null,
          p_hourly_rate: contractorTableData.hourly_rate ?? null,
          p_callout_fee: contractorTableData.callout_fee ?? null,
          p_notes: contractorTableData.notes ?? null,
          p_site_id: contractorTableData.site_id ?? null,
          p_type: contractorTableData.type ?? null,
          p_status: contractorTableData.status || 'active',
          p_is_active: contractorTableData.is_active !== undefined ? contractorTableData.is_active : true,
          p_contract_start: contractorTableData.contract_start ?? null,
          p_contract_expiry: contractorTableData.contract_expiry ?? null,
          p_contract_file: contractorTableData.contract_file ?? null,
        };
        
        console.log("📤 [AddContractorModal] RPC Parameters being sent:", {
          contact_name: rpcParams.p_contact_name,
          address: rpcParams.p_address,
          category: rpcParams.p_category,
          site_id: rpcParams.p_site_id,
          type: rpcParams.p_type,
        });
        
        console.log("🔵 [AddContractorModal] Calling RPC with params:", JSON.stringify(rpcParams, null, 2));
        
        const { data: inserted, error: ierr } = await supabase
          .rpc("insert_contractor_simple", rpcParams);
        
        if (ierr) {
          console.error("❌ [AddContractorModal] RPC Insert error:", ierr);
          console.error("❌ [AddContractorModal] Error code:", ierr.code);
          console.error("❌ [AddContractorModal] Error message:", ierr.message);
          console.error("❌ [AddContractorModal] Error details:", ierr.details);
          console.error("❌ [AddContractorModal] Error hint:", ierr.hint);
          throw ierr;
        }
        
        if (!inserted || inserted.length === 0) {
          console.error("❌ [AddContractorModal] RPC returned no data!");
          throw new Error("Insert returned no data");
        }
        
        console.log("✅ [AddContractorModal] RPC Insert result:", inserted);
        if (inserted && inserted[0]) {
          const result = inserted[0];
          console.log("📊 SAVED VALUES (FULL):", JSON.stringify(result, null, 2));
          console.log("📊 SAVED VALUES (KEY FIELDS):");
          console.log("  - contact_name:", result.contact_name, "(sent:", contractorTableData.contact_name, ")");
          console.log("  - address:", result.address, "(sent:", contractorTableData.address, ")");
          console.log("  - category:", result.category, "(sent:", contractorTableData.category, ")");
          console.log("  - website:", result.website, "(sent:", contractorTableData.website, ")");
          console.log("  - site_id:", result.site_id, "(sent:", contractorTableData.site_id, ")");
          console.log("  - type:", result.type, "(sent:", contractorTableData.type, ")");
          console.log("  - contract_start:", result.contract_start, "(sent:", contractorTableData.contract_start, ")");
          console.log("  - contract_expiry:", result.contract_expiry, "(sent:", contractorTableData.contract_expiry, ")");
          
          // Verify by querying the database directly
          console.log("🔍 [AddContractorModal] Verifying by querying database directly...");
          const { data: verifyData, error: verifyError } = await supabase
            .from("contractors")
            .select("id, contact_name, address, category, website, site_id, type, contract_start, contract_expiry")
            .eq("id", result.id)
            .single();
          
          if (verifyError) {
            console.error("❌ [AddContractorModal] Verification query error:", verifyError);
          } else {
            console.log("🔍 [AddContractorModal] Database verification:", verifyData);
            console.log("🔍 [AddContractorModal] Verification comparison:", {
              contact_name: { rpc: result.contact_name, db: verifyData.contact_name, match: result.contact_name === verifyData.contact_name },
              address: { rpc: result.address, db: verifyData.address, match: result.address === verifyData.address },
              category: { rpc: result.category, db: verifyData.category, match: result.category === verifyData.category },
              website: { rpc: result.website, db: verifyData.website, match: result.website === verifyData.website },
              site_id: { rpc: result.site_id, db: verifyData.site_id, match: result.site_id === verifyData.site_id },
              type: { rpc: result.type, db: verifyData.type, match: result.type === verifyData.type },
            });
          }
          
          // Helper function to normalize values for comparison (treat null, undefined, and empty string as equivalent)
          const normalize = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            return String(val).trim();
          };
          
          // Check for mismatches (using normalized comparison)
          const sentContactName = normalize(contractorTableData.contact_name);
          const savedContactName = normalize(result.contact_name);
          if (sentContactName !== savedContactName) {
            console.warn("⚠️ contact_name mismatch:", { sent: sentContactName, saved: savedContactName });
          }
          
          const sentAddress = normalize(contractorTableData.address);
          const savedAddress = normalize(result.address);
          if (sentAddress !== savedAddress) {
            console.warn("⚠️ address mismatch:", { sent: sentAddress, saved: savedAddress });
          }
          
          const sentCategory = normalize(contractorTableData.category) || '';
          const savedCategory = normalize(result.category) || '';
          if (sentCategory !== savedCategory) {
            console.warn("⚠️ category mismatch:", { sent: sentCategory, saved: savedCategory });
          }
          
          // For site_id, compare as strings (UUIDs) - handle null/undefined
          const sentSiteId = contractorTableData.site_id ? String(contractorTableData.site_id) : null;
          const savedSiteId = result.site_id ? String(result.site_id) : null;
          if (sentSiteId !== savedSiteId) {
            console.warn("⚠️ site_id mismatch:", { sent: sentSiteId, saved: savedSiteId });
          }
          
          const sentType = normalize(contractorTableData.type);
          const savedType = normalize(result.type);
          if (sentType !== savedType) {
            console.warn("⚠️ type mismatch:", { sent: sentType, saved: savedType });
          }
        }
      }

      // Sync WhatsApp contact if phone provided and opted in
      if (form.phone && form.wa_opted_in) {
        fetch('/api/whatsapp/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: form.phone,
            display_name: form.contact_name || form.name,
            contact_type: 'contractor',
            opted_in: true,
          }),
        }).catch(() => {}); // Fire-and-forget
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving contractor:", err);
      const errorMessage = err?.message || "Failed to save contractor. Please try again.";
      showToast(errorMessage);
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
      <div className="bg-neutral-900 border border-white/10 rounded-lg w-full max-w-4xl p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-theme-primary mb-6">
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
