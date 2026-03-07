"use client";

import React from 'react';
import { Plus, Sparkles } from '@/components/ui/icons';
import { FIRE_RA_SECTIONS, SECTION_ITEMS } from '@/lib/fire-ra/constants';
import { createEmptyItem, computeSectionCompletion } from '@/lib/fire-ra/utils';
import FireRAItemCard from './FireRAItemCard';
import type { FireRASection, FireRAItem, FireRAAIField, FireRAComplexityTier, PremisesType } from '@/types/fire-ra';

interface FireRASectionPanelProps {
  section: FireRASection;
  tier: FireRAComplexityTier;
  premisesType: PremisesType;
  onSectionChange: (updated: FireRASection) => void;
  onAIAssist?: (sectionNumber: number, itemNumber: string, field: FireRAAIField) => void;
  aiLoading?: Record<string, boolean>;
}

export default function FireRASectionPanel({
  section,
  tier,
  premisesType,
  onSectionChange,
  onAIAssist,
  aiLoading = {},
}: FireRASectionPanelProps) {
  const def = FIRE_RA_SECTIONS.find(s => s.number === section.sectionNumber);
  const completion = computeSectionCompletion(section);

  if (!section.isApplicable) {
    return (
      <div className="bg-theme-surface/50 rounded-xl p-6 border border-theme opacity-60">
        <h2 className="text-lg font-semibold text-theme-primary">
          Section {section.sectionNumber}: {section.sectionName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2">
          This section is not applicable for your assessment tier.
        </p>
      </div>
    );
  }

  // Section 1 (General Info) and Section 12 (Summary) are handled separately
  if (section.sectionNumber === 1 || section.sectionNumber === 12) {
    return null;
  }

  const updateItem = (itemId: string, updated: FireRAItem) => {
    onSectionChange({
      ...section,
      items: section.items.map(i => i.id === itemId ? updated : i),
    });
  };

  const deleteItem = (itemId: string) => {
    onSectionChange({
      ...section,
      items: section.items.filter(i => i.id !== itemId),
    });
  };

  const addCustomItem = () => {
    const nextNum = section.items.length + 1;
    const itemNumber = `${section.sectionNumber}.${nextNum}`;
    const newItem = createEmptyItem(itemNumber, 'Custom assessment item', false, section.items.length);
    onSectionChange({
      ...section,
      items: [...section.items, newItem],
    });
  };

  return (
    <div className="bg-theme-surface/50 rounded-xl p-6 border border-theme space-y-4">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-theme-primary">
            Section {section.sectionNumber}: {section.sectionName}
          </h2>
          {def && (
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{def.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-gray-500 dark:text-neutral-400">
            {completion.completed}/{completion.total}
          </span>
          {completion.total > 0 && (
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {section.items.map(item => (
          <FireRAItemCard
            key={item.id}
            item={item}
            onChange={(updated) => updateItem(item.id, updated)}
            onDelete={() => deleteItem(item.id)}
            onAIAssist={onAIAssist ? (field) => onAIAssist(section.sectionNumber, item.itemNumber, field) : undefined}
            aiLoading={aiLoading}
            canDelete={!SECTION_ITEMS[section.sectionNumber]?.some(d => d.itemNumber === item.itemNumber)}
            premisesType={premisesType}
          />
        ))}
      </div>

      {/* Add Custom Item */}
      <button
        type="button"
        onClick={addCustomItem}
        className="flex items-center gap-2 px-4 py-2 bg-module-fg/10 hover:bg-module-fg/20 border border-module-fg/30 rounded-lg text-module-fg text-sm transition-colors"
      >
        <Plus size={14} />
        Add Custom Item
      </button>

      {/* Section Notes */}
      <div>
        <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Section Notes</label>
        <textarea
          value={section.sectionNotes}
          onChange={(e) => onSectionChange({ ...section, sectionNotes: e.target.value })}
          className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm"
          rows={2}
          placeholder="Additional notes for this section..."
        />
      </div>
    </div>
  );
}
