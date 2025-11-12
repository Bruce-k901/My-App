'use client';

import { ProgressRail } from '../components/ProgressRail';
import { PageShell } from '../components/PageShell';
import { StickyFooterNav } from '../components/StickyFooterNav';
import { Renderer } from './Renderer';
import type { Page } from '../schemas/page';

export function PreviewClient({ moduleId, pages }: { moduleId: string; pages: Page[] }) {
  const first = pages[0];
  if (!first) {
    return <p>No pages configured for {moduleId}</p>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8 text-white">
      <header>
        <h1 className="text-3xl font-semibold">Preview: {moduleId}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <ProgressRail
            modules={[
              {
                id: moduleId,
                title: moduleId,
                isActive: true,
                isComplete: false,
                percentage: 0,
              },
            ]}
          />
        </aside>
        <main className="flex-1">
          <PageShell title={first.type === 'content' ? first.title : undefined}>
            <Renderer
              page={first}
              onContinue={() => undefined}
              setCanProceed={() => undefined}
              setTitle={() => undefined}
              setRightPanel={() => undefined}
            />
          </PageShell>
        </main>
      </div>
      <StickyFooterNav disableNext nextLabel="Preview" />
    </div>
  );
}
