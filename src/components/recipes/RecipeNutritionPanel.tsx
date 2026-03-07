"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from '@/components/ui/icons';
import { NUTRITION_FIELDS, type NutritionData } from '@/types/library.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface RecipeNutritionPanelProps {
  nutritionPerPortion: NutritionData | Record<string, number> | null | undefined;
  nutritionPer100g: NutritionData | Record<string, number> | null | undefined;
  nutritionPerRecipe: NutritionData | Record<string, number> | null | undefined;
  isComplete: boolean | undefined;
  yieldQty?: number | null;
}

type ViewMode = 'portion' | 'per100g' | 'recipe';

const MACRO_COLORS = {
  fat: '#f59e0b',     // amber
  carbs: '#3b82f6',   // blue
  protein: '#10b981', // green
};

export function RecipeNutritionPanel({
  nutritionPerPortion,
  nutritionPer100g,
  nutritionPerRecipe,
  isComplete,
  yieldQty,
}: RecipeNutritionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('portion');

  // No data at all
  if (!nutritionPerPortion && !nutritionPer100g && !nutritionPerRecipe) {
    return null;
  }

  const data =
    viewMode === 'portion'
      ? nutritionPerPortion
      : viewMode === 'per100g'
        ? nutritionPer100g
        : nutritionPerRecipe;

  if (!data) return null;

  const n = data as Record<string, number>;

  // Macro data for pie chart (kcal from macros: fat=9kcal/g, carbs=4kcal/g, protein=4kcal/g)
  const fatKcal = (n.fat_g || 0) * 9;
  const carbKcal = (n.carbohydrate_g || 0) * 4;
  const proteinKcal = (n.protein_g || 0) * 4;
  const totalMacroKcal = fatKcal + carbKcal + proteinKcal;

  const macroData = totalMacroKcal > 0
    ? [
        { name: 'Fat', value: fatKcal, pct: Math.round((fatKcal / totalMacroKcal) * 100), color: MACRO_COLORS.fat },
        { name: 'Carbs', value: carbKcal, pct: Math.round((carbKcal / totalMacroKcal) * 100), color: MACRO_COLORS.carbs },
        { name: 'Protein', value: proteinKcal, pct: Math.round((proteinKcal / totalMacroKcal) * 100), color: MACRO_COLORS.protein },
      ]
    : [];

  return (
    <div className="border border-theme rounded-lg overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-theme-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-theme-tertiary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-theme-tertiary" />
          )}
          <span className="text-sm font-medium text-theme-primary">Nutrition</span>
          {n.energy_kcal != null && (
            <span className="text-xs text-theme-tertiary ml-1">
              {Math.round(n.energy_kcal)} kcal {viewMode === 'portion' ? '/ portion' : viewMode === 'per100g' ? '/ 100g' : 'total'}
            </span>
          )}
        </div>
        {isComplete === false && (
          <div className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs">Incomplete</span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-theme">
          {/* Incomplete warning */}
          {isComplete === false && (
            <div className="mt-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Some ingredients are missing nutritional data. Values shown are estimates based on available data only.
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex gap-1 mt-3 bg-theme-surface rounded-lg p-1">
            {([
              { key: 'portion' as ViewMode, label: 'Per Portion' },
              { key: 'per100g' as ViewMode, label: 'Per 100g' },
              { key: 'recipe' as ViewMode, label: 'Full Recipe' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                  viewMode === key
                    ? 'bg-theme-button text-theme-primary font-medium'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-4">
            {/* UK-standard nutrition table */}
            <div className="flex-1 min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-theme">
                    <th className="text-left py-1.5 text-xs font-medium text-theme-tertiary">
                      Typical values
                    </th>
                    <th className="text-right py-1.5 text-xs font-medium text-theme-tertiary w-24">
                      {viewMode === 'portion'
                        ? `Per portion${yieldQty ? '' : ''}`
                        : viewMode === 'per100g'
                          ? 'Per 100g'
                          : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NUTRITION_FIELDS.map(({ key, label, unit, indent }) => {
                    const val = n[key];
                    return (
                      <tr
                        key={key}
                        className="border-b border-theme/50"
                      >
                        <td className={`py-1.5 text-theme-primary ${indent ? 'pl-4 text-xs text-theme-secondary' : 'text-sm font-medium'}`}>
                          {label}
                        </td>
                        <td className="py-1.5 text-right text-sm text-theme-primary tabular-nums">
                          {val != null ? (
                            <>{key === 'salt_g' ? val.toFixed(2) : val.toFixed(1)}{unit === 'kcal' ? '' : 'g'}<span className="text-theme-tertiary text-xs ml-0.5">{unit === 'kcal' ? ' kcal' : ''}</span></>
                          ) : (
                            <span className="text-theme-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Macro pie chart */}
            {macroData.length > 0 && (
              <div className="w-36 flex-shrink-0 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={42}
                      dataKey="value"
                      stroke="none"
                    >
                      {macroData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${Math.round(value)} kcal`, name]}
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-1">
                  {macroData.map((m) => (
                    <div key={m.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-theme-secondary">{m.name}</span>
                      <span className="text-theme-tertiary ml-auto">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
