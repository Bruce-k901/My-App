"use client";

import { useState } from 'react';
import { 
  Download, 
  Printer, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShoppingCart
} from '@/components/ui/icons';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  needed: number;
  unit: string;
  stock: number;
  toPull: number;
  status: 'pending' | 'pulled' | 'insufficient';
  stockStatus: 'ok' | 'low' | 'insufficient';
}

interface IngredientData {
  deliveryDate: string;
  prepDate: string;
  ingredients: Ingredient[];
  summary: {
    totalCount: number;
    pulledCount: number;
    insufficientCount: number;
    readyPercent: number;
  };
}

interface IngredientPullListProps {
  date: string;
  data?: IngredientData;
  loading?: boolean;
}

export default function IngredientPullList({ date, data, loading }: IngredientPullListProps) {
  const [pulledItems, setPulledItems] = useState<Set<string>>(new Set());

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function markPulled(ingredientId: string) {
    setPulledItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  }

  function markAllPulled() {
    if (!data) return;
    const allIds = new Set(data.ingredients
      .filter(ing => ing.status !== 'insufficient')
      .map(ing => ing.id));
    setPulledItems(allIds);
  }

  function handleExportCSV() {
    if (!data) return;

    const headers = ['Ingredient', 'Category', 'Needed', 'Stock', 'To Pull', 'Status'];
    const rows = data.ingredients.map(ing => {
      const isPulled = pulledItems.has(ing.id) || ing.status === 'pulled';
      return [
        ing.name,
        ing.category,
        `${ing.needed} ${ing.unit}`,
        `${ing.stock} ${ing.unit}`,
        `${ing.toPull} ${ing.unit}`,
        isPulled ? 'Pulled' : ing.status === 'insufficient' ? 'Insufficient Stock' : 'Pending'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingredient-pull-list-${data.prepDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.ingredients.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Ingredient Pull List
        </h2>
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No ingredients required for this production</p>
        </div>
      </div>
    );
  }

  const insufficientIngredients = data.ingredients.filter(ing => ing.status === 'insufficient');
  const currentPulledCount = data.ingredients.filter(ing => 
    pulledItems.has(ing.id) || ing.status === 'pulled'
  ).length;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Ingredient Pull List - {formatDate(data.prepDate)}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            For {formatDate(data.deliveryDate)} Production
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllPulled}
            className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Pulled
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Total Items</p>
          <p className="text-white font-semibold">{data.summary.totalCount}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Pulled</p>
          <p className="text-green-400 font-semibold">{currentPulledCount}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Insufficient</p>
          <p className="text-red-400 font-semibold">{data.summary.insufficientCount}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Ready</p>
          <p className="text-white font-semibold">{data.summary.readyPercent}%</p>
        </div>
      </div>

      {/* Insufficient Stock Warning */}
      {insufficientIngredients.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium mb-2">
                Cannot complete production - {insufficientIngredients.length} ingredient{insufficientIngredients.length > 1 ? 's' : ''} below required quantity
              </p>
              <ul className="space-y-1">
                {insufficientIngredients.map(ing => (
                  <li key={ing.id} className="text-red-400/80 text-sm">
                    <strong>{ing.name}:</strong> Need {ing.toPull.toFixed(2)} {ing.unit} more (Have {ing.stock} {ing.unit}, Need {ing.needed} {ing.unit})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Ingredient
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                Needed
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                To Pull
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {data.ingredients.map((ingredient) => {
              const isPulled = pulledItems.has(ingredient.id) || ingredient.status === 'pulled';
              
              return (
                <tr
                  key={ingredient.id}
                  className={`hover:bg-white/[0.02] transition-colors ${
                    ingredient.status === 'insufficient' ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{ingredient.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{ingredient.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {ingredient.needed.toFixed(2)} {ingredient.unit}
                  </td>
                  <td className={`px-4 py-3 text-right ${
                    ingredient.stockStatus === 'insufficient' 
                      ? 'text-red-400' 
                      : ingredient.stockStatus === 'low'
                      ? 'text-amber-400'
                      : 'text-white'
                  }`}>
                    <div className="flex items-center justify-end gap-2">
                      <span>{ingredient.stock.toFixed(2)} {ingredient.unit}</span>
                      {ingredient.stockStatus === 'low' && (
                        <span className="text-xs">⚠️ Low</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-medium">
                      {ingredient.toPull.toFixed(2)} {ingredient.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isPulled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Pulled
                      </span>
                    ) : ingredient.status === 'insufficient' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        Insufficient Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/20">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ingredient.status === 'insufficient' ? (
                      <button
                        className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Order Now
                      </button>
                    ) : !isPulled ? (
                      <button
                        onClick={() => markPulled(ingredient.id)}
                        className="px-3 py-1.5 text-xs bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:bg-[#D37E91]/10 transition-colors"
                      >
                        Mark Pulled
                      </button>
                    ) : (
                      <button
                        onClick={() => markPulled(ingredient.id)}
                        className="px-3 py-1.5 text-xs bg-white/5 text-white/40 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

