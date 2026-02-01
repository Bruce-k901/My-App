'use client';

import { use } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ProcessTemplateBuilder } from '@/components/planly/process-templates/ProcessTemplateBuilder';

interface EditProcessTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default function EditProcessTemplatePage({ params }: EditProcessTemplatePageProps) {
  const { id } = use(params);
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#0B0F1A]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  return <ProcessTemplateBuilder templateId={id} siteId={siteId} />;
}
