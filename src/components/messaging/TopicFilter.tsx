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
} from 'lucide-react';
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
    color: 'text-white',
    description: 'Show all conversations'
  },
  pinned: {
    label: 'Pinned',
    icon: Pin,
    color: 'text-yellow-400',
    description: 'Important conversations'
  },
  safety: {
    label: 'Safety',
    icon: Shield,
    color: 'text-red-400',
    description: 'Safety incidents and protocols'
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-blue-400',
    description: 'Equipment and facility maintenance'
  },
  operations: {
    label: 'Operations',
    icon: Briefcase,
    color: 'text-green-400',
    description: 'Day-to-day operations'
  },
  hr: {
    label: 'HR',
    icon: Users,
    color: 'text-purple-400',
    description: 'Staff and scheduling'
  },
  compliance: {
    label: 'Compliance',
    icon: FileCheck,
    color: 'text-cyan-400',
    description: 'Compliance and documentation'
  },
  incidents: {
    label: 'Incidents',
    icon: AlertTriangle,
    color: 'text-orange-400',
    description: 'Incident reports'
  },
  general: {
    label: 'General',
    icon: MessageSquare,
    color: 'text-gray-400',
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
    <div className="bg-white/[0.02] border-b border-white/[0.06] p-4">
      <h3 className="text-sm font-medium text-white/60 mb-3">Filter by Topic</h3>
      
      {/* Horizontal scrollable filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                  ? 'bg-transparent border border-[#EC4899] text-[#EC4899] shadow-[0_0_12px_rgba(236,72,153,0.7)]' 
                  : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                }
              `}
              title={config.description}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#EC4899]' : config.color}`} />
              <span className={`text-sm font-medium ${active ? 'text-[#EC4899]' : 'text-white/70'}`}>
                {config.label}
              </span>
              {count > 0 && (
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${active 
                    ? 'bg-[#EC4899]/30 text-[#EC4899]' 
                    : 'bg-white/[0.1] text-white/60'
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
          <span className="text-xs text-white/40">Showing:</span>
          <span className="text-xs text-[#EC4899] font-medium">
            {currentFilters.isPinned 
              ? 'Pinned Conversations' 
              : topicConfig[currentFilters.topicCategory!].label
            }
          </span>
          <button
            onClick={() => onFilterChange({ ...currentFilters, topicCategory: undefined, isPinned: undefined })}
            className="text-xs text-white/40 hover:text-white/60 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

