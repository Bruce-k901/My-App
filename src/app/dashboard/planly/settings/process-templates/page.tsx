"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useProcessTemplates } from '@/hooks/planly/useProcessTemplates';
import { useAppContext } from '@/context/AppContext';
import { ProcessTemplate } from '@/types/planly';
import Link from 'next/link';

export default function ProcessTemplatesPage() {
  const { siteId } = useAppContext();
  const { data: templates, isLoading, error } = useProcessTemplates(siteId, true);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading process templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading process templates</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Process Templates</h1>
          <p className="text-white/50 text-sm mt-1">
            Define production processes with stages and timing
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(templates as ProcessTemplate[] || []).map((template) => (
          <Link key={template.id} href={`/dashboard/planly/settings/process-templates/${template.id}`}>
            <Card className="p-4 hover:border-[#14B8A6]/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{template.name}</h3>
                {template.is_master && (
                  <span className="text-xs px-2 py-1 rounded bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                    Master
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-white/60 mb-2">{template.description}</p>
              )}
              <div className="text-sm text-white/60">
                {template.stages?.length || 0} {template.stages?.length === 1 ? 'stage' : 'stages'}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {(!templates || (templates as ProcessTemplate[]).length === 0) && (
        <Card className="p-12 text-center">
          <div className="text-white/60">No process templates yet</div>
        </Card>
      )}
    </div>
  );
}
