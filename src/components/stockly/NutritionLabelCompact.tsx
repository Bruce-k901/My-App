"use client";

import { NUTRITION_FIELDS } from '@/types/library.types';

interface NutritionLabelCompactProps {
  item: Record<string, any>;
}

export function NutritionLabelCompact({ item }: NutritionLabelCompactProps) {
  const hasAny = NUTRITION_FIELDS.some(
    ({ dbColumn }) => item[dbColumn] != null
  );

  if (!hasAny) {
    return (
      <span className="text-xs text-theme-tertiary italic">No nutrition data</span>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-theme/50">
          <th className="text-left py-1 text-theme-tertiary font-medium">Per 100g</th>
          <th className="text-right py-1 text-theme-tertiary font-medium w-16">Value</th>
        </tr>
      </thead>
      <tbody>
        {NUTRITION_FIELDS.map(({ key, label, unit, indent, dbColumn }) => {
          const val = item[dbColumn];
          return (
            <tr key={key} className="border-b border-theme/30">
              <td className={`py-0.5 text-theme-secondary ${indent ? 'pl-3' : 'font-medium'}`}>
                {label}
              </td>
              <td className="py-0.5 text-right text-theme-primary tabular-nums">
                {val != null ? (
                  <>
                    {key === 'salt_g' ? Number(val).toFixed(2) : Number(val).toFixed(1)}
                    <span className="text-theme-tertiary ml-0.5">{unit}</span>
                  </>
                ) : (
                  <span className="text-theme-tertiary">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
