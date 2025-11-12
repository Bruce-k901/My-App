'use client';

import { useState, useEffect } from 'react';

interface ChecklistFeatureProps {
  items: string[];
  defaultItems?: string[]; // Pre-populated items from template
  onChange: (items: string[]) => void;
}

export function ChecklistFeature({
  items,
  defaultItems = [],
  onChange
}: ChecklistFeatureProps) {
  const [newItem, setNewItem] = useState('');

  // Auto-populate from defaultItems if items is empty
  useEffect(() => {
    if (items.length === 0 && defaultItems.length > 0) {
      onChange([...defaultItems]);
    }
  }, [defaultItems, items.length, onChange]);

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  return (
    <div className="border-t border-white/10 pt-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Checklist Items {items.length > 0 && `(${items.length})`}
      </h2>
      
      {items.length === 0 ? (
        <p className="text-sm text-white/60 mb-4">
          No checklist items yet. Add items below or they will be auto-populated from the template.
        </p>
      ) : (
        <p className="text-sm text-green-400 mb-4">
          ✓ {items.length} checklist item{items.length !== 1 ? 's' : ''} loaded from template
        </p>
      )}
      
      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <input
              type="checkbox"
              checked={false}
              readOnly
              className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500"
            />
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 px-3 py-1 rounded bg-[#0f1220] border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Checklist item"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="px-3 py-1 text-red-400 hover:bg-red-500/10 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add new checklist item"
          className="flex-1 px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}

