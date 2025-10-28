"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { Plus, X, CheckCircle, Circle } from "lucide-react"

interface ChecklistItem {
  text: string;
  completed: boolean;
}

export default function PostFinishChecklistComponent({ node, updateAttributes, selected, getPos, editor }) {
  const [items, setItems] = useState<ChecklistItem[]>(node.attrs.items || [
    { text: "Product labelled with date & expiry", completed: false },
    { text: "Storage temperature verified", completed: false },
    { text: "Equipment cleaned and sanitised", completed: false },
    { text: "Waste disposed correctly", completed: false }
  ]);

  // Keep TipTap JSON in sync
  useEffect(() => {
    updateAttributes({ items });
  }, [items, updateAttributes]);

  const addItem = () => {
    const newItem: ChecklistItem = { text: "", completed: false };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const updateItem = (index: number, key: keyof ChecklistItem, value: any) => {
    const updated = [...items];
    updated[index][key] = value;
    setItems(updated);
  };

  const toggleComplete = (index: number) => {
    const updated = [...items];
    updated[index].completed = !updated[index].completed;
    setItems(updated);
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const isComplete = completedCount === totalCount && totalCount > 0;

  return (
    <NodeViewWrapper className="relative my-4 p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span 
            className="cursor-grab select-none hover:text-magenta-400 transition-colors"
            contentEditable={false}
            data-drag-handle
          >
            ☰ Drag
          </span>
          <span className="text-magenta-400 font-medium">🧾 Post-Finish Verification</span>
        </div>
        <button
          onClick={addItem}
          className="relative overflow-hidden group px-3 py-1.5 rounded-xl text-xs font-medium text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add Item</span>
        </button>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-medium flex items-center gap-2">
          <CheckCircle size={16} />
          ✅ SOP Complete
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center text-gray-500 italic py-4">
            No post-finish checks added yet.
          </div>
        )}
        
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              item.completed
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-gray-700/40 bg-gray-800/30 hover:bg-magenta-500/5'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleComplete(index)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                item.completed
                  ? 'bg-gradient-to-r from-magenta-500 to-green-500 border-transparent text-white'
                  : 'border-magenta-500/50 hover:border-magenta-400'
              }`}
            >
              {item.completed && <CheckCircle size={12} />}
            </button>

            {/* Text Input */}
            <input
              value={item.text}
              onChange={(e) => updateItem(index, "text", e.target.value)}
              className={`flex-1 bg-transparent border-none outline-none text-sm ${
                item.completed ? 'text-gray-400 opacity-60' : 'text-white'
              }`}
              placeholder="Enter verification item..."
            />

            {/* Remove Button */}
            <button
              onClick={() => removeItem(index)}
              className="text-red-400 hover:text-red-600 text-xs transition-colors p-1"
              title="Remove item"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
