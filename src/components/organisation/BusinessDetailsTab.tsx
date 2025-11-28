"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

const countryList = [
  "United Kingdom",
  "United States",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Australia",
  "Vietnam",
  "South Africa",
];

const industryList = [
  "Hospitality",
  "Food & Beverage",
  "Retail",
  "Construction",
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Manufacturing",
];

type Company = {
  id?: string;
  name?: string | null;
  legal_name?: string | null;
  industry?: string | null;
  vat_number?: string | null;
  company_number?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  contact_email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  logo_url?: string | null;
};

export default function BusinessDetailsTab() {
  console.log('🚀 BusinessDetailsTab component MOUNTED');
  
  const { company: contextCompany, setCompany, profile, companyId, userId } = useAppContext();
  
  console.log('📊 BusinessDetailsTab context values:', {
    hasContextCompany: !!contextCompany,
    contextCompanyId: contextCompany?.id,
    userId,
    companyId,
    profileId: profile?.id,
    profileCompanyId: profile?.company_id,
  });
  
  const [form, setForm] = useState<Company>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    console.log('🔍 BusinessDetailsTab useEffect TRIGGERED', {
      userId,
      companyId,
      contextCompanyId: contextCompany?.id,
      profileCompanyId: profile?.company_id,
    });

    async function initCompany() {
      console.log('🔍 BusinessDetailsTab initCompany START:', {
        contextCompany: !!contextCompany,
        contextCompanyId: contextCompany?.id,
        contextCompanyName: contextCompany?.name,
        userId,
        companyId,
        profileCompanyId: profile?.company_id,
        profileId: profile?.id,
        hasInitialized,
        formId: form?.id,
      });

      // First priority: Use contextCompany if available and has data
      if (contextCompany && contextCompany.id && contextCompany.name) {
        console.log('✅ Using contextCompany directly:', contextCompany.name);
        setForm(contextCompany);
        setHasInitialized(true);
        setLoading(false);
        return;
      }

      // Wait for userId to be available
      if (!userId) {
        console.warn('⚠️ No userId yet, will retry when available');
        return;
      }

      setLoading(true);

      try {
        // Use profile from context if available
        let profileRow = profile;
        
        if (!profileRow) {
          console.log('🔄 Fetching profile...');
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, full_name, company_id, site_id")
            .eq("id", userId)
            .maybeSingle();

          if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
          } else if (data) {
            profileRow = data;
            console.log('✅ Profile fetched:', { id: profileRow.id, company_id: profileRow.company_id });
          } else {
            console.warn('⚠️ No profile found for userId:', userId);
          }
        } else {
          console.log('✅ Using profile from context:', { id: profileRow.id, company_id: profileRow.company_id });
        }

        // Determine which company_id to use
        const companyIdToUse = profileRow?.company_id || companyId || contextCompany?.id;
        console.log('🔍 Company ID to use:', companyIdToUse);

        if (companyIdToUse) {
          console.log('🔄 Fetching company with ID:', companyIdToUse);
          
          // Try multiple query strategies
          let companyData = null;
          let companyError = null;

          // Strategy 1: Direct ID lookup
          const { data: directData, error: directError } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyIdToUse)
            .maybeSingle();

          if (!directError && directData) {
            companyData = directData;
            console.log('✅ Company found via direct ID lookup:', directData.name);
          } else {
            console.log('⚠️ Direct lookup failed, trying created_by:', directError);
            
            // Strategy 2: Created by user
            const { data: createdData, error: createdError } = await supabase
              .from("companies")
              .select("*")
              .eq("created_by", userId)
              .maybeSingle();

            if (!createdError && createdData) {
              companyData = createdData;
              console.log('✅ Company found via created_by:', createdData.name);
            } else {
              companyError = createdError;
              console.log('⚠️ Created_by lookup failed:', createdError);
            }
          }

          if (companyData && companyData.id) {
            console.log('✅ Setting company data:', companyData.name);
            setCompany(companyData);
            setForm(companyData);
            setHasInitialized(true);
          } else {
            console.warn('⚠️ No company found, using empty form');
            console.log('Company query errors:', { directError, companyError });
            setForm({
              name: "",
              legal_name: "",
              industry: "",
              vat_number: "",
              company_number: "",
              phone: "",
              website: "",
              country: "",
              contact_email: profileRow?.email || "",
            });
            setHasInitialized(true);
          }
        } else {
          console.warn('⚠️ No company_id available anywhere');
          setForm({
            name: "",
            legal_name: "",
            industry: "",
            vat_number: "",
            company_number: "",
            phone: "",
            website: "",
            country: "",
            contact_email: profileRow?.email || "",
          });
          setHasInitialized(true);
        }
      } catch (err) {
        console.error('❌ Exception in initCompany:', err);
      } finally {
        setLoading(false);
      }
    }

    // Only run if we haven't initialized or if key values changed
    if (!hasInitialized || !form?.id) {
      initCompany();
    } else {
      console.log('⏭️ Skipping - already initialized with form ID:', form.id);
    }
  }, [userId, companyId, contextCompany?.id, profile?.company_id]); // Depend on IDs only

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...(prev as Company), [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `logos/${form.id || "temp"}/${file.name}`;
      const { error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(path);
      await supabase.from("companies").update({ logo_url: publicUrl }).eq("id", form.id);
      setForm({ ...form, logo_url: publicUrl });
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Get the current authenticated user ID
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) {
      console.error("No authenticated user found");
      setSaving(false);
      return;
    }
    
    const payload = {
      ...form,
      // Always use the authenticated user's ID for user_id and created_by
      created_by: authUser.id,
      user_id: authUser.id,
      status: (form as any).status || "draft",
      onboarding_step: (form as any).onboarding_step || 1,
    } as any;

    let result;
    if (form.id) {
      // Update existing company
      result = await supabase
        .from("companies")
        .update(payload)
        .eq("id", form.id)
        .select("*")
        .single();
    } else {
      // Insert new company - handle name conflict by appending user ID
      // First check if company name already exists for this user
      const { data: existing } = await supabase
        .from("companies")
        .select("id, name")
        .eq("name", payload.name)
        .eq("user_id", authUser.id)
        .maybeSingle();
      
      if (existing) {
        // Company with this name already exists for this user - update it instead
        result = await supabase
          .from("companies")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();
      } else {
        // Insert new company
        result = await supabase
          .from("companies")
          .insert([payload])
          .select("*")
          .single();
      }
    }

    if (result.error) {
      console.error("Save error:", result.error?.message ?? result.error);
      setSaving(false);
      return;
    }

    if (result.data) {
      setCompany(result.data);
      setForm(result.data);

      // Update user metadata with company context
      try {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            company_id: result.data.id,
            company_name: result.data.name,
          },
        });
        if (metadataError) {
          console.error("Failed to update user metadata:", metadataError);
        } else {
          console.log("✅ User metadata updated with company_id:", result.data.id);
        }
      } catch (e) {
        console.error("Failed to update user metadata:", e);
      }

      // Also ensure profile table reflects the company (match id OR auth_user_id)
      // IMPORTANT: Use .maybeSingle() first to find the correct profile, then update by specific id
      // This prevents updating multiple profiles if duplicates exist
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          // First, find the correct profile (check both id and auth_user_id)
          const { data: profile, error: findError } = await supabase
            .from("profiles")
            .select("id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();
          
          if (findError) {
            console.error("Failed to find profile:", findError);
          } else if (profile?.id) {
            // Update ONLY the specific profile by its id (not using .or() which could match multiple)
            const { error: profileError } = await supabase
              .from("profiles")
              .update({ company_id: result.data.id, updated_at: new Date().toISOString() })
              .eq("id", profile.id); // Use specific id, not .or()
            
            if (profileError) {
              console.error("Failed to update profile:", profileError);
            } else {
              console.log("✅ Successfully updated profile company_id:", profile.id);
            }
          } else {
            console.warn("⚠️ No profile found for user:", user.id);
          }
        }
      } catch (e) {
        console.error("Failed to update profile:", e);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Reload to ensure context picks up new metadata immediately
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    setSaving(false);
  };

  if (loading) {
    console.log('⏳ BusinessDetailsTab showing loading state');
    return <p>Loading...</p>;
  }

  console.log('✅ BusinessDetailsTab rendered, form:', {
    hasForm: !!form,
    formId: form?.id,
    formName: form?.name,
    formKeys: Object.keys(form || {}),
  });

  const requiredFields = ["name", "industry", "country", "contact_email"];
  const fields = [
    "name",
    "legal_name",
    "industry",
    "vat_number",
    "company_number",
    "phone",
    "website",
    "country",
  ];

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 max-w-3xl">
      {fields.map((field) => (
        <div key={field} className="flex flex-col">
          <label className="block text-sm font-medium mb-1 capitalize">
            {field === "name" ? "Business Name" : field.replace("_", " ")}
            {requiredFields.includes(field) && (
              <span className="text-pink-500 ml-1">*</span>
            )}
          </label>
          {field === "industry" ? (
            <select
              name="industry"
              value={(form as any).industry || ""}
              onChange={handleChange}
              className="w-full bg-gray-800 p-1.5 rounded-md text-sm focus:ring-1 focus:ring-pink-500"
            >
              <option value="">Select industry</option>
              {industryList.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field === "country" ? (
            <select
              name="country"
              value={(form as any).country || ""}
              onChange={handleChange}
              className="w-full bg-gray-800 p-1.5 rounded-md text-sm focus:ring-1 focus:ring-pink-500"
            >
              <option value="">Select country</option>
              {countryList.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name={field}
              value={(form as any)[field] || ""}
              onChange={handleChange}
              placeholder={field === "name" ? "Enter business name" : `Enter ${field.replace("_", " ")}`}
              className="bg-gray-800 p-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          )}
        </div>
      ))}

      {/* Address Section */}
      <div className="col-span-full mt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Address Line 1" name="address_line1" value={(form as any).address_line1} onChange={handleChange} />
          <Field label="Address Line 2" name="address_line2" value={(form as any).address_line2} onChange={handleChange} />
          <Field label="City" name="city" value={(form as any).city} onChange={handleChange} />
          <Field label="Postcode" name="postcode" value={(form as any).postcode} onChange={handleChange} />

          {/* Contact Email under City (left column) */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-1">Contact Email <span className="text-pink-500">*</span></label>
            <input
              type="email"
              name="contact_email"
              value={(form as any).contact_email || ""}
              onChange={handleChange}
              className="bg-gray-800 p-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          {/* Company Logo next to Email (right column) */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Company Logo</label>
            {(form as any).logo_url && (
              <img src={(form as any).logo_url as string} alt="Logo" className="h-16 rounded-md mb-2 border border-gray-700" />
            )}
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
            {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
          </div>
        </div>
      </div>

      <div className="col-span-full flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-md transition-all duration-200 text-sm"
        >
          {saving ? "Saving..." : (form as any).id ? "Update Company" : "Create Company"}
        </button>
        <button
          type="button"
          onClick={() => setForm(contextCompany || {})}
          className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
        >
          Cancel
        </button>
      </div>
      {saved && (
        <p className="text-green-400 text-sm mt-1 col-span-full">
          Company details saved successfully.
        </p>
      )}
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function Field({ label, name, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={onChange}
        className="bg-gray-800 p-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
      />
    </div>
  );
}