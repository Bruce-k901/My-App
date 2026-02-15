'use client';

import React from 'react';
import { DeliveryNote } from './DeliveryNote';
import { BakeGroupWithProducts, DeliveryNoteData } from '@/hooks/planly/useDeliveryNotes';

export interface PrintSettings {
  paperSize: 'A4' | 'A5' | 'custom';
  customWidth?: number;
  customHeight?: number;
  notesPerPage: 6 | 4 | 2 | 1;
  showCuttingMarkers: boolean;
  showAllProducts: boolean;
}

export const defaultPrintSettings: PrintSettings = {
  paperSize: 'A4',
  notesPerPage: 4,
  showCuttingMarkers: true,
  showAllProducts: true,
};

interface DeliveryNoteSheetProps {
  notes: DeliveryNoteData[];
  bakeGroups: BakeGroupWithProducts[];
  companyName: string;
  companyLogo: string | null;
  date: string;
  pageNumber: number;
  settings: PrintSettings;
}

export function DeliveryNoteSheet({
  notes,
  bakeGroups,
  companyName,
  companyLogo,
  date,
  pageNumber,
  settings,
}: DeliveryNoteSheetProps) {
  // A4 Landscape: 6 notes (3 cols x 2 rows)
  // Each note: 99mm x 105mm
  const maxNotes = settings.notesPerPage;

  // Fill with empty slots if needed
  const notesToRender = [...notes];
  while (notesToRender.length < maxNotes) {
    notesToRender.push(null as any);
  }

  return (
    <div
      className="delivery-note-sheet relative bg-white sheet-a4-portrait grid grid-cols-2 grid-rows-2 gap-0"
      data-page={pageNumber}
    >
      {/* Cutting Markers for 2x2 grid - positioned absolutely so they don't affect grid */}
      {settings.showCuttingMarkers && (
        <div className="cutting-markers-container absolute inset-0 pointer-events-none z-10">
          {/* Vertical marker at 1/2 position (center) */}
          {/* Top edge - center */}
          <div className="cutting-marker absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-[5mm] bg-gray-400 print:bg-black" />
          {/* Bottom edge - center */}
          <div className="cutting-marker absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-[5mm] bg-gray-400 print:bg-black" />

          {/* Horizontal marker at 1/2 position (center) */}
          {/* Left edge - center */}
          <div className="cutting-marker absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-[5mm] bg-gray-400 print:bg-black" />
          {/* Right edge - center */}
          <div className="cutting-marker absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-[5mm] bg-gray-400 print:bg-black" />
        </div>
      )}

      {/* Notes Grid - direct children, 3 columns x 2 rows defined on parent */}
      {notesToRender.slice(0, maxNotes).map((note, idx) => (
        <div
          key={note?.orderId || `empty-${idx}`}
          className="delivery-note-cell p-[3mm] box-border"
        >
          {note ? (
            <DeliveryNote
              note={note}
              bakeGroups={bakeGroups}
              companyName={companyName}
              companyLogo={companyLogo}
              date={date}
              showAllProducts={settings.showAllProducts}
            />
          ) : (
            <div className="h-full" />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper function to chunk notes into sheets
export function chunkNotesIntoSheets(
  notes: DeliveryNoteData[],
  notesPerPage: number
): DeliveryNoteData[][] {
  const sheets: DeliveryNoteData[][] = [];
  for (let i = 0; i < notes.length; i += notesPerPage) {
    sheets.push(notes.slice(i, i + notesPerPage));
  }
  return sheets;
}
