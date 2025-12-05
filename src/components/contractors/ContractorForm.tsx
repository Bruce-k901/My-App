"use client";

import { useState, useEffect, useRef } from "react";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import SiteSelector from "@/components/ui/SiteSelector";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { getLocationFromPostcode, isValidPostcodeForLookup } from "@/lib/locationLookup";
import { Upload, X, FileText } from "lucide-react";

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
  const { companyId } = useAppContext();
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

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
          <label className="block text-sm font-medium text-gray-300">Contact Name</label>
          <input
            type="text"
            value={form.contact_name || ""}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            placeholder="Primary contact person"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Address</label>
          <textarea
            rows={2}
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            placeholder="Full business address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Postcode</label>
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
          />
          {postcodeError && <p className="text-red-400 text-xs mt-1">{postcodeError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Region</label>
          <input
            type="text"
            value={form.region || ""}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            placeholder="Auto-populated from postcode"
          />
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
            rows={3}
            placeholder="Describe the services this contractor provides..."
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Site</label>
          <SiteSelector
            value={form.site_id || null}
            onChange={(value) => setForm({ ...form, site_id: value || "" })}
            placeholder="All Sites (optional)"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
          <Select
            value={form.type || ""}
            onValueChange={(value: string) => setForm({ ...form, type: value })}
            options={[
              { value: "reactive", label: "Reactive" },
              { value: "ppm", label: "PPM (Planned Preventative Maintenance)" },
              { value: "warranty", label: "Warranty" },
              { value: "emergency", label: "Emergency" },
            ]}
            placeholder="Select type (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
          <Select
            value={form.status || "active"}
            onValueChange={(value: string) => setForm({ ...form, status: value })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "suspended", label: "Suspended" },
            ]}
            placeholder="Select status"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active !== undefined ? form.is_active : true}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[#EC4899] focus:ring-[#EC4899]"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
            Active Contractor
          </label>
        </div>
      </div>

      {/* THIRD COLUMN - Contract Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Contract Details</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300">Contract Start Date</label>
          <input
            type="date"
            value={form.contract_start || ""}
            onChange={(e) => setForm({ ...form, contract_start: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Contract Expiry Date</label>
          <input
            type="date"
            value={form.contract_expiry || ""}
            onChange={(e) => setForm({ ...form, contract_expiry: e.target.value })}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
          />
        </div>

        <ContractFileUpload 
          value={form.contract_file || ""}
          onChange={(url) => setForm({ ...form, contract_file: url })}
        />
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

  // Always use string value (empty string when no selection) to keep Select controlled
  const categoryValue = form.category || "";
  
  return (
    <div>
      <Label htmlFor="category">Category</Label>
      <Select
        value={categoryValue}
        onValueChange={(value: string) => setForm({ ...form, category: value })}
        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
        placeholder="Select category"
      />
    </div>
  );
}

// Contract File Upload Component
function ContractFileUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { companyId } = useAppContext();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(`File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `contract_${timestamp}_${sanitizedName}`;
      const filePath = `contracts/${companyId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, try creating it or use a different bucket
        if (uploadError.message.includes('Bucket not found')) {
          // Try using a generic bucket or create the bucket
          const fallbackPath = `contracts/${fileName}`;
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('task-documents') // Use existing bucket as fallback
            .upload(fallbackPath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (fallbackError) {
            throw fallbackError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('task-documents')
            .getPublicUrl(fallbackPath);

          onChange(publicUrl);
        } else {
          throw uploadError;
        }
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('contracts')
          .getPublicUrl(filePath);

        onChange(publicUrl);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Contract file upload error:', err);
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || 'Contract file';
    } catch {
      return url.split('/').pop() || 'Contract file';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Contract File</label>
      
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-md border border-gray-600 bg-gray-800">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="flex-1 text-sm text-white truncate">{getFileName(value)}</span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#EC4899] hover:text-[#EC4899]/80 text-xs"
          >
            View
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-400 hover:text-red-300"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Contract File
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-1">
            PDF, Word, or image files (max 10MB)
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
