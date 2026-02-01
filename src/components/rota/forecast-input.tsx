'use client';

import { useState } from 'react';
import { DollarSign, X } from 'lucide-react';

interface ForecastInputProps {
  date: string;
  currentForecast?: number;
  onSave: (date: string, forecast: number) => void;
  onClose: () => void;
}

export function ForecastInput({ date, currentForecast, onSave, onClose }: ForecastInputProps) {
  const [value, setValue] = useState(currentForecast?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onSave(date, numValue);
      onClose();
    }
  };

  return (
    <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white">Forecast Sales</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-neutral-700 rounded text-gray-500 dark:text-white/60 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full pl-7 pr-2 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC4899]"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-2 py-1 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white text-xs rounded transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}










