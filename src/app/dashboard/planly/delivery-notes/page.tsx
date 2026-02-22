"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { FileText, Loader2 } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { useDeliveryNotes } from '@/hooks/planly/useDeliveryNotes';
import { useAppContext } from '@/context/AppContext';
import {
  DeliveryNotesHeader,
  DeliveryNoteSheet,
  PrintSettingsModal,
  chunkNotesIntoSheets,
  loadPrintSettings,
  defaultPrintSettings,
} from '@/components/planly/delivery-notes';
import type { PrintSettings } from '@/components/planly/delivery-notes';
import '@/styles/delivery-notes-print.css';

export default function DeliveryNotesPage() {
  const { siteId: contextSiteId } = useAppContext();
  const searchParams = useSearchParams();
  // URL params take priority (used by PDF generation route via Puppeteer)
  const siteId = searchParams.get('siteId') || contextSiteId;
  const [deliveryDate, setDeliveryDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Load print settings from localStorage on mount
  useEffect(() => {
    setPrintSettings(loadPrintSettings());
  }, []);

  const { data, isLoading, error } = useDeliveryNotes(deliveryDate, siteId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!siteId || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    const pdfUrl = `/api/planly/delivery-notes/pdf?date=${encodeURIComponent(deliveryDate)}&siteId=${encodeURIComponent(siteId)}`;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        const res = await fetch(pdfUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'PDF generation failed' }));
          throw new Error(err.error || 'PDF generation failed');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `delivery-notes-${deliveryDate}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        break; // success — exit retry loop
      } catch (err: any) {
        console.error(`PDF download attempt ${attempt} failed:`, err);
        if (attempt === maxAttempts) {
          alert(err.message || 'Failed to generate PDF. Please try again.');
        }
        // First attempt failed — retry automatically
      }
    }
    setIsGeneratingPdf(false);
  }, [siteId, deliveryDate, isGeneratingPdf]);

  const handleSaveSettings = (newSettings: PrintSettings) => {
    setPrintSettings(newSettings);
  };

  // Chunk notes into sheets based on notes per page setting
  const noteSheets = useMemo(() => {
    if (!data?.notes) return [];
    return chunkNotesIntoSheets(data.notes, printSettings.notesPerPage);
  }, [data?.notes, printSettings.notesPerPage]);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-module-fg animate-spin" />
        <div className="text-theme-tertiary">Loading delivery notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">Error loading delivery notes: {error.message}</div>
      </div>
    );
  }

  const notes = data?.notes || [];
  const bakeGroups = data?.bakeGroups || [];
  const companyName = data?.companyName || '';
  const companyLogo = data?.companyLogo || null;

  return (
    <div className="container mx-auto py-6">
      {/* Screen UI */}
      <div className="print:hidden">
        <DeliveryNotesHeader
          selectedDate={deliveryDate}
          onDateChange={setDeliveryDate}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
          onShowSettings={() => setShowSettingsModal(true)}
          printSettings={printSettings}
          noteCount={notes.length}
          isLoading={isLoading}
          isGeneratingPdf={isGeneratingPdf}
        />

        {/* Empty State */}
        {notes.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <FileText className="h-12 w-12 text-gray-300 dark:text-white/20" />
              <div className="text-theme-tertiary">
                No delivery notes for {format(new Date(deliveryDate), 'd MMMM yyyy')}
              </div>
              <div className="text-sm text-theme-tertiary">
                Try selecting a different date or check that orders are locked for this date.
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Print Area - Delivery Note Sheets */}
      {notes.length > 0 && (
        <div className="delivery-notes-print-area">
          {noteSheets.map((sheetNotes, idx) => (
            <DeliveryNoteSheet
              key={idx}
              notes={sheetNotes}
              bakeGroups={bakeGroups}
              companyName={companyName}
              companyLogo={companyLogo}
              date={deliveryDate}
              pageNumber={idx + 1}
              settings={printSettings}
            />
          ))}
        </div>
      )}

      {/* Print Settings Modal */}
      <PrintSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={printSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
