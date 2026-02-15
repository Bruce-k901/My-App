import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockCountItem, LibraryType } from '@/lib/types/stockly';

interface CountSheetData {
  countName: string;
  countDate: string;
  libraryType: LibraryType;
  libraryName: string;
  items: StockCountItem[];
}

export function generateCountSheetPDF(data: CountSheetData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10; // Reduced margin

  // Minimal header - just count name and date on first page only
  let startY = 10;
  if (data.items.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.countName} - ${new Date(data.countDate).toLocaleDateString('en-GB')}`, margin, startY);
    startY = 15; // Start table right after minimal header
  }

  // Table
  const tableData = data.items.map(item => {
    const ingredientName = (item.ingredient as any)?.ingredient_name || 
                          (item.ingredient as any)?.name || 
                          'Unknown';
    const supplier = (item.ingredient as any)?.supplier || '-';
    const packSize = (item.ingredient as any)?.pack_size || '-';
    return [
      ingredientName,
      supplier,
      packSize,
      item.unit_of_measurement || '-',
      '', // Empty count column for manual entry
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: [['ITEM', 'SUPPLIER', 'CASE SIZE', 'UNIT', 'COUNT']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7, // Reduced from 9
      cellPadding: 1.5, // Reduced from 4 (about half)
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [16, 185, 129], // emerald-600
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7, // Reduced from 9
      cellPadding: 1.5, // Reduced header padding
    },
    bodyStyles: {
      cellPadding: 1.5, // Reduced body padding
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Item name - flexible
      1: { cellWidth: 30, halign: 'left', fontSize: 6 }, // Supplier - smaller font
      2: { cellWidth: 20, halign: 'center', fontSize: 6 }, // Case size - smaller font
      3: { cellWidth: 18, halign: 'center' }, // Unit
      4: { cellWidth: 22, halign: 'right' }, // Count - space for writing
    },
    margin: { left: margin, right: margin, top: startY, bottom: 30 },
  });

  // Get the Y position after the table on last page only
  const pageCount = doc.getNumberOfPages();
  const lastPageFinalY = (doc as any).lastAutoTable?.finalY || pageHeight - 30;

  // Add signature section only on last page, and only if there's space
  if (lastPageFinalY < pageHeight - 35) {
    const signatureY = lastPageFinalY + 5; // Minimal spacing
    
    doc.setFontSize(7); // Reduced from 9
    doc.setLineWidth(0.2);
    
    // Compact signature lines
    doc.line(margin, signatureY, margin + 60, signatureY);
    doc.line(pageWidth - margin - 45, signatureY, pageWidth - margin, signatureY);
    doc.text('Counted By', margin, signatureY + 3);
    doc.text('Date', pageWidth - margin - 45, signatureY + 3);
    
    // Compact notes (single line)
    doc.text('Notes:', margin, signatureY + 8);
    doc.line(margin, signatureY + 10, pageWidth - margin, signatureY + 10);
  }

  // Footer with page number - compact
  const finalPageCount = doc.getNumberOfPages();
  doc.setFontSize(7); // Reduced from 8
  doc.setTextColor(128);
  for (let i = 1; i <= finalPageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${finalPageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function openPDFInNewTab(doc: jsPDF) {
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
