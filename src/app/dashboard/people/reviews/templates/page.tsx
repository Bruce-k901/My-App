import { Suspense } from 'react';
import { getTemplates } from '@/app/actions/reviews';
import { TemplateLibrary } from '@/components/reviews/TemplateLibrary';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function ReviewTemplatesPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<TemplatesSkeleton />}>
        <TemplatesContent />
      </Suspense>
    </div>
  );
}

async function TemplatesContent() {
  try {
    const templates = await getTemplates();
    const systemTemplates = templates.filter(t => t.is_system_template);
    const companyTemplates = templates.filter(t => !t.is_system_template);
    return <TemplateLibrary systemTemplates={systemTemplates} companyTemplates={companyTemplates} />;
  } catch (error) {
    console.error('Error loading templates:', error);
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
        <p className="text-white font-medium">Error loading templates</p>
        <p className="text-neutral-400 text-sm mt-1">Please try refreshing the page</p>
      </div>
    );
  }
}

function TemplatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-white/[0.05] rounded animate-pulse" />
        <div className="h-10 w-40 bg-white/[0.05] rounded animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-white/[0.05] rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-white/[0.05] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

