"use client";

import React from 'react';
import { CheckCircle, Circle, Loader } from '@/components/ui/icons';
import { FIRE_RA_SECTIONS } from '@/lib/fire-ra/constants';
import { computeSectionCompletion, computeOverallCompletion } from '@/lib/fire-ra/utils';
import type { FireRASection, FireRAComplexityTier } from '@/types/fire-ra';

interface FireRASectionNavProps {
  sections: FireRASection[];
  activeSection: number;
  tier: FireRAComplexityTier;
  onSectionChange: (sectionNumber: number) => void;
}

export default function FireRASectionNav({
  sections,
  activeSection,
  tier,
  onSectionChange,
}: FireRASectionNavProps) {
  const overall = computeOverallCompletion(sections);

  const getSectionIcon = (section: FireRASection) => {
    if (!section.isApplicable) return <Circle size={14} className="text-gray-300 dark:text-neutral-600" />;
    const { percent } = computeSectionCompletion(section);
    if (percent === 100) return <CheckCircle size={14} className="text-green-500" />;
    if (percent > 0) return <Loader size={14} className="text-amber-500" />;
    return <Circle size={14} className="text-gray-400 dark:text-neutral-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400 mb-1">
          <span>Overall Progress</span>
          <span>{overall.percent}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${overall.percent}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      <nav className="space-y-0.5">
        {FIRE_RA_SECTIONS.map(def => {
          const section = sections.find(s => s.sectionNumber === def.number);
          const isApplicable = section?.isApplicable ?? (!def.enhancedOnly || tier !== 'standard');
          const isActive = activeSection === def.number;

          return (
            <button
              key={def.number}
              type="button"
              onClick={() => isApplicable && onSectionChange(def.number)}
              disabled={!isApplicable}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                isActive
                  ? 'bg-module-fg/15 text-module-fg font-medium border-l-2 border-module-fg'
                  : isApplicable
                  ? 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800/50'
                  : 'text-gray-300 dark:text-neutral-600 cursor-not-allowed'
              }`}
            >
              {section ? getSectionIcon(section) : <Circle size={14} className="text-gray-300 dark:text-neutral-600" />}
              <span className="font-mono text-xs text-gray-400 dark:text-neutral-500 w-5">{def.number}</span>
              <span className="truncate">{def.name}</span>
              {!isApplicable && (
                <span className="text-[10px] text-gray-400 dark:text-neutral-600 ml-auto">N/A</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
