'use client';

import { useAppContext } from '@/context/AppContext';
import { ProcessTemplateBuilder } from '@/components/planly/process-templates/ProcessTemplateBuilder';
import { Loader2 } from 'lucide-react';

export default function NewProcessTemplatePage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  return <ProcessTemplateBuilder siteId={siteId} />;
}
