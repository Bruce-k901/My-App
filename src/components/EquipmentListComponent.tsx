"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { Check, X } from '@/components/ui/icons'
import SOPBlockWrapper from "./SOPBlockWrapper"

interface EquipmentRow {
  name: string;
  colourCode: string;
  hotCold: string;
  cleanRequired: boolean;
  notes: string;
}

export default function EquipmentListComponent({ node, updateAttributes, selected, getPos, editor }) {
  const [rows, setRows] = useState<EquipmentRow[]>(node.attrs.rows || []);

  // Keep TipTap JSON in sync
  useEffect(() => {
    updateAttributes({ rows });
  }, [rows, updateAttributes]);

  const handleDelete = () => {
    console.log('Delete button clicked', { editor, node, getPos });
    if (typeof getPos === 'function') {
      const pos = getPos();
      console.log('Got position:', pos, 'nodeSize:', node.nodeSize);
      if (pos !== null && pos !== undefined) {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      }
    }
  };

  const addRow = () => {
    const newRow: EquipmentRow = {
      name: "",
      colourCode: "White – General",
      hotCold: "Cold",
      cleanRequired: false,
      notes: ""
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    setRows(updated);
  };

  const updateCell = (i: number, key: string, value: any) => {
    const updated = [...rows];
    updated[i][key] = value;
    setRows(updated);
  };

  const colourOptions = [
    "Red – Raw Meat",
    "Blue – Fish", 
    "Green – Salad",
    "Yellow – Cooked Food",
    "Brown – Bakery/Dairy",
    "White – General"
  ];

  const hotColdOptions = ["Hot", "Cold"];

  return (
    <NodeViewWrapper className="my-4">
      <SOPBlockWrapper node={node} deleteNode={handleDelete}>
        <div className="relative p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm">
          <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span 
            className="cursor-grab select-none hover:text-magenta-400 transition-colors"
            contentEditable={false}
            data-drag-handle
          >
            ☰ Drag
          </span>
          <span className="text-magenta-400 font-medium">⚙ EQUIPMENT LIST</span>
        </div>
        <button
          onClick={addRow}
          className="relative overflow-hidden group px-3 py-1.5 rounded-xl text-xs font-medium text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add Equipment</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-200 border-collapse">
          <thead className="text-gray-400 text-xs border-b border-magenta-500/20">
            <tr>
              <th className="text-left p-2">Equipment</th>
              <th className="text-left p-2">Colour Code</th>
              <th className="text-center p-2">Hot/Cold</th>
              <th className="text-center p-2">Clean Req</th>
              <th className="text-left p-2">Notes</th>
              <th className="text-center p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 italic py-4">
                  No equipment added yet.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700/40 hover:bg-magenta-500/5 transition-colors">
                <td className="p-2">
                  <input
                    value={row.name}
                    onChange={(e) => updateCell(i, "name", e.target.value)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
                    placeholder="Equipment name"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.colourCode}
                    onChange={(e) => updateCell(i, "colourCode", e.target.value)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
                  >
                    {colourOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-center">
                  <select
                    value={row.hotCold}
                    onChange={(e) => updateCell(i, "hotCold", e.target.value)}
                    className={`w-full bg-neutral-800 border rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none ${
                      row.hotCold === "Hot" 
                        ? "border-red-500/50 bg-red-500/10" 
                        : "border-blue-500/50 bg-blue-500/10"
                    }`}
                  >
                    {hotColdOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => updateCell(i, "cleanRequired", !row.cleanRequired)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      row.cleanRequired
                        ? "bg-magenta-500 border-magenta-400 text-white"
                        : "border-gray-500 hover:border-magenta-400"
                    }`}
                    title={row.cleanRequired ? "Cleaning required" : "No cleaning required"}
                  >
                    {row.cleanRequired && <Check size={14} />}
                  </button>
                </td>
                <td className="p-2">
                  <input
                    value={row.notes}
                    onChange={(e) => updateCell(i, "notes", e.target.value)}
                    className="w-full bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:border-magenta-400 focus:outline-none"
                    placeholder="Cleaning notes..."
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-400 hover:text-red-600 text-xs transition-colors"
                    title="Remove equipment"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div>
      </SOPBlockWrapper>
    </NodeViewWrapper>
  )
}
