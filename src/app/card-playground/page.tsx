"use client";

import React, { useState } from 'react';
import { 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Mail,
  Phone,
  Archive,
  Save,
  X,
  Eye,
  EyeOff,
  Wrench,
  Paperclip,
  Trash2,
  Edit2,
  Edit3
} from 'lucide-react';

export default function CardPlayground() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'All Cards' },
    { id: 'entity', label: 'Entity Cards' },
    { id: 'asset', label: 'Asset Cards' },
    { id: 'user', label: 'User Cards' },
    { id: 'ui', label: 'UI Cards' }
  ];

  // ENTITY CARD VARIATIONS
  const entityCardVariations = [
    {
      id: 'contractor-card',
      name: 'Contractor Card',
      component: (
        <div className="group relative rounded-xl bg-[#111827] text-white border border-[#1F2937] transition-all duration-150 hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]">
          <div className="flex justify-between items-center px-4 py-3 cursor-pointer select-none">
            <div className="flex flex-col gap-0.5 truncate">
              <div className="text-lg font-semibold text-white">ABC Electrical</div>
              <div className="text-sm text-gray-400">London • contact@abcelectrical.com • 020 1234 5678</div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-400 mr-2">Electrical</span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ),
      code: `bg-[#111827] border border-[#1F2937] hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]`,
      description: 'From ContractorCard - uses EntityCard with CardHeader',
      category: 'entity'
    },
    {
      id: 'site-card',
      name: 'Site Card',
      component: (
        <div className="group relative rounded-xl bg-[#111827] text-white border border-[#1F2937] transition-all duration-150 hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]">
          <div className="flex justify-between items-center px-4 py-3 cursor-pointer select-none">
            <div className="flex flex-col gap-0.5 truncate">
              <div className="text-lg font-semibold text-white">London Central</div>
              <div className="text-sm text-gray-400">123 High Street, London • SW1A 1AA • John Smith • john@site.com • 020 1234 5678</div>
            </div>
            <div className="flex items-center">
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ),
      code: `bg-[#111827] border border-[#1F2937] hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]`,
      description: 'From SiteCard - uses EntityCard with CardHeader',
      category: 'entity'
    }
  ];

  // ASSET CARD VARIATIONS
  const assetCardVariations = [
    {
      id: 'asset-card',
      name: 'Asset Card',
      component: (
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 transition-all duration-150 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-800/50 transition">
              <div className="flex items-center justify-between flex-1 min-w-0 mr-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-white truncate">Commercial Refrigerator</h3>
                  <span className="text-sm text-gray-400 truncate">@ London Central</span>
                </div>
                <div className="flex items-center space-x-8">
                  <span className="text-sm text-gray-400 truncate">Next Service: 15/02/2025</span>
                  <span className="text-sm text-gray-400 truncate">Age: 2 years</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1.5 rounded border border-pink-500 text-pink-500 hover:shadow-[0_0_6px_#ec4899] transition">
                  <Edit2 size={14} />
                </button>
                <button className="p-1.5 rounded border border-red-500 text-red-500 hover:shadow-[0_0_6px_#ef4444] transition">
                  <Archive size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      code: `bg-white/[0.05] border border-white/[0.1] rounded-xl p-3 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]`,
      description: 'From AssetCard - custom card with detailed layout',
      category: 'asset'
    }
  ];

  // USER CARD VARIATIONS
  const userCardVariations = [
    {
      id: 'user-entity-card',
      name: 'User Entity Card',
      component: (
        <div className="group relative rounded-xl bg-[#111827] text-white border border-[#1F2937] transition-all duration-150 hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]">
          <div className="flex justify-between items-center px-4 py-3 cursor-pointer select-none">
            <div className="flex flex-col gap-0.5 truncate">
              <div className="text-lg font-semibold text-white">John Smith</div>
              <div className="text-sm text-gray-400">Manager • London Central • john@company.com • 020 1234 5678</div>
            </div>
            <div className="flex items-center">
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ),
      code: `bg-[#111827] border border-[#1F2937] hover:border-[#EC4899] hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]`,
      description: 'From UserEntityCard - uses CardHeader with edit form',
      category: 'user'
    }
  ];

  // UI CARD VARIATIONS
  const uiCardVariations = [
    {
      id: 'ui-card',
      name: 'UI Card (Style Guide)',
      component: (
        <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-sm">
          <div className="px-4 pt-4">
            <h3 className="text-xl font-semibold text-white mb-3">UI Style Guide Card</h3>
            <p className="text-white/60 mb-4">This follows the official UI style guide specifications</p>
            <button className="w-full bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md px-4 py-2 rounded-lg">
              Action Button
            </button>
          </div>
        </div>
      ),
      code: `rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-sm`,
      description: 'From UI Card component - glass morphism style',
      category: 'ui'
    },
    {
      id: 'marketing-card',
      name: 'Marketing Card',
      component: (
        <div className="p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm min-h-[200px] hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-300">
          <h3 className="text-lg font-semibold text-white mb-2">Marketing Card</h3>
          <p className="text-gray-400 text-sm leading-relaxed">Glass morphism effect with hover animations</p>
        </div>
      ),
      code: `bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]`,
      description: 'From marketing cards - glass morphism with hover effects',
      category: 'ui'
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
            <span className="text-sm text-white">Critical Alert</span>
          </div>
        </div>
      ),
      code: `bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5`,
      description: 'From dashboard cards - subtle background with status indicators',
      category: 'ui'
    },
    {
      id: 'sop-template-card',
      name: 'SOP Template Card',
      component: (
        <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <Wrench size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Food Prep</h3>
          </div>
          <p className="text-sm text-neutral-300">Prep, cooking, and production procedures</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
            <span className="px-2 py-1 bg-neutral-700 text-neutral-300 rounded">Template</span>
            <span>Last updated: 2 days ago</span>
          </div>
        </div>
      ),
      code: `bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600`,
      description: 'From SOP templates - with icon and status badges',
      category: 'ui'
    },
    {
      id: 'checklist-template-card',
      name: 'Checklist Template Card',
      component: (
        <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Fridge Temperature Check</h3>
              <p className="text-sm text-neutral-400">Daily</p>
            </div>
          </div>
        </div>
      ),
      code: `bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600`,
      description: 'From checklist templates - with color indicator',
      category: 'ui'
    }
  ];

  const allCards = [
    ...entityCardVariations,
    ...assetCardVariations,
    ...userCardVariations,
    ...uiCardVariations
  ];

  const filteredCards = selectedCategory === 'all' 
    ? allCards 
    : allCards.filter(c => c.category === selectedCategory);

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCards.length === filteredCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filteredCards.map(c => c.id));
    }
  };

  const clearAllSelections = () => {
    setSelectedCards([]);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Card Playground</h1>
          <p className="text-white/60 text-lg">
            Compare all card variations across your app. Select your favorites to standardize.
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
                id="select-all-cards"
                checked={filteredCards.length > 0 && selectedCards.length === filteredCards.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
              />
              <label htmlFor="select-all-cards" className="text-white font-medium">
                Select All ({filteredCards.length})
              </label>
            </div>
            
            <div className="text-white/60">
              Selected: <span className="text-pink-400 font-semibold">{selectedCards.length}</span>
            </div>
            
            {selectedCards.length > 0 && (
              <button
                onClick={clearAllSelections}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredCards.map((card) => (
            <div 
              key={card.id}
              className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                selectedCards.includes(card.id)
                  ? 'border-pink-500/50 bg-pink-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              {/* Card Info with Checkbox */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`checkbox-${card.id}`}
                    checked={selectedCards.includes(card.id)}
                    onChange={() => handleCardSelect(card.id)}
                    className="w-5 h-5 text-pink-500 bg-white/[0.05] border-white/[0.2] rounded focus:ring-pink-500 focus:ring-2"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{card.name}</h3>
                    <p className="text-sm text-white/60">{card.description}</p>
                  </div>
                </div>
                
                {selectedCards.includes(card.id) && (
                  <div className="flex items-center gap-1 text-pink-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-medium">SELECTED</span>
                  </div>
                )}
              </div>

              {/* Code Snippet */}
              <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                <code className="text-xs text-green-400 font-mono">{card.code}</code>
              </div>

              {/* Card Preview */}
              <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700/50">
                <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Preview:</div>
                {card.component}
              </div>

              {/* Card ID */}
              <div className="mt-3 text-xs text-neutral-500">
                ID: <span className="font-mono">{card.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Cards Summary */}
        {selectedCards.length > 0 && (
          <div className="mt-12 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-pink-400" />
              Your Selected Cards ({selectedCards.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {selectedCards.map(cardId => {
                const card = allCards.find(c => c.id === cardId);
                if (!card) return null;
                return (
                  <div key={cardId} className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-3">
                    <div className="text-sm font-medium text-white mb-1">{card.name}</div>
                    <div className="text-xs text-white/60 mb-2">{card.description}</div>
                    <div className="text-xs text-pink-400 font-mono">{card.id}</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Selected Card IDs:</h3>
              <code className="text-xs text-green-400 font-mono break-all">
                {selectedCards.join(', ')}
              </code>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Card Standardization Plan</h2>
          <div className="space-y-3 text-white/60">
            <p>• <strong className="text-white">Entity Cards</strong> - Choose one style for contractors, sites, users</p>
            <p>• <strong className="text-white">Asset Cards</strong> - Standardize asset display cards</p>
            <p>• <strong className="text-white">UI Cards</strong> - Consistent card styling across the app</p>
            <p>• <strong className="text-white">Tell me your selections</strong> and I'll implement them everywhere</p>
          </div>
        </div>
      </div>
    </div>
  );
}
