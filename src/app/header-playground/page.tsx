"use client";

import React, { useState } from 'react';
import { 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
  Settings,
  Info,
  ArrowRight
} from 'lucide-react';

export default function CardHeaderPlayground() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'All Headers' },
    { id: 'page', label: 'Page Headers' },
    { id: 'card', label: 'Card Headers' },
    { id: 'section', label: 'Section Headers' },
    { id: 'ui', label: 'UI Component Headers' }
  ];

  // PAGE HEADER VARIATIONS
  const pageHeaderVariations = [
    {
      id: 'marketing-h1',
      name: 'Marketing H1',
      component: (
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
          Turn Chaos into Clarity
        </h1>
      ),
      code: `text-5xl md:text-6xl font-bold bg-gradient-to-r from-magenta-500 to-blue-500`,
      description: 'From marketing home page - large gradient text',
      category: 'page'
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
      description: 'From PageLayout - clean white text',
      category: 'page'
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
      description: 'From UI style guide - pure white headings',
      category: 'page'
    },
    {
      id: 'templates-page-h1',
      name: 'Templates Page H1',
      component: (
        <h1 className="text-3xl font-bold text-white">
          Task Templates
        </h1>
      ),
      code: `text-3xl font-bold text-white`,
      description: 'From templates page - simple white heading',
      category: 'page'
    },
    {
      id: 'compliance-page-h1',
      name: 'Compliance Page H1',
      component: (
        <h1 className="text-2xl font-semibold mb-2">Available Templates</h1>
      ),
      code: `text-2xl font-semibold mb-2`,
      description: 'From compliance page - smaller semibold heading',
      category: 'page'
    }
  ];

  // CARD HEADER VARIATIONS
  const cardHeaderVariations = [
    {
      id: 'ui-card-header',
      name: 'UI Card Header',
      component: (
        <div className="px-4 pt-4">
          <h3 className="text-xl font-semibold text-white mb-3">UI Style Guide Card</h3>
        </div>
      ),
      code: `text-xl font-semibold text-white mb-3`,
      description: 'From UI Card component - clean card title',
      category: 'card'
    },
    {
      id: 'marketing-card-header',
      name: 'Marketing Card Header',
      component: (
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Marketing Card</h3>
        </div>
      ),
      code: `text-lg font-semibold text-white mb-2`,
      description: 'From marketing cards - medium semibold heading',
      category: 'card'
    },
    {
      id: 'sop-template-header',
      name: 'SOP Template Header',
      component: (
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-lg bg-white/10">
            <Settings size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Food Prep</h3>
        </div>
      ),
      code: `text-lg font-semibold text-white`,
      description: 'From SOP templates - with icon and semibold',
      category: 'card'
    },
    {
      id: 'checklist-template-header',
      name: 'Checklist Template Header',
      component: (
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
          <div>
            <h3 className="text-lg font-semibold text-white">Fridge Temperature Check</h3>
            <p className="text-sm text-neutral-400">Daily</p>
          </div>
        </div>
      ),
      code: `text-lg font-semibold text-white`,
      description: 'From checklist templates - with color indicator',
      category: 'card'
    },
    {
      id: 'dashboard-card-header',
      name: 'Dashboard Card Header',
      component: (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-2xl font-semibold text-white mb-2">Dashboard Section</h3>
        </div>
      ),
      code: `text-2xl font-semibold text-white mb-2`,
      description: 'From dashboard cards - large semibold heading',
      category: 'card'
    },
    {
      id: 'template-card-header',
      name: 'Template Card Header',
      component: (
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            Template Name
          </h3>
        </div>
      ),
      code: `font-semibold text-white text-sm truncate`,
      description: 'From template cards - small semibold with truncate',
      category: 'card'
    },
    {
      id: 'compliance-template-header',
      name: 'Compliance Template Header',
      component: (
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">SFBB Temperature Checks</h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Draft
          </span>
        </div>
      ),
      code: `text-lg font-semibold`,
      description: 'From compliance templates - with status badge',
      category: 'card'
    }
  ];

  // SECTION HEADER VARIATIONS
  const sectionHeaderVariations = [
    {
      id: 'ui-h2',
      name: 'UI H2',
      component: (
        <h2 className="text-2xl font-semibold text-white mb-4">
          Section Title
        </h2>
      ),
      code: `text-2xl font-semibold text-white mb-4`,
      description: 'From UI style guide - section headings',
      category: 'section'
    },
    {
      id: 'ui-h3',
      name: 'UI H3',
      component: (
        <h3 className="text-xl font-medium text-white mb-3">
          Card or Subtitle
        </h3>
      ),
      code: `text-xl font-medium text-white mb-3`,
      description: 'From UI style guide - card titles',
      category: 'section'
    },
    {
      id: 'site-form-h2',
      name: 'Site Form H2',
      component: (
        <h2 className="text-2xl font-semibold text-white">
          Add New Site
        </h2>
      ),
      code: `text-2xl font-semibold text-white`,
      description: 'From SiteFormBase - form title',
      category: 'section'
    },
    {
      id: 'site-form-h3',
      name: 'Site Form H3',
      component: (
        <h3 className="text-xl font-semibold mb-3 text-white">Core Details</h3>
      ),
      code: `text-xl font-semibold mb-3 text-white`,
      description: 'From SiteFormBase - section titles',
      category: 'section'
    },
    {
      id: 'incident-log-h2',
      name: 'Incident Log H2',
      component: (
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-magenta-400" />
          <h2 className="text-lg font-semibold">Incident Log</h2>
        </div>
      ),
      code: `text-lg font-semibold`,
      description: 'From IncidentLog - with icon and medium size',
      category: 'section'
    },
    {
      id: 'emergency-breakdowns-h2',
      name: 'Emergency Breakdowns H2',
      component: (
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Pending Maintenance</h2>
        </div>
      ),
      code: `text-lg font-semibold text-red-400`,
      description: 'From EmergencyBreakdowns - with icon and red color',
      category: 'section'
    }
  ];

  // UI COMPONENT HEADERS
  const uiHeaderVariations = [
    {
      id: 'card-header-component',
      name: 'CardHeader Component',
      component: (
        <div className="flex justify-between items-center px-4 py-3 cursor-pointer select-none">
          <div className="flex flex-col gap-0.5 truncate flex-1">
            <div className="text-lg font-semibold text-white">Card Title</div>
            <div className="text-sm text-gray-400">Card subtitle with details</div>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      ),
      code: `text-lg font-semibold text-white`,
      description: 'From CardHeader component - expandable card header',
      category: 'ui'
    },
    {
      id: 'entity-card-header',
      name: 'Entity Card Header',
      component: (
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Entity Name</h3>
            <p className="text-sm text-neutral-400">Entity description</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-neutral-800 rounded-lg">
              <Settings className="w-4 h-4 text-neutral-400" />
            </button>
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
        </div>
      ),
      code: `text-lg font-semibold text-white`,
      description: 'From EntityCard - with actions and chevron',
      category: 'ui'
    }
  ];

  const allHeaders = [
    ...pageHeaderVariations,
    ...cardHeaderVariations,
    ...sectionHeaderVariations,
    ...uiHeaderVariations
  ];

  const filteredHeaders = selectedCategory === 'all' 
    ? allHeaders 
    : allHeaders.filter(h => h.category === selectedCategory);

  const handleHeaderSelect = (headerId: string) => {
    setSelectedHeaders(prev => 
      prev.includes(headerId) 
        ? prev.filter(id => id !== headerId)
        : [...prev, headerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedHeaders.length === filteredHeaders.length) {
      setSelectedHeaders([]);
    } else {
      setSelectedHeaders(filteredHeaders.map(h => h.id));
    }
  };

  const clearAllSelections = () => {
    setSelectedHeaders([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Card Header Playground</h1>
          <p className="text-white/60 text-lg">
            Compare all header variations across your app. Select your favorites to standardize.
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
                id="select-all-headers"
                checked={filteredHeaders.length > 0 && selectedHeaders.length === filteredHeaders.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
              />
              <label htmlFor="select-all-headers" className="text-white font-medium">
                Select All ({filteredHeaders.length})
              </label>
            </div>
            
            <div className="text-white/60">
              Selected: <span className="text-pink-400 font-semibold">{selectedHeaders.length}</span>
            </div>
            
            {selectedHeaders.length > 0 && (
              <button
                onClick={clearAllSelections}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Headers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredHeaders.map((header) => (
            <div 
              key={header.id}
              className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                selectedHeaders.includes(header.id)
                  ? 'border-pink-500/50 bg-pink-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              {/* Header Info with Checkbox */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`checkbox-${header.id}`}
                    checked={selectedHeaders.includes(header.id)}
                    onChange={() => handleHeaderSelect(header.id)}
                    className="w-5 h-5 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{header.name}</h3>
                    <p className="text-sm text-white/60">{header.description}</p>
                  </div>
                </div>
                
                {selectedHeaders.includes(header.id) && (
                  <div className="flex items-center gap-1 text-pink-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-medium">SELECTED</span>
                  </div>
                )}
              </div>

              {/* Code Snippet */}
              <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                <code className="text-xs text-green-400 font-mono">{header.code}</code>
              </div>

              {/* Header Preview */}
              <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700/50">
                <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Preview:</div>
                {header.component}
              </div>

              {/* Header ID */}
              <div className="mt-3 text-xs text-neutral-500">
                ID: <span className="font-mono">{header.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Headers Summary */}
        {selectedHeaders.length > 0 && (
          <div className="mt-12 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-pink-400" />
              Your Selected Headers ({selectedHeaders.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {selectedHeaders.map(headerId => {
                const header = allHeaders.find(h => h.id === headerId);
                if (!header) return null;
                return (
                  <div key={headerId} className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-3">
                    <div className="text-sm font-medium text-white mb-1">{header.name}</div>
                    <div className="text-xs text-white/60 mb-2">{header.description}</div>
                    <div className="text-xs text-pink-400 font-mono">{header.id}</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Selected Header IDs:</h3>
              <code className="text-xs text-green-400 font-mono break-all">
                {selectedHeaders.join(', ')}
              </code>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Header Standardization Plan</h2>
          <div className="space-y-3 text-white/60">
            <p>• <strong className="text-white">Page Headers</strong> - Choose one style for main page titles</p>
            <p>• <strong className="text-white">Card Headers</strong> - Standardize card titles and subtitles</p>
            <p>• <strong className="text-white">Section Headers</strong> - Consistent section and subsection titles</p>
            <p>• <strong className="text-white">UI Components</strong> - Use consistent header components</p>
            <p>• <strong className="text-white">Tell me your selections</strong> and I'll implement them everywhere</p>
          </div>
        </div>
      </div>
    </div>
  );
}
