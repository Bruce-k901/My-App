"use client";

import React, { useState } from 'react';
import { 
  Save, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  X, 
  CheckCircle2,
  Settings,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function ButtonPlayground() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'All Buttons' },
    { id: 'save', label: 'Save Buttons' },
    { id: 'action', label: 'Action Buttons' },
    { id: 'ui', label: 'UI Component Buttons' },
    { id: 'custom', label: 'Custom Buttons' }
  ];

  // SAVE BUTTON VARIATIONS
  const saveButtonVariations = [
    {
      id: 'ui-primary-save',
      name: 'UI Primary Save',
      component: (
        <Button variant="primary">
          <Save size={16} className="mr-2" />
          Save
        </Button>
      ),
      code: `variant="primary"`,
      description: 'From UI Button component - glass effect with pink glow',
      category: 'save'
    },
    {
      id: 'site-form-save',
      name: 'Site Form Save',
      component: (
        <button className="px-6 py-2 border border-pink-600 text-pink-600 rounded-lg hover:shadow-lg hover:shadow-pink-600/50 hover:border-pink-500 transition-all duration-200">
          Save
        </button>
      ),
      code: `border-pink-600 text-pink-600 hover:shadow-pink-600/50`,
      description: 'From SiteFormBase - pink border with glow effect',
      category: 'save'
    },
    {
      id: 'site-form-save-sync',
      name: 'Site Form Save & Sync',
      component: (
        <button className="px-4 py-2 border border-pink-600 text-pink-600 rounded-lg hover:shadow-lg hover:shadow-pink-600/50 hover:border-pink-500 transition-all duration-200">
          Save & Sync
        </button>
      ),
      code: `border-pink-600 text-pink-600 hover:shadow-pink-600/50`,
      description: 'From SiteFormBase - GM update save button',
      category: 'save'
    },
    {
      id: 'compliance-save',
      name: 'Compliance Save',
      component: (
        <button className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150">
          Save
        </button>
      ),
      code: `bg-white/[0.06] border-white/[0.1] hover:bg-white/[0.12]`,
      description: 'From TemperatureCheckTemplate - glass morphism',
      category: 'save'
    },
    {
      id: 'compliance-save-deploy',
      name: 'Compliance Save & Deploy',
      component: (
        <button className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150">
          Save & Deploy
        </button>
      ),
      code: `bg-white/[0.06] border-white/[0.1] hover:bg-white/[0.12]`,
      description: 'From TemperatureCheckTemplate - deploy button',
      category: 'save'
    },
    {
      id: 'risk-assessment-save',
      name: 'Risk Assessment Save',
      component: (
        <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white font-medium transition-colors shadow-lg">
          <Save size={20} />
          Save Risk Assessment
        </button>
      ),
      code: `bg-magenta-600 hover:bg-magenta-500`,
      description: 'From risk assessment templates - solid magenta',
      category: 'save'
    },
    {
      id: 'coshh-save',
      name: 'COSHH Save',
      component: (
        <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white font-medium transition-colors shadow-lg">
          <Save size={20} />
          Save COSHH Assessment
        </button>
      ),
      code: `bg-magenta-600 hover:bg-magenta-500`,
      description: 'From COSHH template - solid magenta with icon',
      category: 'save'
    }
  ];

  // ACTION BUTTON VARIATIONS
  const actionButtonVariations = [
    {
      id: 'ui-outline-action',
      name: 'UI Outline Action',
      component: (
        <Button variant="outline">
          Action
        </Button>
      ),
      code: `variant="outline"`,
      description: 'From UI Button component - outline style',
      category: 'action'
    },
    {
      id: 'ui-destructive-action',
      name: 'UI Destructive Action',
      component: (
        <Button variant="destructive">
          <Trash2 size={16} className="mr-2" />
          Delete
        </Button>
      ),
      code: `variant="destructive"`,
      description: 'From UI Button component - red destructive style',
      category: 'action'
    },
    {
      id: 'site-form-cancel',
      name: 'Site Form Cancel',
      component: (
        <button className="px-6 py-2 text-white border border-white rounded-lg hover:shadow-lg hover:shadow-white/50 hover:border-white/80 transition-all duration-200">
          Cancel
        </button>
      ),
      code: `border-white hover:shadow-white/50`,
      description: 'From SiteFormBase - white border with glow',
      category: 'action'
    },
    {
      id: 'site-form-delete',
      name: 'Site Form Delete',
      component: (
        <button className="px-6 py-2 text-red-400 border border-red-400 rounded-lg hover:shadow-lg hover:shadow-red-400/50 hover:border-red-300 transition-all duration-200">
          Delete Site
        </button>
      ),
      code: `border-red-400 hover:shadow-red-400/50`,
      description: 'From SiteFormBase - red border with glow',
      category: 'action'
    },
    {
      id: 'sop-playground-save',
      name: 'SOP Playground Save',
      component: (
        <button className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-magenta-500 text-magenta-400 hover:bg-magenta-500/10 transition-all">
          <Save size={14} />
          Save
        </button>
      ),
      code: `border-magenta-500 text-magenta-400 hover:bg-magenta-500/10`,
      description: 'From SOPPlayground - magenta border with hover',
      category: 'action'
    },
    {
      id: 'sop-playground-template',
      name: 'SOP Playground Template',
      component: (
        <button className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-white/[0.12] text-white hover:bg-white/[0.12] transition-all">
          <Settings size={14} />
          Load Template
        </button>
      ),
      code: `border-white/[0.12] hover:bg-white/[0.12]`,
      description: 'From SOPPlayground - glass effect',
      category: 'action'
    },
    {
      id: 'library-upload',
      name: 'Library Upload',
      component: (
        <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
          <Upload size={16} />
          Upload CSV
        </button>
      ),
      code: `bg-neutral-800 hover:bg-neutral-700 border-neutral-600`,
      description: 'From library pages - solid neutral background',
      category: 'action'
    },
    {
      id: 'library-download',
      name: 'Library Download',
      component: (
        <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
          <Download size={16} />
          Download CSV
        </button>
      ),
      code: `bg-neutral-800 hover:bg-neutral-700 border-neutral-600`,
      description: 'From library pages - solid neutral background',
      category: 'action'
    }
  ];

  // UI COMPONENT BUTTONS
  const uiButtonVariations = [
    {
      id: 'ui-primary',
      name: 'UI Primary',
      component: (
        <Button variant="primary">
          Primary Button
        </Button>
      ),
      code: `variant="primary"`,
      description: 'From UI Button component - glass effect with pink glow',
      category: 'ui'
    },
    {
      id: 'ui-ghost',
      name: 'UI Ghost',
      component: (
        <Button variant="ghost">
          Ghost Button
        </Button>
      ),
      code: `variant="ghost"`,
      description: 'From UI Button component - transparent with border',
      category: 'ui'
    },
    {
      id: 'ui-secondary',
      name: 'UI Secondary',
      component: (
        <Button variant="secondary">
          Secondary Button
        </Button>
      ),
      code: `variant="secondary"`,
      description: 'From UI Button component - magenta background',
      category: 'ui'
    },
    {
      id: 'ui-outline',
      name: 'UI Outline',
      component: (
        <Button variant="outline">
          Outline Button
        </Button>
      ),
      code: `variant="outline"`,
      description: 'From UI Button component - transparent with border',
      category: 'ui'
    }
  ];

  // CUSTOM BUTTON VARIATIONS
  const customButtonVariations = [
    {
      id: 'gradient-create',
      name: 'Gradient Create',
      component: (
        <button className="px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium">
          <Plus className="inline mr-2 h-4 w-4" />
          Create Template
        </button>
      ),
      code: `bg-gradient-to-r from-pink-600/70 to-blue-600/70`,
      description: 'From templates page - gradient background',
      category: 'custom'
    },
    {
      id: 'incident-log-new',
      name: 'Incident Log New',
      component: (
        <button className="px-3 py-1.5 rounded-md bg-white/[0.08] border border-white/[0.1] text-white/80 hover:bg-white/[0.15] transition-all text-sm">
          Log New Incident
        </button>
      ),
      code: `bg-white/[0.08] border-white/[0.1] hover:bg-white/[0.15]`,
      description: 'From IncidentLog - subtle glass effect',
      category: 'custom'
    },
    {
      id: 'add-chemical',
      name: 'Add Chemical',
      component: (
        <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Chemical
        </button>
      ),
      code: `bg-magenta-500/20 hover:bg-magenta-500/30 border-magenta-500/40`,
      description: 'From risk assessment - magenta tinted background',
      category: 'custom'
    },
    {
      id: 'add-hazard',
      name: 'Add Hazard',
      component: (
        <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 text-sm">
          <Plus size={16} /> Add Hazard
        </button>
      ),
      code: `bg-magenta-500/20 hover:bg-magenta-500/30 border-magenta-500/40`,
      description: 'From risk assessment - magenta tinted background',
      category: 'custom'
    },
    {
      id: 'delete-item',
      name: 'Delete Item',
      component: (
        <button className="text-red-400 hover:text-red-300 disabled:opacity-30">
          <Trash2 size={16} />
        </button>
      ),
      code: `text-red-400 hover:text-red-300`,
      description: 'From various forms - red text with hover',
      category: 'custom'
    },
    {
      id: 'remove-ppe',
      name: 'Remove PPE',
      component: (
        <button className="text-blue-300 hover:text-blue-200">
          <X size={14} />
        </button>
      ),
      code: `text-blue-300 hover:text-blue-200`,
      description: 'From risk assessment - blue text with hover',
      category: 'custom'
    }
  ];

  const allButtons = [
    ...saveButtonVariations,
    ...actionButtonVariations,
    ...uiButtonVariations,
    ...customButtonVariations
  ];

  const filteredButtons = selectedCategory === 'all' 
    ? allButtons 
    : allButtons.filter(b => b.category === selectedCategory);

  const handleButtonSelect = (buttonId: string) => {
    setSelectedButtons(prev => 
      prev.includes(buttonId) 
        ? prev.filter(id => id !== buttonId)
        : [...prev, buttonId]
    );
  };

  const handleSelectAll = () => {
    if (selectedButtons.length === filteredButtons.length) {
      setSelectedButtons([]);
    } else {
      setSelectedButtons(filteredButtons.map(b => b.id));
    }
  };

  const clearAllSelections = () => {
    setSelectedButtons([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Button Playground</h1>
          <p className="text-white/60 text-lg">
            Compare all button variations across your app. Select your favorites to standardize.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          {/* Selection Controls */}
          <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all-buttons"
                checked={filteredButtons.length > 0 && selectedButtons.length === filteredButtons.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
              />
              <label htmlFor="select-all-buttons" className="text-white font-medium">
                Select All ({filteredButtons.length})
              </label>
            </div>
            
            <div className="text-white/60">
              Selected: <span className="text-pink-400 font-semibold">{selectedButtons.length}</span>
            </div>
            
            {selectedButtons.length > 0 && (
              <button
                onClick={clearAllSelections}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredButtons.map((button) => (
            <div 
              key={button.id}
              className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                selectedButtons.includes(button.id)
                  ? 'border-pink-500/50 bg-pink-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              {/* Button Header with Checkbox */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`checkbox-${button.id}`}
                    checked={selectedButtons.includes(button.id)}
                    onChange={() => handleButtonSelect(button.id)}
                    className="w-5 h-5 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{button.name}</h3>
                    <p className="text-sm text-white/60">{button.description}</p>
                  </div>
                </div>
                
                {selectedButtons.includes(button.id) && (
                  <div className="flex items-center gap-1 text-pink-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-medium">SELECTED</span>
                  </div>
                )}
              </div>

              {/* Code Snippet */}
              <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                <code className="text-xs text-green-400 font-mono">{button.code}</code>
              </div>

              {/* Button Preview */}
              <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700/50">
                <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Preview:</div>
                <div className="flex justify-center">
                  {button.component}
                </div>
              </div>

              {/* Button ID */}
              <div className="mt-3 text-xs text-neutral-500">
                ID: <span className="font-mono">{button.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Buttons Summary */}
        {selectedButtons.length > 0 && (
          <div className="mt-12 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-pink-400" />
              Your Selected Buttons ({selectedButtons.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {selectedButtons.map(buttonId => {
                const button = allButtons.find(b => b.id === buttonId);
                if (!button) return null;
                return (
                  <div key={buttonId} className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-3">
                    <div className="text-sm font-medium text-white mb-1">{button.name}</div>
                    <div className="text-xs text-white/60 mb-2">{button.description}</div>
                    <div className="text-xs text-pink-400 font-mono">{button.id}</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Selected Button IDs:</h3>
              <code className="text-xs text-green-400 font-mono break-all">
                {selectedButtons.join(', ')}
              </code>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Button Standardization Plan</h2>
          <div className="space-y-3 text-white/60">
            <p>• <strong className="text-white">Save Buttons</strong> - Choose one style for all save actions</p>
            <p>• <strong className="text-white">Action Buttons</strong> - Standardize cancel, delete, and other actions</p>
            <p>• <strong className="text-white">UI Components</strong> - Use consistent Button component variants</p>
            <p>• <strong className="text-white">Custom Buttons</strong> - Replace with standardized styles</p>
            <p>• <strong className="text-white">Tell me your selections</strong> and I'll implement them everywhere</p>
          </div>
        </div>
      </div>
    </div>
  );
}
