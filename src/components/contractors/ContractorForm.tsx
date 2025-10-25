"use client";

import { useState, useEffect } from "react";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { supabase } from "@/lib/supabase";
import { getLocationFromPostcode, isValidPostcodeForLookup } from "@/lib/locationLookup";

// Simple UK postcode validator
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/;

interface LookupResult {
  id: string;
  name: string;
  address_line?: string;
  postcode?: string;
  website?: string;
}

type Props = {
  form: any;
  setForm: (form: any) => void;
  isEditing?: boolean;
};

export default function ContractorForm({ form, setForm, isEditing = false }: Props) {
  const [postcodeError, setPostcodeError] = useState("");
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
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
          setForm((prev: any) => ({
            ...prev,
            website: data.website,
            address: data.address_line || prev.address,
            postcode: data.postcode || prev.postcode,
          }));
        }
      } catch (err: any) {
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
        setForm((prev: any) => ({
          ...prev,
          region,
        }));
      }
    }
  }, [form.postcode]);

  const handleSelect = (result: LookupResult) => {
    setForm({
      ...form,
      name: result.name,
      address: result.address_line || form.address,
      postcode: result.postcode || form.postcode,
      website: result.website || form.website,
    });
    setLookupResults([]);
    setQuery("");
  };

  const validatePostcode = (postcode: string) => {
    if (!postcode) {
      setPostcodeError("");
      return;
    }

    const cleanPostcode = postcode.replace(/\s+/g, " ").toUpperCase();
    if (!UK_POSTCODE_REGEX.test(cleanPostcode)) {
      setPostcodeError("Please enter a valid UK postcode");
    } else {
      setPostcodeError("");
    }
  };

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
      } catch (err: any) {
        console.warn("Lookup failed", err);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => clearTimeout(delay);
  }, [query]);

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
              required
            />
            {loading && <div className="absolute right-3 top-8 text-xs text-gray-400">...</div>}

            {lookupResults.length > 0 && (
              <ul className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-md w-full mt-1 max-h-60 overflow-y-auto">
                {lookupResults.map((r) => (
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
          <label className="block text-sm font-medium text-gray-300">Contact Name *</label>
          <input
            type="text"
            value={form.contact_name || ""}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            placeholder="Primary contact person"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Address *</label>
          <textarea
            rows={2}
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            placeholder="Full business address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Postcode *</label>
          <input
            type="text"
            value={form.postcode || ""}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              setForm({ ...form, postcode: value });
              validatePostcode(value);
            }}
            className={`w-full rounded-md border px-2 py-1 text-white ${
              postcodeError ? "border-red-500 bg-red-900/20" : "border-gray-600 bg-gray-800"
            }`}
            placeholder="SW1A 1AA"
            required
          />
          {postcodeError && <p className="text-red-400 text-xs mt-1">{postcodeError}</p>}
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
            <label className="block text-sm font-medium text-gray-300">Telephone *</label>
            <input
              type="text"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              required
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
          <label className="block text-sm font-medium text-gray-300">Email *</label>
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            required
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
      </div>
    </div>
  );
}

// Contractor Category Select Component
function ContractorCategorySelect({ form, setForm }: { form: any; setForm: (form: any) => void }) {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("contractor_categories").select("*").order("name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  return (
    <div>
      <Label htmlFor="category">Category</Label>
      <Select
        value={form.category || ""}
        onValueChange={(value: string) => setForm({ ...form, category: value })}
        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
        placeholder="Select category"
      />
    </div>
  );
}
