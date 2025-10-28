import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { Plus, X } from "lucide-react";

interface PPEListComponentProps {
  node: {
    attrs: {
      items: string[];
    };
  };
  updateAttributes: (attrs: { items: string[] }) => void;
  selected: boolean;
  getPos?: () => number;
  editor?: any;
}

export default function PPEListComponent({ node, updateAttributes, selected, getPos, editor }: PPEListComponentProps) {
  console.log("🔍 PPE List rendered", node.attrs);
  
  // Error handling for node attributes
  const safeItems = Array.isArray(node.attrs?.items) ? node.attrs.items : [];
  const [items, setItems] = useState(safeItems);
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    const updated = [...items, input.trim()];
    setItems(updated);
    try {
      updateAttributes({ items: updated });
    } catch (error) {
      console.error("Error updating PPE List attributes:", error);
    }
    setInput("");
  };

  const removeItem = (i: number) => {
    const updated = items.filter((_, idx) => idx !== i);
    setItems(updated);
    try {
      updateAttributes({ items: updated });
    } catch (error) {
      console.error("Error updating PPE List attributes:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <NodeViewWrapper
      className="ppe-list relative my-4 p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm hover:border-magenta-400/60 transition-all duration-200"
      data-drag-handle
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span 
            className="cursor-grab select-none hover:text-magenta-400 transition-colors"
            contentEditable={false}
            data-drag-handle
          >
            ☰ Drag
          </span>
          <span className="text-magenta-400 font-medium">🛡️ PPE List</span>
        </div>
        <span className="text-[10px] text-gray-500 italic">Required gear</span>
      </div>
      
      <div className="flex gap-2 mb-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 bg-neutral-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-magenta-400"
                  placeholder="Add PPE item (e.g. gloves, apron, goggles)"
                />
        <button 
          onClick={addItem} 
          className="relative overflow-hidden group px-4 py-2 rounded-xl text-sm font-medium text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add</span>
        </button>
      </div>
      
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
                    <li key={i} className="flex justify-between items-center bg-neutral-800 px-3 py-2 rounded-lg border border-gray-600/30">
                      <span className="text-sm text-white">{item}</span>
              <button 
                onClick={() => removeItem(i)} 
                className="relative overflow-hidden group text-red-400 hover:text-red-600 text-xs p-1 rounded transition-colors"
                title="Remove item"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-400/30 blur-sm group-hover:blur transition-all"></span>
                <span className="relative z-10">
                  <X size={14} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500 italic mt-2">No PPE items added yet.</p>
      )}
    </NodeViewWrapper>
  );
}
