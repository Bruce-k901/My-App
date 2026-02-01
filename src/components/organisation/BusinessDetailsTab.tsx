"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  
  const router = useRouter();
  const { company: contextCompany, setCompany, profile, companyId, userId, session, company } = useAppContext();
  
  // Use selected company from context (for multi-company support)
  const effectiveCompanyId = company?.id || companyId || profile?.company_id;
  
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

      // First priority: Use selected company from context (for multi-company support)
      // Check for id OR name (company might have id but name could be null initially)
      const selectedCompany = company || contextCompany;
      if (selectedCompany && selectedCompany.id) {
        console.log('✅ Using selected company from context:', selectedCompany.name || selectedCompany.id);
        // Ensure form has all fields, even if some are null
        setForm({
          id: selectedCompany.id,
          name: selectedCompany.name || "",
          legal_name: selectedCompany.legal_name || "",
          industry: selectedCompany.industry || "",
          vat_number: selectedCompany.vat_number || "",
          company_number: selectedCompany.company_number || "",
          phone: selectedCompany.phone || "",
          website: selectedCompany.website || "",
          country: selectedCompany.country || "",
          contact_email: selectedCompany.contact_email || selectedCompany.email || profileRow?.email || "",
          address_line1: selectedCompany.address_line1 || "",
          address_line2: selectedCompany.address_line2 || "",
          city: selectedCompany.city || "",
          postcode: selectedCompany.postcode || "",
          logo_url: selectedCompany.logo_url || null,
        });
        setHasInitialized(true);
        setLoading(false);
        return;
      }
      
      // Fallback to effectiveCompanyId if no company object available
      const targetCompanyId = effectiveCompanyId || companyId || profile?.company_id;
      
      if (!targetCompanyId) {
        console.warn('⚠️ No company ID available yet');
        setLoading(false);
        return;
      }
      
      // Wait for userId to be available (from user?.id in context)
      // Also check if we have session but userId is still null (might be loading)
      if (!userId && !session) {
        // No session at all - user is logged out
        console.debug('No session - user logged out');
        setLoading(false);
        return;
      }
      
      if (!userId && session?.user?.id) {
        // Session exists but userId not set in context yet - wait a bit
        console.debug('Session exists but userId not in context yet, will retry');
        return;
      }
      
      if (!userId) {
        // No userId and no session - wait for auth to initialize
        console.debug('Waiting for userId to be available');
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
            // If 406 error, try API route fallback
            const is406Error = profileError.code === 'PGRST116' || 
              profileError.message?.includes('406') || 
              (profileError as any).status === 406 ||
              profileError.message?.includes('Not Acceptable');
            
            if (is406Error) {
              console.warn('⚠️ Profile query blocked by RLS (406), trying API route fallback');
              try {
                const apiResponse = await fetch(`/api/profile/get?userId=${userId}`);
                if (apiResponse.ok) {
                  profileRow = await apiResponse.json();
                  console.log('✅ Profile fetched via API route:', { id: profileRow.id, company_id: profileRow.company_id });
                }
              } catch (apiError) {
                console.error('❌ API route fallback failed:', apiError);
              }
            }
          } else if (data) {
            profileRow = data;
            console.log('✅ Profile fetched:', { id: profileRow.id, company_id: profileRow.company_id });
          } else if (!data && !profileError) {
            // Null data with no error - might be RLS blocking silently, try API route
            console.warn('⚠️ Profile query returned null data (RLS might be blocking), trying API route fallback');
            try {
              const apiResponse = await fetch(`/api/profile/get?userId=${userId}`);
              if (apiResponse.ok) {
                profileRow = await apiResponse.json();
                console.log('✅ Profile fetched via API route (null data fallback):', { id: profileRow.id, company_id: profileRow.company_id });
              }
            } catch (apiError) {
              console.error('❌ API route fallback failed:', apiError);
              // Profile not found - expected during first signup before profile is created
              console.debug('No profile found for userId (expected during first signup):', userId);
            }
          } else {
            // Profile not found - expected during first signup before profile is created
            console.debug('No profile found for userId (expected during first signup):', userId);
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

          // Always use API route to bypass RLS
          try {
            const response = await fetch(`/api/company/get?id=${companyIdToUse}`);
            if (response.ok) {
              companyData = await response.json();
              companyError = null;
              console.log('✅ Company found via API route:', companyData.name);
            } else {
              // Try with userId as fallback
              const fallbackResponse = await fetch(`/api/company/get?userId=${userId}`);
              if (fallbackResponse.ok) {
                companyData = await fallbackResponse.json();
                companyError = null;
                console.log('✅ Company found via API route (userId):', companyData.name);
              } else {
                const errorText = await response.text();
                companyError = new Error(`API route failed: ${errorText}`);
                console.log('⚠️ API route lookup failed:', companyError);
              }
            }
          } catch (apiError) {
            console.error('API route error:', apiError);
            companyError = apiError instanceof Error ? apiError : new Error('Unknown API error');
          }
          
          // If still no data, try one more fallback
          if (!companyData && userId) {
            try {
              const fallbackResponse = await fetch(`/api/company/get?userId=${userId}`);
              if (fallbackResponse.ok) {
                companyData = await fallbackResponse.json();
                companyError = null;
                console.log('✅ Company found via API route fallback:', companyData.name);
              }
            } catch (fallbackError) {
              console.error('Fallback API route error:', fallbackError);
            }
          }
          
          // No legacy fallback - all queries must go through API routes
          // This prevents RLS permission errors

          if (companyData && companyData.id) {
            console.log('✅ Setting company data:', companyData.name || companyData.id);
            setCompany(companyData);
            // Ensure form has all fields, even if some are null
            setForm({
              id: companyData.id,
              name: companyData.name || "",
              legal_name: companyData.legal_name || "",
              industry: companyData.industry || "",
              vat_number: companyData.vat_number || "",
              company_number: companyData.company_number || "",
              phone: companyData.phone || "",
              website: companyData.website || "",
              country: companyData.country || "",
              contact_email: companyData.contact_email || companyData.email || profileRow?.email || "",
              address_line1: companyData.address_line1 || "",
              address_line2: companyData.address_line2 || "",
              city: companyData.city || "",
              postcode: companyData.postcode || "",
              logo_url: companyData.logo_url || null,
            });
            setHasInitialized(true);
          } else {
            // No company found or error occurred
            if (companyError) {
              console.error('❌ Company query error:', companyError);
              // Check if it's a 403 (access denied) or 404 (not found)
              const errorMessage = companyError.message || '';
              if (errorMessage.includes('403') || errorMessage.includes('Access denied')) {
                console.error('❌ Access denied to company - user may not belong to this company');
              } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                console.error('❌ Company not found - company_id may be invalid');
              }
            } else {
              console.warn('⚠️ No company data returned (company may not exist or be empty)');
            }
            
            // Set empty form but log the issue
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
          // No company_id available - expected during first signup before company is created
          console.debug('No company_id available (expected during first signup)');
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
  }, [userId, companyId, contextCompany?.id, profile?.company_id, session]); // Include session to properly wait for auth

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
      // Update logo via API route to bypass RLS
      try {
        const response = await fetch("/api/company/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.id,
            logo_url: publicUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update logo");
        }
      } catch (err) {
        console.error("Logo update failed:", err);
        throw err;
      }
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
      alert("Error: No authenticated user found. Please log in again.");
      setSaving(false);
      return;
    }

    // Validate required fields
    if (!form.name || !form.name.trim()) {
      alert("Please enter a company name");
      setSaving(false);
      return;
    }
    
    console.log("📋 Form data before save:", {
      name: form.name,
      industry: form.industry,
      country: form.country,
      contact_email: form.contact_email,
      hasFormId: !!form.id,
    });
    
    // Extract firstName and lastName from profile or form
    let firstName = "";
    let lastName = "";
    
    if (profile?.full_name) {
      const nameParts = profile.full_name.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
      console.log("📝 Using name from profile:", { firstName, lastName });
    } else if (authUser?.user_metadata?.full_name) {
      const nameParts = authUser.user_metadata.full_name.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
      console.log("📝 Using name from user_metadata:", { firstName, lastName });
    } else if (authUser?.user_metadata?.first_name || authUser?.user_metadata?.last_name) {
      firstName = authUser.user_metadata.first_name || "";
      lastName = authUser.user_metadata.last_name || "";
      console.log("📝 Using name from user_metadata (first/last):", { firstName, lastName });
    } else {
      // Fallback: use email prefix as first name
      firstName = authUser.email?.split("@")[0] || "User";
      lastName = "";
      console.log("📝 Using fallback name from email:", { firstName, lastName });
    }
    
    const payload = {
      name: form.name?.trim(),
      industry: form.industry || null,
      country: form.country || null,
      contact_email: form.contact_email || authUser.email || null,
      company_number: form.company_number || null,
      vat_number: form.vat_number || null,
      legal_name: form.legal_name || null,
      phone: form.phone || null,
      website: form.website || null,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      postcode: form.postcode || null,
      // Required for API
      user_id: authUser.id,
      firstName: firstName,
      lastName: lastName,
      email: authUser.email || form.contact_email || null,
      // Legacy fields
      created_by: authUser.id,
    } as any;
    
    console.log("📤 Complete payload:", payload);

    let result;
    // Use the selected company ID (for multi-company support)
    const targetCompanyId = form.id || effectiveCompanyId;
    
    if (targetCompanyId) {
      // Update existing company via API route (bypasses RLS)
      try {
        const response = await fetch("/api/company/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetCompanyId,
            ...payload,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update company");
        }

        const companyData = await response.json();
        result = { data: companyData, error: null };
      } catch (apiError: any) {
        console.error("API route error:", apiError);
        result = { data: null, error: apiError };
      }
    } else {
      // Insert new company - use API route to bypass RLS
      try {
        console.log("📤 Sending payload to /api/company/create:", payload);
        const response = await fetch('/api/company/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        console.log("📥 Response status:", response.status, response.statusText);
        
        if (response.ok) {
          const newCompany = await response.json();
          console.log("✅ Company created successfully:", newCompany);
          result = { data: newCompany, error: null };
        } else {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error("❌ API error response:", errorData);
          result = { data: null, error: new Error(errorData.error || 'Failed to create company') };
        }
      } catch (apiError) {
        console.error("❌ API request exception:", apiError);
        result = { data: null, error: apiError instanceof Error ? apiError : new Error('Unknown error') };
      }
    }

    if (result.error) {
      const errorMessage = result.error?.message ?? result.error?.toString() ?? "Unknown error";
      console.error("Save error:", errorMessage);
      alert(`Failed to save company: ${errorMessage}`);
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
            // Profile not found - expected during first signup
            console.debug("No profile found for user (expected during first signup):", user.id);
          }
        }
      } catch (e) {
        console.error("Failed to update profile:", e);
      }

      setSaved(true);
      console.log("✅ Company saved successfully, refreshing context...");
      
      // Use router.refresh() instead of window.location.reload() to prevent hydration issues
      // This refreshes server components and re-fetches data without full page reload
      setTimeout(() => {
        router.refresh();
        // Also update the context company if available
        if (result.data) {
          setCompany(result.data);
        }
      }, 500);
    } else {
      console.error("❌ No data returned from save operation");
      alert("Error: Company was not saved. Please check the console for details.");
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
    hasContextCompany: !!contextCompany,
    contextCompanyId: contextCompany?.id,
    companyId,
    profileCompanyId: profile?.company_id,
  });

  // Show helpful message if form is empty and user has company_id
  if (!form?.id && !form?.name && profile?.company_id && hasInitialized && !loading) {
    return (
      <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3 text-sm text-slate-300">
        <p className="font-medium mb-2">⚠️ Company Data Not Found</p>
        <p className="mb-2">
          Your account is linked to a company, but the company data could not be loaded.
        </p>
        <p className="text-xs text-slate-400">
          Company ID: {profile.company_id}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Please contact an administrator or try refreshing the page.
        </p>
      </div>
    );
  }

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