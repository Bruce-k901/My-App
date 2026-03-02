'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { DailyWorksheet } from '@/components/planly/production-plan/DailyWorksheet';

/**
 * Print-optimised page for the Daily Worksheet.
 *
 * Puppeteer navigates here with ?date=YYYY-MM-DD&siteId=xxx
 * and uses emulateMediaType('print') to activate all the existing
 * Tailwind print: utilities in DailyWorksheet (page breaks, font sizes, etc.)
 *
 * This page only needs to:
 * - Force light theme
 * - Hide fixed overlays (PWA prompts, AI widget, toaster)
 * - Signal readiness via .ws-root selector
 */

const PRINT_STYLES = `
  /* Hide ALL fixed-position overlays — PWA prompts, AI widget, toaster, banners */
  [style*="position: fixed"],
  [style*="position:fixed"],
  [data-sonner-toaster] {
    display: none !important;
  }

  /* Force light backgrounds */
  html, body {
    background: white !important;
    color: #111827 !important;
  }
`;

function WorksheetContent() {
  const searchParams = useSearchParams();
  const { siteId: contextSiteId } = useAppContext();

  const siteId = searchParams.get('siteId') || contextSiteId;
  const dateStr = searchParams.get('date');
  const initialDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();

  // Force light theme for clean PDF output
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.body.style.backgroundColor = 'white';
    document.body.style.color = 'black';
  }, []);

  if (!siteId) {
    return <div data-error="no-site">No site selected</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div style={{ padding: '4px 8px' }}>
        <DailyWorksheet siteId={siteId} initialDate={initialDate} />
      </div>
    </>
  );
}

export default function PrintPlanlyWorksheet() {
  return (
    <Suspense fallback={<div>Loading worksheet...</div>}>
      <WorksheetContent />
    </Suspense>
  );
}
