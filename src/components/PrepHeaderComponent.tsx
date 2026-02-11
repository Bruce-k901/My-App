"use client"
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import { AlertTriangle, ChefHat, Scale, Palette, FileText, ChevronDown, ChevronUp } from '@/components/ui/icons';
import { useSOP } from "@/context/SOPContext";

export default function PrepHeaderComponent({ node, updateAttributes, selected, getPos, editor }) {
  console.log("🔍 Prep Header rendered", node.attrs);
  
  // SOP Context for auto-calculated data
  const { yieldData, allergens: contextAllergens, toolColour: contextToolColour, storage } = useSOP();
  
  // Identity & Version Metadata
  const [title, setTitle] = useState(node.attrs.title || "");
  const [refCode, setRefCode] = useState(node.attrs.ref_code || "");
  const [version, setVersion] = useState(node.attrs.version || "1.0");
  const [status, setStatus] = useState(node.attrs.status || "Draft");
  const [author, setAuthor] = useState(node.attrs.author || "");
  const [lastEdited, setLastEdited] = useState(node.attrs.last_edited || "");
  const [sopType, setSopType] = useState(node.attrs.sopType || "Prep");
  
  // Existing HACCP fields
  const [yieldValue, setYieldValue] = useState(node.attrs.yield || 0);
  const [unit, setUnit] = useState(node.attrs.unit || "");
  const [toolColour, setToolColour] = useState(node.attrs.toolColour || "Brown – Bakery");
  const [toolColourHex, setToolColourHex] = useState(node.attrs.toolColourHex || "#8B4513");
  const [safetyNotes, setSafetyNotes] = useState(node.attrs.safetyNotes || "");
  const [subRecipes, setSubRecipes] = useState(node.attrs.subRecipes || []);
  const [showSubRecipes, setShowSubRecipes] = useState(false);
  const [highlight, setHighlight] = useState(false);

  const colourMap = {
    "Red – Raw Meat": "#DC2626",
    "Blue – Raw Fish": "#2563EB", 
    "Green – Salad/Fruit": "#16A34A",
    "Yellow – Cooked Food": "#EAB308",
    "Brown – Vegetables": "#8B4513",
    "Brown – Bakery": "#8B4513",
    "White – Bakery/Dairy": "#F3F4F6"
  };

  const statusOptions = ["Draft", "Published", "Archived"];
  const sopTypeOptions = [
    { value: "Prep", label: "Prep" },
    { value: "Cooking", label: "Cooking" },
    { value: "Cleaning", label: "Cleaning" },
    { value: "Service", label: "Service" },
    { value: "ManualHandling", label: "Manual Handling" }
  ];

  // Dynamic reference code generation based on SOP Type and Title
  useEffect(() => {
    if (sopType && title) {
      const prefixMap: Record<string, string> = {
        "Prep": "PRE",
        "Cooking": "COO",
        "Cleaning": "CLE",
        "Service": "SER",
        "ManualHandling": "MAN"
      };
      const prefix = prefixMap[sopType] || "SOP";
      const nameBit = title.replace(/\s+/g, "").slice(0, 4).toUpperCase();
      setRefCode(`${prefix}-${nameBit}-001`);
    }
  }, [sopType, title]);

  // Auto-set last edited timestamp
  useEffect(() => {
    if (!lastEdited) {
      const now = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      setLastEdited(now);
    }
  }, [lastEdited]);

  // Sync context data with component state
  useEffect(() => {
    if (yieldData.total > 0) {
      setYieldValue(yieldData.total);
      setUnit(yieldData.unit);
    }
  }, [yieldData]);

  useEffect(() => {
    if (contextToolColour.colours && contextToolColour.colours.length > 0) {
      // Use the first colour from the array
      setToolColour(contextToolColour.colours[0]);
    }
  }, [contextToolColour]);

  // Visual feedback when context data updates
  useEffect(() => {
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 800);
    return () => clearTimeout(timer);
  }, [yieldData, contextAllergens, contextToolColour, storage]);

  // Update attributes when any field changes (debounced to avoid infinite loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateAttributes({
        // Identity & Version Metadata
        title,
        ref_code: refCode,
        version,
        status,
        author,
        last_edited: lastEdited,
        sopType,
        // Existing HACCP fields
        yieldValue: yieldValue,
        unit,
        toolColour,
        toolColourHex,
        safetyNotes,
        subRecipes
      });
    }, 100); // Small delay to debounce rapid changes

    return () => clearTimeout(timeoutId);
  }, [title, refCode, version, status, author, lastEdited, sopType, yieldValue, unit, toolColour, toolColourHex, safetyNotes, subRecipes, updateAttributes]);

  return (
    <NodeViewWrapper 
      className={`sop-block relative my-4 rounded-2xl border ${highlight ? 'border-magenta-400/60' : 'border-magenta-500/30'} bg-white/5 backdrop-blur-md shadow-sm hover:border-magenta-400/50 transition-all duration-300`}
      data-type="prepHeader"
    >
      {/* Identity & Version Banner */}
      <div className="bg-white/5 backdrop-blur-md border-b border-magenta-500/20 rounded-t-2xl p-4">
        {/* Primary Header Row */}
        <div className="flex items-center gap-4 mb-4">
          {/* SOP Type - First field */}
          <div className="flex-shrink-0">
            <label className="text-xs text-magenta-400 mb-1 block">
              Type <span className="text-red-400">*</span>
            </label>
            <select
              value={sopType}
              onChange={(e) => setSopType(e.target.value)}
              className="text-sm text-white bg-magenta-500/10 border border-magenta-500/30 rounded-md px-3 py-2 focus:border-magenta-400 focus:outline-none"
            >
              {sopTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* SOP Title */}
          <div className="flex-1">
            <label className="text-xs text-magenta-400 mb-1 block">
              SOP Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-bold text-white bg-transparent border-none outline-none placeholder-gray-500"
              placeholder="Enter SOP title..."
            />
          </div>

          {/* Version */}
          <div className="flex-shrink-0">
            <label className="text-xs text-magenta-400 mb-1 block">
              Version <span className="text-red-400">*</span>
            </label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="text-sm text-magenta-400 bg-magenta-500/10 border border-magenta-500/30 rounded-md px-3 py-2 w-24 focus:border-magenta-400 focus:outline-none"
              placeholder="1.0"
            />
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            <label className="text-xs text-magenta-400 mb-1 block">
              Status <span className="text-red-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-sm text-magenta-400 bg-magenta-500/10 border border-magenta-500/30 rounded-md px-3 py-2 focus:border-magenta-400 focus:outline-none"
            >
              {statusOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div className="flex-shrink-0">
            <label className="text-xs text-magenta-400 mb-1 block">
              Author <span className="text-red-400">*</span>
            </label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="text-sm text-white bg-magenta-500/10 border border-magenta-500/30 rounded-md px-3 py-2 w-32 focus:border-magenta-400 focus:outline-none"
              placeholder="Author name"
            />
          </div>
        </div>

        {/* Helper text */}
        <div className="text-xs text-gray-400 mb-2">
          All fields marked <span className="text-red-400">*</span> are required before adding SOP content.
        </div>

        {/* Metadata Line - Right aligned reference code */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Last Edited:</span>
              <span className="text-gray-300">{lastEdited}</span>
            </div>
          </div>
          {/* Dynamic Reference Code - Bottom Right */}
          <div className="text-sm text-gray-300 font-mono">
            Ref: {refCode || "AUTO"}
          </div>
        </div>
      </div>

      {/* Existing HACCP Content */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span 
              className="cursor-grab select-none hover:text-magenta-400 transition-colors"
              contentEditable={false}
              data-drag-handle
            >
              ☰ Drag
            </span>
            <span className="text-magenta-400 font-medium">🍽️ Prep Header</span>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full border border-white/20" 
              style={{ backgroundColor: toolColourHex }}
            ></span>
            <span className="text-xs text-gray-400">{toolColour}</span>
          </div>
        </div>

      {/* Auto-Calculated Fields */}
      <div className="space-y-4">
        {/* Yield & Unit */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-magenta-400" />
            <span className="text-sm text-gray-300">Yield:</span>
            <span className="text-sm font-medium text-white">
              {yieldData.total > 0 ? `${yieldData.total.toFixed(2)} ${yieldData.unit}` : (yieldValue > 0 ? `${yieldValue} ${unit}` : 'Auto-calculated from ingredients')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-magenta-400" />
            <span className="text-sm text-gray-300">Tool Colours Used:</span>
            <div className="flex flex-wrap gap-1">
              {contextToolColour.colours.length > 0 ? (
                contextToolColour.colours.map((colour, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-md text-xs font-medium bg-magenta-500/20 border border-magenta-400/40 text-magenta-200"
                  >
                    {colour}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500 italic">None specified</span>
              )}
            </div>
          </div>
          
          {/* Storage Information */}
          {storage.type && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Storage:</span>
              <span className="text-sm font-medium text-white">
                {storage.type} ({storage.tempMin ?? "–"}–{storage.tempMax ?? "–"}°C)
              </span>
            </div>
          )}
        </div>

        {/* Allergens */}
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-sm text-gray-300 mr-2">Allergens:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {contextAllergens.length > 0 ? (
                contextAllergens.map((allergen, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-xs text-red-400 hover:bg-red-500/30 transition-colors"
                    title={`Contains ${allergen}`}
                  >
                    {allergen}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">No allergens identified</span>
              )}
            </div>
          </div>
        </div>

        {/* Safety Notes */}
        <div className="flex items-start gap-2">
          <FileText size={16} className="text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <label className="text-sm text-gray-300 mb-1 block">Safety Notes:</label>
            <textarea
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
              className="w-full bg-neutral-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-magenta-400 focus:outline-none resize-none"
              placeholder="Enter HACCP safety notes (cross-contamination, cleaning reminders, etc.)"
              rows={2}
            />
          </div>
        </div>

        {/* Sub-Recipes */}
        {subRecipes.length > 0 && (
          <div>
            <button
              onClick={() => setShowSubRecipes(!showSubRecipes)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <ChefHat size={16} className="text-magenta-400" />
              <span>Sub-Recipes</span>
              {showSubRecipes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showSubRecipes && (
              <div className="mt-2 space-y-2">
                {subRecipes.map((recipe, index) => (
                  <div
                    key={index}
                    className="bg-neutral-800/50 border border-gray-600/30 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-white">{recipe.title}</h4>
                        <p className="text-xs text-gray-400">Yields: {recipe.yield} {recipe.unit}</p>
                      </div>
                      <span className="text-xs text-gray-500">Ref: {recipe.refId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </NodeViewWrapper>
  );
}
