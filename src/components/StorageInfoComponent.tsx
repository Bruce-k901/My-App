"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { useSOP } from "@/context/SOPContext"
import { Package, FileText, Thermometer, CheckCircle, AlertTriangle, Clock, X } from "lucide-react"

interface StorageRow {
  container: string;
  storage_type: string;
  limit_type: "min" | "max" | "range";
  temp_min: number;
  temp_max: number;
  shelf_life: string;
  notes: string;
}

// UK Food Safety Law compliance guide
const STORAGE_TEMP_GUIDE = {
  "Chiller": { 
    type: "range",
    min: 0, 
    max: 5,
    tooltip: "UK Legal: ≤8°C max / Recommended: 0-5°C"
  },
  "Freezer": { 
    type: "max",
    min: 0, 
    max: -18,
    tooltip: "UK Legal: ≤-18°C / Recommended: -20°C ±2°C"
  },
  "Hot-holding": { 
    type: "min",
    min: 63, 
    max: 0,
    tooltip: "UK Legal: ≥63°C / Below 63°C for >2h must be discarded"
  },
  "Ambient": { 
    type: "range",
    min: 10, 
    max: 20,
    tooltip: "UK Advisory: 10-20°C / Away from direct heat/light"
  },
  "Display (Chilled)": { 
    type: "range",
    min: 0, 
    max: 5,
    tooltip: "UK Legal: ≤8°C max / Same as chiller standards"
  },
  "Display (Heated)": { 
    type: "min",
    min: 63, 
    max: 0,
    tooltip: "UK Legal: ≥63°C / Continuous monitoring required"
  }
};

