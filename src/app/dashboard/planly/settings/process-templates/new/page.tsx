'use client';

import { useAppContext } from '@/context/AppContext';
import { ProcessTemplateBuilder } from '@/components/planly/process-templates/ProcessTemplateBuilder';
import { Loader2 } from 'lucide-react';

export default function NewProcessTemplatePage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#0B0F1A]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  return <ProcessTemplateBuilder siteId={siteId} />;
}
