"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal';

export default function TemplatesPage() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Task Templates</h1>
          <p className="text-white/60">Custom task templates you've created</p>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-pink-500 text-pink-500 bg-transparent hover:bg-white/[0.04] transition-all duration-150"
          aria-label="Add Template"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Empty State */}
      <div className="mt-8">
        <p className="text-white/60">Create your first template to get started</p>
      </div>

      {/* Master Template Modal */}
      <MasterTemplateModal 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={(templateConfig) => {
          console.log('Template created:', templateConfig);
          setIsBuilderOpen(false);
          // TODO: Add to templates list when we build that
        }}
      />
    </div>
  );
}