export default function StorageInfoComponent({ node, updateAttributes, selected, getPos, editor }) {
  const [rows, setRows] = useState<StorageRow[]>(node.attrs.rows || []);
  const [extraNotes, setExtraNotes] = useState(node.attrs.extraNotes || "");
  const { updateStorage } = useSOP();

  // Keep TipTap JSON in sync
  useEffect(() => {
    updateAttributes({ rows, extraNotes });
  }, [rows, extraNotes, updateAttributes]);

  // Update SOP context when storage data changes
  useEffect(() => {
    if (rows.length > 0) {
      // Use the first row as the primary storage info
      const primaryRow = rows[0];
      updateStorage(
        primaryRow.temp_min !== 0 ? primaryRow.temp_min : null,
        primaryRow.temp_max !== 0 ? primaryRow.temp_max : null,
        primaryRow.storage_type
      );
    } else {
      // Reset storage data if no rows
      updateStorage(null, null, "");
    }
  }, [rows, updateStorage]);

  // Format temperature display - filter out 0s but keep them in data
  const formatTemp = (min: number, max: number, type: "min" | "max" | "range") => {
    const showMin = min !== 0;
    const showMax = max !== 0;

    if (type === "range" && showMin && showMax) return `${min}–${max} °C`;
    if (type === "min" && showMin) return `≥ ${min} °C`;
    if (type === "max" && showMax) return `≤ ${max} °C`;
    return "-";
  };

  // Check if row has valid temperature data
  const isTemperatureValid = (row: StorageRow) => {
    return row.temp_min !== 0 || row.temp_max !== 0;
  };

  // Check if temperature values comply with UK Food Safety Law
  const isCompliant = (row: StorageRow) => {
    const guide = STORAGE_TEMP_GUIDE[row.storage_type as keyof typeof STORAGE_TEMP_GUIDE];
    if (!guide) return true;

    // Check if within recommended range
    if (row.temp_min < guide.min) return false;
    if (row.temp_max > guide.max) return false;

    // Check range validation
    if (row.limit_type === "range" && row.temp_min >= row.temp_max) return false;

    return true;
  };

  // Check if temperature is within recommended range (not just legal)
  const isRecommended = (row: StorageRow) => {
    const guide = STORAGE_TEMP_GUIDE[row.storage_type as keyof typeof STORAGE_TEMP_GUIDE];
    if (!guide) return true;

    if (row.temp_min < guide.min) return false;
    if (row.temp_max > guide.max) return false;

    return true;
  };

  const addRow = () => {
    const guide = STORAGE_TEMP_GUIDE["Chiller"];
    const newRow: StorageRow = {
      container: "",
      storage_type: "Chiller",
      limit_type: guide.type,
      temp_min: guide.min,
      temp_max: guide.max,
      shelf_life: "",
      notes: ""
    };
    setRows([...rows, newRow]);
  };

  // Auto-fill temperature ranges based on storage type
  const handleStorageTypeChange = (index: number, storageType: string) => {
    const guide = STORAGE_TEMP_GUIDE[storageType as keyof typeof STORAGE_TEMP_GUIDE];
    const updated = [...rows];
    updated[index].storage_type = storageType;
    
    if (guide) {
      updated[index].limit_type = guide.type;
      updated[index].temp_min = guide.min;
      updated[index].temp_max = guide.max;
    }
    
    setRows(updated);
  };

  const removeRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  const updateRow = (index: number, key: string, value: any) => {
    const updated = [...rows];
    
    // Handle temperature field conversion
    if (key === 'temp_min' || key === 'temp_max') {
      const numValue = parseFloat(value);
      updated[index][key] = isNaN(numValue) ? 0 : numValue;
    } else {
      updated[index][key] = value;
    }
    
    setRows(updated);
  };

  const storageTypes = Object.keys(STORAGE_TEMP_GUIDE);

  const containerTypes = [
    "GN 1/3",
    "GN 1/2", 
    "GN 2/3",
    "1L Tub",
    "Vacuum Bag",
    "Cling Film",
    "Airtight Container"
  ];

  return (
    <NodeViewWrapper 
      className="sop-block relative my-4 p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm"
      data-type="storageInfo"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span 
            className="cursor-grab select-none hover:text-magenta-400 transition-colors"
            contentEditable={false}
            data-drag-handle
          >
            ☰ Drag
          </span>
          <span className="text-magenta-400 font-medium">📦 Storage & Shelf Life</span>
        </div>
        <button
          onClick={addRow}
          className="relative overflow-hidden group px-3 py-1.5 rounded-xl text-xs font-medium text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add Storage</span>
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-500 italic py-4">
            No storage instructions added yet.
          </div>
        )}
        
        {rows.map((row, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all ${
              !isTemperatureValid(row)
                ? 'border-red-400/50 bg-red-500/10'
                : 'border-gray-700/40 bg-gray-800/30 hover:bg-magenta-500/5'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Container Type */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Package size={12} />
                  Container
                </label>
                <select
                  value={row.container}
                  onChange={(e) => updateRow(index, "container", e.target.value)}
                  className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-magenta-400 focus:outline-none"
                >
                  <option value="">Select container</option>
                  {containerTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Storage Type */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <FileText size={12} />
                  Storage Type
                </label>
                <select
                  value={row.storage_type}
                  onChange={(e) => handleStorageTypeChange(index, e.target.value)}
                  className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-magenta-400 focus:outline-none"
                >
                  {storageTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Temperature Range */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Thermometer size={12} />
                  Temp (°C)
                  {isCompliant(row) ? (
                    <CheckCircle size={12} className="text-green-400" title="UK Food Safety Law Compliant" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-400" title="Outside recommended range" />
                  )}
                </label>
                <div className="flex items-center gap-1">
                  {/* Min Temperature Input */}
                  {row.limit_type === "max" ? (
                    <span className="text-gray-500 text-sm w-16 text-center">–</span>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="-?[0-9]*\.?[0-9]*"
                      value={row.temp_min === 0 ? "" : row.temp_min}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow negative numbers, decimals, and empty string
                        if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                          updateRow(index, "temp_min", value === '' || value === '-' ? 0 : Number(value) || 0);
                        }
                      }}
                      className={`w-16 bg-transparent border border-gray-700 rounded-md text-right px-2 py-2 text-sm text-white focus:outline-none ${
                        !isRecommended(row) 
                          ? 'border-amber-400/50 bg-amber-500/10' 
                          : 'border-gray-600 focus:border-magenta-400'
                      }`}
                      placeholder="2"
                      title={STORAGE_TEMP_GUIDE[row.storage_type as keyof typeof STORAGE_TEMP_GUIDE]?.tooltip}
                    />
                  )}
                  
                  <span className="text-gray-400 text-sm">–</span>
                  
                  {/* Max Temperature Input */}
                  {row.limit_type === "min" ? (
                    <span className="text-gray-500 text-sm w-16 text-center">–</span>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="-?[0-9]*\.?[0-9]*"
                      value={row.temp_max === 0 ? "" : row.temp_max}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow negative numbers, decimals, and empty string
                        if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                          updateRow(index, "temp_max", value === '' || value === '-' ? 0 : Number(value) || 0);
                        }
                      }}
                      className={`w-16 bg-transparent border border-gray-700 rounded-md text-right px-2 py-2 text-sm text-white focus:outline-none ${
                        !isRecommended(row) 
                          ? 'border-amber-400/50 bg-amber-500/10' 
                          : 'border-gray-600 focus:border-magenta-400'
                      }`}
                      placeholder="5"
                      title={STORAGE_TEMP_GUIDE[row.storage_type as keyof typeof STORAGE_TEMP_GUIDE]?.tooltip}
                    />
                  )}
                </div>
              </div>

              {/* Shelf Life */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  Shelf Life
                </label>
                <input
                  value={row.shelf_life}
                  onChange={(e) => updateRow(index, "shelf_life", e.target.value)}
                  className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-magenta-400 focus:outline-none"
                  placeholder="4 days"
                />
              </div>

              {/* Notes & Remove */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Notes / Guidance</label>
                <div className="flex items-center gap-2">
                  <input
                    value={row.notes}
                    onChange={(e) => updateRow(index, "notes", e.target.value)}
                    className="flex-1 bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-magenta-400 focus:outline-none"
                    placeholder="Label with prep & expiry date"
                  />
                  <button
                    onClick={() => removeRow(index)}
                    className="text-red-400 hover:text-red-600 text-xs transition-colors p-1"
                    title="Remove storage instruction"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Extra HACCP Notes */}
      <div className="mt-4 pt-3 border-t border-gray-700/40">
        <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
          <FileText size={12} />
          Additional HACCP Notes
        </label>
        <textarea
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-magenta-400 focus:outline-none resize-none italic"
          placeholder="Keep covered at all times. Discard any batch left out >30 min."
          rows={2}
        />
      </div>
    </NodeViewWrapper>
  )
}
