"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Settings, 
  Save, 
  Download, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Camera, 
  Thermometer, 
  FileText,
  ChefHat,
  Users,
  Wine,
  Coffee,
  IceCream,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
  Package,
  Shield,
  FlaskConical,
  ShoppingBag,
  GlassWater,
  Boxes,
  UtensilsCrossed
} from 'lucide-react';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';

export default function DesignSystemPlayground() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'All Components' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'cards', label: 'Cards' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'headers', label: 'Headers' },
    { id: 'modals', label: 'Modals' }
  ];

  // BUTTON VARIATIONS
  const buttonVariations = [
    {
      id: 'ui-primary',
      name: 'UI Primary (Current)',
      component: (
        <Button variant="primary">
          Primary Button
        </Button>
      ),
      code: `variant="primary"`,
      description: 'Glass effect with pink glow - from UI component'
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
      description: 'Transparent with border'
    },
    {
      id: 'ui-destructive',
      name: 'UI Destructive',
      component: (
        <Button variant="destructive">
          Delete
        </Button>
      ),
      code: `variant="destructive"`,
      description: 'Red background for dangerous actions'
    },
    {
      id: 'ui-secondary',
      name: 'UI Secondary',
      component: (
        <Button variant="secondary">
          Secondary
        </Button>
      ),
      code: `variant="secondary"`,
      description: 'Magenta background'
    },
    {
      id: 'ui-outline',
      name: 'UI Outline',
      component: (
        <Button variant="outline">
          Outline
        </Button>
      ),
      code: `variant="outline"`,
      description: 'Transparent with border'
    },
    {
      id: 'sop-gradient',
      name: 'SOP Gradient',
      component: (
        <button className="px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium">
          Gradient Button
        </button>
      ),
      code: `bg-gradient-to-r from-pink-600/70 to-blue-600/70`,
      description: 'From SOP templates - gradient background'
    },
    {
      id: 'sop-solid',
      name: 'SOP Solid',
      component: (
        <button className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-all">
          Solid Button
        </button>
      ),
      code: `bg-neutral-700 hover:bg-neutral-600`,
      description: 'From SOP templates - solid background'
    },
    {
      id: 'sop-glass',
      name: 'SOP Glass',
      component: (
        <button className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-white/[0.12] text-white hover:bg-white/[0.12] transition-all">
          <Save size={14} />
          Glass Button
        </button>
      ),
      code: `border-white/[0.12] hover:bg-white/[0.12]`,
      description: 'From SOP playground - glass effect'
    },
    {
      id: 'marketing-cta',
      name: 'Marketing CTA',
      component: (
        <button className="btn-glass-cta">
          Try Checkly Free
        </button>
      ),
      code: `className="btn-glass-cta"`,
      description: 'From marketing home page'
    }
  ];

  // CARD VARIATIONS
  const cardVariations = [
    {
      id: 'marketing-glass',
      name: 'Marketing Glass',
      component: (
        <div className="p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm min-h-[200px] hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-300">
          <h3 className="text-lg font-semibold text-white mb-2">Marketing Card</h3>
          <p className="text-gray-400 text-sm leading-relaxed">Glass morphism effect with hover animations</p>
        </div>
      ),
      code: `bg-white/5 border-white/10 hover:bg-white/10`,
      description: 'From marketing home page - glass morphism'
    },
    {
      id: 'task-card',
      name: 'Task Card',
      component: (
        <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-400" />
              <span className="text-sm font-medium text-white">Task Name</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3 text-neutral-400" />
            </div>
          </div>
          <p className="text-sm text-neutral-400 line-clamp-2">Task description goes here</p>
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
            <span>Due: Today</span>
            <span className="px-2 py-1 bg-neutral-700/50 rounded text-neutral-300">Category</span>
          </div>
        </div>
      ),
      code: `bg-neutral-800/50 border-neutral-700`,
      description: 'From task cards - solid dark background'
    },
    {
      id: 'sop-template',
      name: 'SOP Template',
      component: (
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6 text-left hover:scale-105 transition-all cursor-pointer group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <ChefHat size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Food Prep</h3>
          </div>
          <p className="text-sm text-neutral-300">Prep, cooking, and production procedures</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
            <Plus size={14} />
            <span>Create new</span>
          </div>
        </div>
      ),
      code: `bg-gradient-to-br from-orange-500/20 to-red-500/20`,
      description: 'From SOP templates - gradient backgrounds'
    },
    {
      id: 'checklist-template',
      name: 'Checklist Template',
      component: (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
              <div>
                <h3 className="text-lg font-semibold text-white">Fridge Temperature Check</h3>
                <p className="text-sm text-neutral-400">Daily</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-neutral-400" />
              <Info className="h-4 w-4 text-neutral-400" />
              <ArrowRight className="h-4 w-4 text-neutral-400" />
            </div>
          </div>
          <p className="text-sm text-neutral-300">Cold hold compliance monitoring</p>
        </div>
      ),
      code: `bg-white/[0.03] border-white/[0.06]`,
      description: 'From checklist templates - very subtle glass'
    },
    {
      id: 'ui-card',
      name: 'UI Card (Style Guide)',
      component: (
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 shadow-[0_4px_40px_rgba(0,0,0,0.4)] hover:shadow-[0_0_10px_rgba(236,72,153,0.25)] transition-all">
          <h3 className="text-xl font-semibold text-white mb-3">UI Style Guide Card</h3>
          <p className="text-white/60 mb-4">This follows the official UI style guide specifications</p>
          <Button variant="primary" className="w-full">Action Button</Button>
        </div>
      ),
      code: `bg-white/[0.05] border-white/[0.1] rounded-2xl`,
      description: 'From UI style guide - official specification'
    },
    {
      id: 'dashboard-card',
      name: 'Dashboard Card',
      component: (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-2xl font-semibold text-white mb-2">Dashboard Section</h3>
          <p className="text-base text-white/60 mb-4">Dashboard content card</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-400">Critical Alert</span>
          </div>
        </div>
      ),
      code: `bg-white/[0.03] border-white/[0.06] rounded-2xl`,
      description: 'From dashboard - subtle glass with status indicators'
    }
  ];

  // INPUT VARIATIONS
  const inputVariations = [
    {
      id: 'ui-input',
      name: 'UI Input (Current)',
      component: (
        <Input 
          placeholder="Enter text..." 
          className="w-full"
        />
      ),
      code: `bg-white/[0.06] border-white/[0.12] focus:ring-pink-500/50`,
      description: 'From UI component - glass effect with pink focus'
    },
    {
      id: 'page-layout-input',
      name: 'Page Layout Input',
      component: (
        <input
          type="text"
          placeholder="Search..."
          className="bg-neutral-900 text-white border-neutral-700 focus:border-pink-500 rounded-lg px-3 py-2 w-full"
        />
      ),
      code: `bg-neutral-900 border-neutral-700 focus:border-pink-500`,
      description: 'From PageLayout - solid dark background'
    },
    {
      id: 'sop-input',
      name: 'SOP Input',
      component: (
        <input
          type="text"
          placeholder="SOP input..."
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white w-full"
        />
      ),
      code: `bg-neutral-800 border-neutral-600`,
      description: 'From SOP templates - neutral background'
    }
  ];

  // HEADER VARIATIONS
  const headerVariations = [
    {
      id: 'marketing-h1',
      name: 'Marketing H1',
      component: (
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
          Turn Chaos into Clarity
        </h1>
      ),
      code: `text-5xl md:text-6xl font-bold bg-gradient-to-r from-magenta-500 to-blue-500`,
      description: 'From marketing home page - large gradient text'
    },
    {
      id: 'page-layout-h1',
      name: 'Page Layout H1',
      component: (
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Page Title
        </h1>
      ),
      code: `text-3xl font-bold text-white tracking-tight`,
      description: 'From PageLayout - clean white text'
    },
    {
      id: 'ui-h1',
      name: 'UI H1 (Style Guide)',
      component: (
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Page or Form Title
        </h1>
      ),
      code: `text-4xl md:text-5xl font-bold text-white`,
      description: 'From UI style guide - pure white headings'
    },
    {
      id: 'ui-h2',
      name: 'UI H2',
      component: (
        <h2 className="text-2xl font-semibold text-white mb-4">
          Section Title
        </h2>
      ),
      code: `text-2xl font-semibold text-white`,
      description: 'From UI style guide - section headings'
    },
    {
      id: 'ui-h3',
      name: 'UI H3',
      component: (
        <h3 className="text-xl font-medium text-white mb-3">
          Card or Subtitle
        </h3>
      ),
      code: `text-xl font-medium text-white`,
      description: 'From UI style guide - card titles'
    }
  ];

  const allComponents = [
    ...buttonVariations.map(c => ({ ...c, category: 'buttons' })),
    ...cardVariations.map(c => ({ ...c, category: 'cards' })),
    ...inputVariations.map(c => ({ ...c, category: 'inputs' })),
    ...headerVariations.map(c => ({ ...c, category: 'headers' }))
  ];

  const filteredComponents = selectedCategory === 'all' 
    ? allComponents 
    : allComponents.filter(c => c.category === selectedCategory);

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponents(prev => 
      prev.includes(componentId) 
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComponents.length === filteredComponents.length) {
      setSelectedComponents([]);
    } else {
      setSelectedComponents(filteredComponents.map(c => c.id));
    }
  };

  const clearAllSelections = () => {
    setSelectedComponents([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Design System Playground</h1>
          <p className="text-white/60 text-lg">
            Compare all component variations side by side. Click on components to see their code.
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
                id="select-all"
                checked={filteredComponents.length > 0 && selectedComponents.length === filteredComponents.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
              />
              <label htmlFor="select-all" className="text-white font-medium">
                Select All ({filteredComponents.length})
              </label>
            </div>
            
            <div className="text-white/60">
              Selected: <span className="text-pink-400 font-semibold">{selectedComponents.length}</span>
            </div>
            
            {selectedComponents.length > 0 && (
              <button
                onClick={clearAllSelections}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredComponents.map((component) => (
            <div 
              key={component.id}
              className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                selectedComponents.includes(component.id)
                  ? 'border-pink-500/50 bg-pink-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              {/* Component Header with Checkbox */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`checkbox-${component.id}`}
                    checked={selectedComponents.includes(component.id)}
                    onChange={() => handleComponentSelect(component.id)}
                    className="w-5 h-5 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{component.name}</h3>
                    <p className="text-sm text-white/60">{component.description}</p>
                  </div>
                </div>
                
                {selectedComponents.includes(component.id) && (
                  <div className="flex items-center gap-1 text-pink-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-medium">SELECTED</span>
                  </div>
                )}
              </div>

              {/* Code Snippet */}
              <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                <code className="text-xs text-green-400 font-mono">{component.code}</code>
              </div>

              {/* Component Preview */}
              <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700/50">
                <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Preview:</div>
                {component.component}
              </div>

              {/* Component ID */}
              <div className="mt-3 text-xs text-neutral-500">
                ID: <span className="font-mono">{component.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Components Summary */}
        {selectedComponents.length > 0 && (
          <div className="mt-12 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-pink-400" />
              Your Selected Components ({selectedComponents.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {selectedComponents.map(componentId => {
                const component = allComponents.find(c => c.id === componentId);
                if (!component) return null;
                return (
                  <div key={componentId} className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-3">
                    <div className="text-sm font-medium text-white mb-1">{component.name}</div>
                    <div className="text-xs text-white/60 mb-2">{component.description}</div>
                    <div className="text-xs text-pink-400 font-mono">{component.id}</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Selected Component IDs:</h3>
              <code className="text-xs text-green-400 font-mono break-all">
                {selectedComponents.join(', ')}
              </code>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">How to Use This Playground</h2>
          <div className="space-y-3 text-white/60">
            <p>• <strong className="text-white">Browse components</strong> by category using the filter buttons above</p>
            <p>• <strong className="text-white">Check the boxes</strong> next to components you like</p>
            <p>• <strong className="text-white">Use Select All</strong> to quickly select all components in a category</p>
            <p>• <strong className="text-white">See your selections</strong> in the summary section below</p>
            <p>• <strong className="text-white">Copy the Component IDs</strong> and tell me which ones you prefer</p>
            <p>• <strong className="text-white">I'll standardize</strong> your chosen styles across the entire app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
