"use client";

import { useState, useEffect } from "react";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { supabase } from "@/lib/supabase";
import { getLocationFromPostcode, isValidPostcodeForLookup } from "@/lib/locationLookup";

// Simple UK postcode validator
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/;

type Props = {
  form: any;
  setForm: (form: any) => void;
  isEditing?: boolean;
};

export default function ContractorForm({ form, setForm, isEditing = false }: Props) {
  const [postcodeError, setPostcodeError] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!form.name || form.name.length < 2) return;

    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companyEnrich?query=${encodeURIComponent(form.name)}`);
        const data = await res.json();

        if (data.website) {
          console.log("Website found:", data.website);
          setForm((prev) => ({
            ...prev,
            website: data.website,
            address: data.address_line || prev.address,
            postcode: data.postcode || prev.postcode,
          }));
        }
      } catch (err) {
        console.warn("Company enrich failed", err);
      }
    }, 500); // half-second debounce for typing

    return () => clearTimeout(delay);
  }, [form.name]);

  // Auto-populate region from postcode
  useEffect(() => {
    if (form.postcode && isValidPostcodeForLookup(form.postcode)) {
      const { region } = getLocationFromPostcode(form.postcode);
      if (region && region !== form.region) {
        setForm((prev) => ({
          ...prev,
          region,
        }));
      }
    }
  }, [form.postcode]);

  function validatePostcode(postcode: string) {
    if (!postcode) return setPostcodeError("");
    setPostcodeError(UK_POSTCODE_REGEX.test(postcode) ? "" : "Invalid UK postcode format");
  }

  // Live search as user types
  useEffect(() => {
    if (!query || query.length < 2) {
      setLookupResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/companyLookup?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setLookupResults(data.results || []);
      } catch (err) {
        console.error("Lookup failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  const handleSelect = async (selected: any) => {
    setForm((prev) => ({
      ...prev,
      name: selected.name,
      postcode: selected.postcode || "",
      address: selected.address_line || "",
      region: selected.region || "",
    }));
    setLookupResults([]);

    try {
      const res = await fetch(`/api/companyEnrich?query=${encodeURIComponent(selected.name)}`);
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        website: data.website || prev.website,
        address: data.address_line || prev.address,
        postcode: data.postcode || prev.postcode,
      }));
    } catch (err) {
      console.warn("Company enrich failed", err);
    }
  };



  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* LEFT COLUMN */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300">Company Name *</label>
          <div className="space-y-1 relative">
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setQuery(e.target.value);
              }}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              placeholder="Start typing company name..."
            />
            {loading && <div className="absolute right-3 top-8 text-xs text-gray-400">...</div>}

            {lookupResults.length > 0 && (
              <ul className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-md w-full mt-1 max-h-60 overflow-y-auto">
                {lookupResults.map((r: any) => (
                  <li
                    key={r.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelect(r)}
                  >
                    <div className="font-medium text-gray-800">{r.name}</div>
                    {r.address_line && (
                      <div className="text-xs text-gray-500 truncate">{r.address_line}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Address</label>
          <input
            type="text"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">Postcode</label>
            <input
              type="text"
              value={form.postcode || ""}
              onChange={(e) => {
                const cleanValue = e.target.value.toUpperCase().trim();
                setForm({ ...form, postcode: cleanValue });
                validatePostcode(cleanValue);
              }}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
            {postcodeError && <p className="text-red-400 text-sm mt-1">{postcodeError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Region</label>
            <input
              type="text"
              value={form.region || ""}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Website</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={form.website || ""}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">Callout Fee (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.callout_fee || ""}
              onChange={(e) => setForm({ ...form, callout_fee: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Hourly Rate (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.hourly_rate || ""}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-3">
        <ContractorCategorySelect form={form} setForm={setForm} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">Telephone</label>
            <input
              type="text"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">OOH Phone</label>
            <input
              type="text"
              value={form.ooh_phone || ""}
              onChange={(e) => setForm({ ...form, ooh_phone: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Service Description</label>
          <textarea
            rows={5}
            placeholder="Describe the services this contractor provides..."
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
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
      <label className="block text-sm font-medium text-gray-300">Category *</label>
      <select
        value={form.category_id || ""}
        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
      >
        <option value="">Select category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
