"use client";

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { FileText, Loader2 } from 'lucide-react';
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
  const { siteId } = useAppContext();
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);

  // Load print settings from localStorage on mount
  useEffect(() => {
    setPrintSettings(loadPrintSettings());
  }, []);

  const { data, isLoading, error } = useDeliveryNotes(deliveryDate, siteId);

  const handlePrint = () => {
    // Add a temporary style to force landscape orientation
    const style = document.createElement('style');
    style.id = 'print-orientation-style';
    style.textContent = `
      @page { size: A4 landscape !important; margin: 0 !important; }
      @media print {
        html, body {
          width: 297mm !important;
          height: 210mm !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Print
    window.print();

    // Clean up the temporary style after a delay
    setTimeout(() => {
      const tempStyle = document.getElementById('print-orientation-style');
      if (tempStyle) tempStyle.remove();
    }, 1000);
  };

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
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-[#14B8A6] animate-spin" />
        <div className="text-gray-500 dark:text-white/60">Loading delivery notes...</div>
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
          onShowSettings={() => setShowSettingsModal(true)}
          printSettings={printSettings}
          noteCount={notes.length}
          isLoading={isLoading}
        />

        {/* Empty State */}
        {notes.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <FileText className="h-12 w-12 text-gray-300 dark:text-white/20" />
              <div className="text-gray-500 dark:text-white/60">
                No delivery notes for {format(new Date(deliveryDate), 'd MMMM yyyy')}
              </div>
              <div className="text-sm text-gray-400 dark:text-white/40">
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
