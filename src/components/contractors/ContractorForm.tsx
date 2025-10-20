"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";

// Simple UK postcode validator
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/;

type Props = {
  form: any;
  setForm: (form: any) => void;
  isEditing?: boolean;
};

export default function ContractorForm({ form, setForm, isEditing = false }: Props) {
  const [postcodeError, setPostcodeError] = useState("");

  function validatePostcode(postcode: string) {
    if (!postcode) return setPostcodeError("");
    setPostcodeError(UK_POSTCODE_REGEX.test(postcode) ? "" : "Invalid UK postcode format");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    const cleanValue = id === "postcode" ? value.toUpperCase().trim() : value;
    setForm({ ...form, [id]: cleanValue });
    if (id === "postcode") validatePostcode(cleanValue);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      {/* Left column - Company + Contact + Rate fields */}
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name" className="text-white/80">
            Company Name <span className="text-red-400">*</span>
          </Label>
          <input
            id="name"
            value={form.name || ""}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <input
            id="email"
            type="email"
            value={form.email || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-white/80">Phone</Label>
          <input
            id="phone"
            value={form.phone || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="ooh" className="text-white/80">Out-of-Hours Number</Label>
          <input
            id="ooh"
            value={form.ooh || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hourly_rate" className="text-white/80">Hourly Rate (£)</Label>
            <input
              id="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              value={form.hourly_rate || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
            />
          </div>
          <div>
            <Label htmlFor="callout_fee" className="text-white/80">Callout Fee (£)</Label>
            <input
              id="callout_fee"
              type="number"
              step="0.01"
              min="0"
              value={form.callout_fee || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right column - Category + Postcode + Notes */}
      <div className="flex flex-col gap-4">
        <ContractorCategorySelect form={form} setForm={setForm} />

        <div>
          <Label htmlFor="postcode" className="text-white/80">Postcode</Label>
          <input
            id="postcode"
            value={form.postcode || ""}
            onChange={handleChange}
            placeholder="e.g. SW1A 1AA"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
          {postcodeError && <p className="text-red-400 text-sm mt-1">{postcodeError}</p>}
        </div>

        <div>
          <Label htmlFor="service_description" className="text-white/80">Service Description</Label>
          <textarea
            id="service_description"
            value={form.service_description || ""}
            onChange={(e) => setForm({ ...form, service_description: e.target.value })}
            placeholder="Describe the services this contractor provides..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none resize-none"
          />
        </div>

        <div>
          <Label htmlFor="website" className="text-white/80">Website</Label>
          <input
            id="website"
            type="url"
            value={form.website || ""}
            onChange={handleChange}
            placeholder="https://example.com"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-500/40 focus:outline-none"
          />
        </div>

        {isEditing && (form.created_at || form.updated_at) && (
          <div className="text-xs text-white/60 space-y-1">
            {form.created_at && <div>Created: {new Date(form.created_at).toLocaleDateString()}</div>}
            {form.updated_at && <div>Updated: {new Date(form.updated_at).toLocaleDateString()}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- */
/* CATEGORY SELECT (GLOBAL, NO COMPANY FILTER) */
function ContractorCategorySelect({
  form,
  setForm,
}: {
  form: any;
  setForm: (form: any) => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from("contractor_categories")
          .select("id, name")
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.warn("Failed to load categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  return (
    <div>
      <Label htmlFor="category" className="text-white/80">
        Category <span className="text-red-400">*</span>
      </Label>
      <Select
        value={form.category || ""}
        options={categories.map((c) => ({ label: c.name, value: c.name }))}
        onValueChange={(value) => setForm({ ...form, category: value })}
        placeholder={
          loading
            ? "Loading categories..."
            : categories.length === 0
            ? "No categories available"
            : "Select category"
        }
        disabled={loading}
        className="mt-1"
      />
    </div>
  );
}
