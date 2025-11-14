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
  const { company: contextCompany, setCompany, profile, companyId, userId } = useAppContext();
  const [form, setForm] = useState<Company>(contextCompany || {});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function initCompany() {
      if (contextCompany) {
        setForm(contextCompany);
        setLoading(false);
        return;
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
        .eq("id", userId)
        .maybeSingle();

      const { data } = await supabase
        .from("companies")
        .select("*")
        .or(`created_by.eq.${userId},id.eq.${profileRow?.company_id || ""}`)
        .limit(1);

      const row = Array.isArray(data) ? data?.[0] : (data as any);
      if (row) {
        setCompany(row);
        setForm(row);
      } else {
        setForm({
          name: "",
          legal_name: "",
          industry: "",
          vat_number: "",
          company_number: "",
          phone: "",
          website: "",
          country: "",
          contact_email: profile?.email ?? "",
        });
      }

      setLoading(false);
    }

    initCompany();
  }, [contextCompany]);

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
    const payload = {
      ...form,
      created_by: (form as any).created_by || profile?.id,
      user_id: (form as any).user_id || profile?.id,
      status: (form as any).status || "draft",
      onboarding_step: (form as any).onboarding_step || 1,
    } as any;

    const result = form.id
      ? await supabase
          .from("companies")
          .update(payload)
          .eq("id", form.id)
          .select("*")
          .single()
      : await supabase
          .from("companies")
          .insert([payload])
          .select("*")
          .single();

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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ company_id: result.data.id, updated_at: new Date().toISOString() })
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`);
          if (profileError) {
            console.error("Failed to update profile:", profileError);
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

  if (loading) return <p>Loading...</p>;

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