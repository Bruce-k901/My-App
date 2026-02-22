"use client"
import { NodeViewWrapper } from "@tiptap/react"
import { useState, useEffect } from "react"
import { Check, X, AlertTriangle, Clock, Thermometer, GripVertical } from '@/components/ui/icons'

interface ProcessStep {
  order: number;
  description: string;
  time: string;
  temp: string;
  isCritical: boolean;
  verification: string;
  toolColour: string;
}

export default function ProcessStepsComponent({ node, updateAttributes, selected, getPos, editor }) {
  const [steps, setSteps] = useState<ProcessStep[]>(node.attrs.steps || []);

  // Migrate old data to include toolColour field
  useEffect(() => {
    if (steps.length > 0 && steps[0] && !steps[0].toolColour) {
      const migratedSteps = steps.map(step => ({
        ...step,
        toolColour: ""
      }));
      setSteps(migratedSteps);
    }
  }, []);

  // Keep TipTap JSON in sync
  useEffect(() => {
    updateAttributes({ steps });
  }, [steps, updateAttributes]);

  const addStep = () => {
    const newStep: ProcessStep = {
      order: steps.length + 1,
      description: "",
      time: "",
      temp: "",
      isCritical: false,
      verification: "",
      toolColour: ""
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    const reordered = updated.map((step, i) => ({ ...step, order: i + 1 }));
    setSteps(reordered);
  };

  const updateStep = (index: number, key: string, value: any) => {
    const updated = [...steps];
    updated[index][key] = value;
    setSteps(updated);
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order numbers
    const reordered = updated.map((step, i) => ({ ...step, order: i + 1 }));
    setSteps(reordered);
  };

  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order numbers
    const reordered = updated.map((step, i) => ({ ...step, order: i + 1 }));
    setSteps(reordered);
  };

  return (
    <NodeViewWrapper className="relative my-4 p-4 rounded-2xl border border-magenta-500/30 bg-white/5 backdrop-blur-md shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-xs text-theme-tertiary">
          <span 
            className="cursor-grab select-none hover:text-magenta-400 transition-colors"
            contentEditable={false}
            data-drag-handle
          >
            ☰ Drag
          </span>
          <span className="text-magenta-400 font-medium">🧾 Process Steps</span>
        </div>
        <button
          onClick={addStep}
          className="relative overflow-hidden group px-3 py-1.5 rounded-xl text-xs font-medium text-theme-primary"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-magenta-600/60 to-magenta-500/80 blur-sm group-hover:blur transition-all"></span>
          <span className="relative z-10">+ Add Step</span>
        </button>
      </div>

      <div className="space-y-2">
        {steps.length === 0 && (
          <div className="text-center text-theme-tertiary italic py-4">
            No process steps added yet.
          </div>
        )}
        
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-magenta-500/5 ${
              step.isCritical 
                ? 'border-red-400/40 bg-red-500/5' 
                : 'border-gray-700/40'
            }`}
          >
            {/* Step Number & Drag Handle */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveStepUp(index)}
                  disabled={index === 0}
                  className="text-theme-tertiary hover:text-magenta-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <span className="text-sm font-medium text-magenta-400 w-6 text-center">
                  {step.order}
                </span>
                <button
                  onClick={() => moveStepDown(index)}
                  disabled={index === steps.length - 1}
                  className="text-theme-tertiary hover:text-magenta-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
              </div>
              <GripVertical size={16} className="text-theme-tertiary cursor-grab" />
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-2">
              {/* Description */}
              <textarea
                value={step.description}
                onChange={(e) => updateStep(index, "description", e.target.value)}
                className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-theme-primary focus:border-magenta-400 focus:outline-none resize-none"
                placeholder="Step description..."
                rows={2}
              />

              {/* Time, Temp, Critical Controls */}
              <div className="flex items-center gap-3">
                {/* Time Input */}
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-theme-tertiary" />
                  <input
                    value={step.time}
                    onChange={(e) => updateStep(index, "time", e.target.value)}
                    className="w-16 bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-theme-primary focus:border-magenta-400 focus:outline-none"
                    placeholder="2m"
                  />
                </div>

                {/* Temperature Input */}
                <div className="flex items-center gap-1">
                  <Thermometer size={14} className="text-theme-tertiary" />
                  <input
                    value={step.temp}
                    onChange={(e) => updateStep(index, "temp", e.target.value)}
                    className="w-16 bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-theme-primary focus:border-magenta-400 focus:outline-none"
                    placeholder="45°C"
                  />
                </div>

                {/* Critical Toggle */}
                <button
                  onClick={() => updateStep(index, "isCritical", !step.isCritical)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                    step.isCritical
                      ? 'bg-red-500/20 border border-red-400/40 text-red-400'
                      : 'bg-gray-700/50 border border-gray-600 text-theme-tertiary hover:bg-gray-600/50'
                  }`}
                  title={step.isCritical ? "Critical step" : "Mark as critical"}
                >
                  <AlertTriangle size={12} />
                  <span>Critical</span>
                </button>

                {/* Tool Colour Dropdown */}
                <select
                  value={step.toolColour}
                  onChange={(e) => updateStep(index, "toolColour", e.target.value)}
                  className="bg-neutral-800 border border-gray-600 rounded-md px-2 py-1 text-sm text-theme-primary focus:border-magenta-400 focus:outline-none"
                >
                  <option value="">Tool Colour</option>
                  <option value="Red – Raw Meat">Red – Raw Meat</option>
                  <option value="Blue – Raw Fish">Blue – Raw Fish</option>
                  <option value="Green – Salad/Veg">Green – Salad/Veg</option>
                  <option value="Yellow – Cooked">Yellow – Cooked</option>
                  <option value="Brown – Bakery">Brown – Bakery</option>
                  <option value="White – Bakery/Dairy">White – Bakery/Dairy</option>
                </select>
              </div>

              {/* Verification Notes */}
              <input
                value={step.verification}
                onChange={(e) => updateStep(index, "verification", e.target.value)}
                className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-theme-primary focus:border-magenta-400 focus:outline-none"
                placeholder="Verification note (e.g., 'Check smoothness and temperature not exceeding 50°C')"
              />
            </div>

            {/* Remove Button */}
            <button
              onClick={() => removeStep(index)}
              className="text-red-400 hover:text-red-600 text-xs transition-colors p-1"
              title="Remove step"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
