"use client";

import React from 'react';
import { 
  Shield, 
  Wrench, 
  Briefcase, 
  Users, 
  FileCheck, 
  AlertTriangle,
  MessageSquare,
  Pin
} from '@/components/ui/icons';
import { TopicCategory, ConversationFilters } from '@/types/messaging';

interface TopicFilterProps {
  currentFilters: ConversationFilters;
  onFilterChange: (filters: ConversationFilters) => void;
  counts?: Record<TopicCategory | 'pinned' | 'all', number>;
}

const topicConfig: Record<TopicCategory | 'all' | 'pinned', {
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}> = {
  all: {
    label: 'All Topics',
    icon: MessageSquare,
    color: 'text-theme-secondary',
    description: 'Show all conversations'
  },
  pinned: {
    label: 'Pinned',
    icon: Pin,
    color: 'text-yellow-600 dark:text-yellow-400',
    description: 'Important conversations'
  },
  safety: {
    label: 'Safety',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    description: 'Safety incidents and protocols'
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Equipment and facility maintenance'
  },
  operations: {
    label: 'Operations',
    icon: Briefcase,
    color: 'text-green-600 dark:text-green-400',
    description: 'Day-to-day operations'
  },
  hr: {
    label: 'HR',
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    description: 'Staff and scheduling'
  },
  compliance: {
    label: 'Compliance',
    icon: FileCheck,
    color: 'text-module-fg',
    description: 'Compliance and documentation'
  },
  incidents: {
    label: 'Incidents',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'Incident reports'
  },
  general: {
    label: 'General',
    icon: MessageSquare,
    color: 'text-theme-secondary',
    description: 'General discussions'
  }
};

export default function TopicFilter({ currentFilters, onFilterChange, counts }: TopicFilterProps) {
  const categories: (TopicCategory | 'all' | 'pinned')[] = [
    'all',
    'pinned',
    'safety',
    'maintenance',
    'operations',
    'hr',
    'compliance',
    'incidents',
    'general'
  ];

  const handleTopicClick = (category: TopicCategory | 'all' | 'pinned') => {
    if (category === 'all') {
      onFilterChange({ ...currentFilters, topicCategory: undefined, isPinned: undefined });
    } else if (category === 'pinned') {
      onFilterChange({ ...currentFilters, isPinned: true, topicCategory: undefined });
    } else {
      onFilterChange({ ...currentFilters, topicCategory: category, isPinned: undefined });
    }
  };

  const isActive = (category: TopicCategory | 'all' | 'pinned') => {
    if (category === 'all') {
      return !currentFilters.topicCategory && !currentFilters.isPinned;
    }
    if (category === 'pinned') {
      return currentFilters.isPinned === true;
    }
    return currentFilters.topicCategory === category;
  };

  return (
    <div>
      {/* Wrap to multiple rows on desktop, scroll on mobile */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const config = topicConfig[category];
          const Icon = config.icon;
          const count = counts?.[category] || 0;
          const active = isActive(category);

          return (
            <button
              key={category}
              onClick={() => handleTopicClick(category)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap
                ${active 
                  ? 'bg-transparent border border-[#D37E91] text-[#D37E91] shadow-[0_0_12px_rgba(211, 126, 145,0.7)]' 
                  : 'bg-gray-50 dark:bg-white/[0.03] border border-theme hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                }
              `}
              title={config.description}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#D37E91]' : config.color}`} />
              <span className={`text-sm font-medium ${active ? 'text-[#D37E91]' : 'text-theme-secondary'}`}>
                {config.label}
              </span>
              {count > 0 && (
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${active 
                    ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/30 text-[#D37E91] dark:text-[#D37E91]' 
                    : 'bg-gray-200 dark:bg-white/[0.1] text-theme-secondary'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {(currentFilters.topicCategory || currentFilters.isPinned) && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-theme-tertiary">Showing:</span>
          <span className="text-xs text-[#D37E91] font-medium">
            {currentFilters.isPinned 
              ? 'Pinned Conversations' 
              : topicConfig[currentFilters.topicCategory!].label
            }
          </span>
          <button
            onClick={() => onFilterChange({ ...currentFilters, topicCategory: undefined, isPinned: undefined })}
            className="text-xs text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-tertiary underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

