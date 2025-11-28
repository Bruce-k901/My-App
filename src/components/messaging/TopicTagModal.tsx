"use client";

import { X } from 'lucide-react';
import type { TopicCategory } from '@/types/messaging';

interface TopicTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTopic: TopicCategory | null;
  onSelectTopic: (topic: TopicCategory | null) => void;
}

const TOPICS: Array<{ label: string; value: TopicCategory; color: string; bgColor: string }> = [
  { label: '🛡️ Safety', value: 'safety', color: 'text-red-500', bgColor: 'bg-red-500/10 hover:bg-red-500/20' },
  { label: '🔧 Maintenance', value: 'maintenance', color: 'text-orange-500', bgColor: 'bg-orange-500/10 hover:bg-orange-500/20' },
  { label: '🔄 Operations', value: 'operations', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20' },
  { label: '👥 HR', value: 'hr', color: 'text-pink-500', bgColor: 'bg-pink-500/10 hover:bg-pink-500/20' },
  { label: '✅ Compliance', value: 'compliance', color: 'text-green-500', bgColor: 'bg-green-500/10 hover:bg-green-500/20' },
  { label: '⚠️ Incidents', value: 'incidents', color: 'text-red-600', bgColor: 'bg-red-600/10 hover:bg-red-600/20' },
  { label: '💬 General', value: 'general', color: 'text-gray-400', bgColor: 'bg-gray-500/10 hover:bg-gray-500/20' },
];

export default function TopicTagModal({ isOpen, onClose, currentTopic, onSelectTopic }: TopicTagModalProps) {
  if (!isOpen) return null;

  const handleSelect = (topic: TopicCategory) => {
    if (currentTopic === topic) {
      // If clicking the same topic, remove it
      onSelectTopic(null);
    } else {
      // Select new topic
      onSelectTopic(topic);
    }
    onClose();
  };

  const handleRemove = () => {
    onSelectTopic(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0B0D13] border border-white/[0.1] rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Tag Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current topic indicator */}
        {currentTopic && (
          <div className="mb-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div className="text-xs text-white/60 mb-1">Current tag:</div>
            <div className={`text-sm font-medium ${TOPICS.find(t => t.value === currentTopic)?.color || 'text-white'}`}>
              {TOPICS.find(t => t.value === currentTopic)?.label || currentTopic}
            </div>
          </div>
        )}

        {/* Topic options */}
        <div className="space-y-2 mb-6">
          {TOPICS.map((topic) => {
            const isSelected = currentTopic === topic.value;
            return (
              <button
                key={topic.value}
                onClick={() => handleSelect(topic.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  isSelected
                    ? `border-[#EC4899] bg-[#EC4899]/10 ${topic.color}`
                    : `border-white/[0.06] ${topic.bgColor} ${topic.color}`
                }`}
              >
                <span className="text-lg">{topic.label.split(' ')[0]}</span>
                <span className="flex-1 text-left font-medium">{topic.label.split(' ').slice(1).join(' ')}</span>
                {isSelected && (
                  <span className="text-[#EC4899] text-sm font-medium">✓ Selected</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Remove tag button */}
        {currentTopic && (
          <button
            onClick={handleRemove}
            className="w-full px-4 py-2 bg-transparent border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            Remove Tag
          </button>
        )}

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full mt-3 px-4 py-2 bg-white/[0.05] border border-white/[0.1] text-white/70 rounded-lg hover:bg-white/[0.08] transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

