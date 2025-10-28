"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { useSOP } from "@/context/SOPContext";
import { useIngredientsLibrary } from "@/hooks/useIngredientsLibrary";
import { normalizeCost, hasUnitConflict, generateCostTooltip } from "@/lib/utils/packParser";

interface IngredientRow {
  ingredient: string;
  unit: string;
  baseQty: number;
  unitCost: number;
  allergen: string;
  allergens: string[]; // New field for array of allergens
  category: string;
  colourCode: string;
  libraryUnit?: string; // New field for backward compatibility
  density?: {
    cup?: number | null;
    tbsp?: number | null;
    tsp?: number | null;
  };
  packSize?: string;
  supplier?: string;
  originalCost?: number; // Store original cost for tooltip
}

export default function IngredientTableComponent({ node, updateAttributes, selected, getPos, editor }) {
  const [multiplier, setMultiplier] = useState(node.attrs.multiplier || 1);
  const [rows, setRows] = useState<IngredientRow[]>(node.attrs.rows || []);
  const { updateYieldData, updateAllergens, updateToolColour } = useSOP();
  const { ingredients, loading: ingredientsLoading, error: ingredientsError } = useIngredientsLibrary();

  // Helper function to convert units to base units (g for weight, ml for volume)
  const convertToBaseUnit = (value: number, unit: string, ingredientData?: IngredientRow) => {
    const u = unit?.toLowerCase();
    const d = ingredientData?.density || {};

    switch (u) {
      case "kg": return value * 1000;
      case "lb": return value * 453.592;
      case "oz": return value * 28.3495;
      case "cup": return value * (d.cup ?? 240);
      case "tbsp": return value * (d.tbsp ?? 15);
      case "tsp": return value * (d.tsp ?? 5);
      case "l": return value * 1000;
      case "ml": return value;
      default: return value;
    }
  };

  // Helper function to calculate total cost with proper unit conversion
  const calcTotalCost = (row: IngredientRow) => {
    const ingredientUnit = row.unit?.toLowerCase();
    const libraryUnit = row.libraryUnit?.toLowerCase() || ingredientUnit;
    const qtyInBase = convertToBaseUnit(row.baseQty * multiplier, ingredientUnit, row);
    const oneLibraryUnitInBase = convertToBaseUnit(1, libraryUnit, row);
    const costPerBase = row.unitCost / oneLibraryUnitInBase;
    return Number((qtyInBase * costPerBase).toFixed(2));
  };

  // Helper function to format quantity display
  const formatQty = (value: number, unit: string) => {
    if (!value) return "-";
    const num = parseFloat(value.toFixed(1));
    return `${num % 1 === 0 ? num.toFixed(0) : num} ${unit}`;
  };

  // Keep TipTap JSON in sync
  useEffect(() => {
    updateAttributes({ multiplier, rows });
  }, [multiplier, rows, updateAttributes]);

  // Migrate old batch-based data to new multiplier-based data
  useEffect(() => {
    if (rows.length > 0 && rows[0] && (rows[0] as any).batches) {
      const migratedRows = rows.map(row => ({
        ingredient: row.ingredient,
        unit: row.unit,
        baseQty: (row as any).batches?.x1 || row.baseQty || 0,
        unitCost: row.unitCost,
        allergen: row.allergen,
        allergens: row.allergen ? row.allergen.split(", ").filter(Boolean) : [], // Convert string to array
        category: row.category,
        colourCode: row.colourCode,
        libraryUnit: row.libraryUnit || row.unit, // Backward compatibility
        density: row.density || { cup: null, tbsp: null, tsp: null }, // Initialize density
        packSize: row.packSize || "", // Initialize pack size
        supplier: row.supplier || "", // Initialize supplier
        originalCost: row.originalCost || row.unitCost // Initialize original cost
      }));
      setRows(migratedRows);
    }
  }, []);

  const addRow = () => {
    const newRow: IngredientRow = {
      ingredient: "",
      unit: "g",
      baseQty: 0,
      unitCost: 0,
      allergen: "",
      allergens: [],
      category: "",
      colourCode: "",
      libraryUnit: "g",
      density: { cup: null, tbsp: null, tsp: null },
      packSize: "",
      supplier: "",
      originalCost: 0
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    setRows(updated);
  };


  const updateCell = (i: number, field: keyof IngredientRow, value: string | number) => {
    const updated = [...rows];
    updated[i] = { ...updated[i], [field]: value };
    setRows(updated);
  };

  // Handle ingredient selection from library
  const handleIngredientSelect = (index: number, selectedName: string) => {
    const selected = ingredients.find((ing) => ing.ingredient_name === selectedName);
    const updated = [...rows];
    
    if (selected) {
      // Normalize cost using pack size parsing
      const { cost: normalizedCost, unit: normalizedUnit } = normalizeCost(selected);
      
      updated[index] = {
        ...updated[index],
        ingredient: selectedName,
        unitCost: normalizedCost,
        unit: selected.unit || "g",
        category: selected.category || "",
        allergen: selected.allergens?.join(", ") || "", // Keep for backward compatibility
        allergens: Array.isArray(selected.allergens) ? selected.allergens : [], // Ensure array format
        colourCode: selected.default_colour_code || "",
        libraryUnit: normalizedUnit, // Use normalized unit for cost calculation
        density: {
          cup: selected.density_g_per_cup ?? null,
          tbsp: selected.density_g_per_tbsp ?? null,
          tsp: selected.density_g_per_tsp ?? null
        },
        packSize: selected.pack_size || "",
        supplier: selected.supplier || "",
        originalCost: selected.unit_cost || 0 // Store original cost for tooltip
      };
    } else {
      updated[index].ingredient = selectedName;
    }
    
    setRows(updated);
  };

  // Normalize quantity to kg for yield calculation
  const normalizeQty = (qty: number, unit: string) => {
    const unitMap: { [key: string]: number } = {
      'g': qty / 1000,
      'kg': qty,
      'ml': qty / 1000,
      'l': qty,
      'pcs': qty * 0.1, // Assume 100g per piece
      'oz': qty * 0.028,
      'lb': qty * 0.453,
      'cup': qty * 0.25,
      'tbsp': qty * 0.015,
      'tsp': qty * 0.005
    };
    return unitMap[unit] || qty;
  };

  const getScaledQty = (row: IngredientRow) => row.baseQty * multiplier;

  const totalYield = rows.reduce((sum, row) => sum + normalizeQty(getScaledQty(row), row.unit), 0);
  const totalCost = rows.reduce((sum, row) => sum + calcTotalCost(row), 0);

  // Update SOP context when yield or allergens change
  useEffect(() => {
    updateYieldData(totalYield, 'kg');
    
    // Extract and deduplicate allergens from all rows using new allergens array
    const allergens = [...new Set(rows.flatMap(r => r.allergens || []))];
    updateAllergens(allergens);
    
    // Update tool colour based on dominant colour code
    const colourCounts = rows.reduce((acc, row) => {
      if (row.colourCode) {
        acc[row.colourCode] = (acc[row.colourCode] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const dominantColour = Object.entries(colourCounts).reduce((a, b) => 
      colourCounts[a[0]] > colourCounts[b[0]] ? a : b, ['', 0]
    )[0];
    
    if (dominantColour) {
      updateToolColour([dominantColour]);
    }
  }, [totalYield, rows, updateYieldData, updateAllergens, updateToolColour]);

  return (
    <NodeViewWrapper 
      className="sop-block relative my-4 p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm"
      data-type="ingredientTable"
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
          <span className="text-magenta-400 font-medium">⚙ Ingredient Table v2</span>
          {ingredientsLoading && (
            <span className="text-yellow-400 text-xs">📚 Loading library...</span>
          )}
          {ingredientsError && (
            <span className="text-red-400 text-xs">❌ {ingredientsError}</span>
          )}
          {!ingredientsLoading && !ingredientsError && ingredients.length === 0 && (
            <span className="text-orange-400 text-xs">⚠️ No ingredients found</span>
          )}
          {!ingredientsLoading && !ingredientsError && ingredients.length > 0 && (
            <span className="text-green-400 text-xs">📚 Library loaded ({ingredients.length} items)</span>
          )}
        </div>
        <button
          onClick={addRow}
          className="relative overflow-hidden group px-3 py-1.5 rounded-xl text-xs font-medium text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add Row</span>
        </button>
      </div>

      {/* Batch Multiplier */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">Batch Multiplier:</span>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
            className="w-20 bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">(default: 1)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-200 border-collapse">
          <thead className="text-gray-400 text-xs border-b border-magenta-500/20">
            <tr>
              <th className="text-left p-2">Ingredient</th>
              <th className="text-right p-2 w-20">Base Qty</th>
              <th className="text-left p-2 w-24">Unit</th>
              <th className="text-right p-2 w-20">Qty (×{multiplier})</th>
              <th className="text-right p-2 w-24">Unit Cost</th>
              <th className="text-right p-2 w-20">Total</th>
              <th className="text-left p-2 w-20">Allergens</th>
              <th className="text-center p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 italic py-4">
                  No ingredients yet.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700/40">
                <td className="p-2">
                  <select
                    value={row.ingredient}
                    onChange={(e) => handleIngredientSelect(i, e.target.value)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
                    disabled={ingredientsLoading}
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map((ing) => (
                      <option key={ing.ingredient_name} value={ing.ingredient_name}>
                        {ing.ingredient_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-right">
                  <input
                    type="number"
                    value={row.baseQty}
                    onChange={(e) => updateCell(i, "baseQty", parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-right text-sm text-white focus:border-magenta-400 focus:outline-none"
                    step="0.1"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.unit}
                    onChange={(e) => updateCell(i, "unit", e.target.value)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="pcs">pcs</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </select>
                </td>
                <td className="p-2 text-right text-magenta-300 font-medium">
                  {formatQty(row.baseQty * multiplier, row.unit)}
                </td>
                <td className="p-2 text-right text-sm text-gray-300">
                  <div className="flex items-center justify-end">
                    <div 
                      className="cursor-help"
                      title={generateCostTooltip(row.packSize, row.originalCost, row.unitCost, row.libraryUnit)}
                    >
                      <span>
                        £{row.unitCost.toFixed(2)} / {row.libraryUnit}
                      </span>
                    </div>
                    {hasUnitConflict(row.packSize, row.unit) && (
                      <span className="text-amber-400 text-xs ml-1">⚠ check unit</span>
                    )}
                    {!row.density?.cup && ["cup", "tbsp", "tsp"].includes(row.unit?.toLowerCase()) && (
                      <span className="text-amber-400 text-xs ml-1">⚠ generic conversion</span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right text-green-400 font-medium">£{calcTotalCost(row)}</td>
                <td className="p-2">
                  {row.allergens?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {row.allergens.map((allergen, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-300"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs italic">None</span>
                  )}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-magenta-500/20">
                <td colSpan={5} className="text-right text-gray-400 text-sm p-2 font-medium">
                  Total Yield: {totalYield.toFixed(2)} kg (×{multiplier})
                </td>
                <td className="text-right text-magenta-400 font-semibold p-2">
                  £{totalCost.toFixed(2)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </NodeViewWrapper>
  )
}