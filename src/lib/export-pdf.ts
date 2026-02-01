/**
 * PDF Export Utility for Stockly Reports
 * Uses jsPDF library with autoTable plugin
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'percentage' | 'number' | 'date' | 'text';
}

interface PdfExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  data: Record<string, any>[];
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string }[];
  footerText?: string;
}

interface PdfReportSummary {
  label: string;
  value: string;
  color?: string;
}

/**
 * Format a value for PDF display
 */
function formatValue(value: any, format?: PdfColumn['format']): string {
  if (value === null || value === undefined) return '-';
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2
      }).format(typeof value === 'number' ? value : parseFloat(value) || 0);
    
    case 'percentage':
      const pct = typeof value === 'number' ? value : parseFloat(value) || 0;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    
    case 'number':
      return new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(typeof value === 'number' ? value : parseFloat(value) || 0);
    
    case 'date':
      if (!value) return '-';
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    
    default:
      return String(value);
  }
}

/**
 * Export data to PDF file
 */
export function exportToPdf(options: PdfExportOptions): void {
  const {
    filename,
    title,
    subtitle,
    columns,
    data,
    orientation = 'portrait',
    summary,
    footerText
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Add logo placeholder / company name
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('STOCKLY', margin, yPos);
  
  // Add generation date
  const dateStr = new Date().toLocaleString('en-GB');
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 15;

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(title, margin, yPos);
  yPos += 8;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, margin, yPos);
    yPos += 10;
  }

  // Add summary boxes if provided
  if (summary && summary.length > 0) {
    yPos += 5;
    const boxWidth = (pageWidth - margin * 2 - (summary.length - 1) * 5) / summary.length;
    const boxHeight = 20;
    
    summary.forEach((item, index) => {
      const xPos = margin + index * (boxWidth + 5);
      
      // Box background
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 2, 2, 'F');
      
      // Label
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(item.label, xPos + 5, yPos + 7);
      
      // Value
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(item.value, xPos + 5, yPos + 16);
    });
    
    yPos += boxHeight + 10;
  }

  // Prepare table data
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => formatValue(row[col.key], col.format))
  );

  // Calculate column widths
  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right'; cellWidth: number | 'auto' }> = {};
  columns.forEach((col, index) => {
    columnStyles[index] = {
      halign: col.align || (col.format === 'currency' || col.format === 'number' || col.format === 'percentage' ? 'right' : 'left'),
      cellWidth: col.width || 'auto'
    };
  });

  // Add table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [70, 70, 90],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252]
    },
    columnStyles,
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      if (footerText) {
        doc.text(
          footerText,
          margin,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    }
  });

  // Generate filename with date
  const datePrefix = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${datePrefix}.pdf`;

  // Download file
  doc.save(fullFilename);
}

/**
 * Pre-configured export for Stock Value Report
 */
export function exportStockValuePdf(
  totalValue: number,
  totalItems: number,
  byCategory: { category_name: string; item_count: number; total_value: number }[]
): void {
  exportToPdf({
    filename: 'stock_value_report',
    title: 'Stock Valuation Report',
    subtitle: 'Current stock value by category',
    summary: [
      { label: 'Total Stock Value', value: formatValue(totalValue, 'currency') },
      { label: 'Categories', value: String(byCategory.length) },
      { label: 'Stock Lines', value: String(totalItems) }
    ],
    columns: [
      { header: 'Category', key: 'category_name', width: 60 },
      { header: 'Items', key: 'item_count', width: 30, align: 'right', format: 'number' },
      { header: 'Total Value', key: 'total_value', width: 40, align: 'right', format: 'currency' }
    ],
    data: byCategory
  });
}

/**
 * Pre-configured export for Supplier Spend Report
 */
export function exportSupplierSpendPdf(
  totalSpend: number,
  totalDeliveries: number,
  data: {
    supplier_name: string;
    delivery_count: number;
    subtotal: number;
    vat_total: number;
    total: number;
  }[]
): void {
  exportToPdf({
    filename: 'supplier_spend_report',
    title: 'Supplier Spend Report',
    orientation: 'landscape',
    summary: [
      { label: 'Total Spend', value: formatValue(totalSpend, 'currency') },
      { label: 'Deliveries', value: String(totalDeliveries) },
      { label: 'Suppliers', value: String(data.length) },
      { label: 'Avg Per Delivery', value: formatValue(totalDeliveries > 0 ? totalSpend / totalDeliveries : 0, 'currency') }
    ],
    columns: [
      { header: 'Supplier', key: 'supplier_name', width: 70 },
      { header: 'Deliveries', key: 'delivery_count', width: 30, align: 'right', format: 'number' },
      { header: 'Net', key: 'subtotal', width: 35, align: 'right', format: 'currency' },
      { header: 'VAT', key: 'vat_total', width: 30, align: 'right', format: 'currency' },
      { header: 'Gross', key: 'total', width: 35, align: 'right', format: 'currency' }
    ],
    data
  });
}

/**
 * Pre-configured export for Wastage Report
 */
export function exportWastagePdf(
  totalWastage: number,
  totalIncidents: number,
  data: {
    wastage_date: string;
    item_name: string;
    category_name: string;
    reason: string;
    quantity: number;
    unit: string;
    total_value: number;
  }[]
): void {
  exportToPdf({
    filename: 'wastage_report',
    title: 'Wastage Report',
    orientation: 'landscape',
    summary: [
      { label: 'Total Wastage', value: formatValue(totalWastage, 'currency') },
      { label: 'Incidents', value: String(totalIncidents) },
      { label: 'Avg Per Incident', value: formatValue(totalIncidents > 0 ? totalWastage / totalIncidents : 0, 'currency') }
    ],
    columns: [
      { header: 'Date', key: 'wastage_date', width: 28, format: 'date' },
      { header: 'Item', key: 'item_name', width: 55 },
      { header: 'Category', key: 'category_name', width: 35 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Qty', key: 'quantity', width: 20, align: 'right', format: 'number' },
      { header: 'Value', key: 'total_value', width: 28, align: 'right', format: 'currency' }
    ],
    data
  });
}

/**
 * Pre-configured export for Dead Stock Report
 */
export function exportDeadStockPdf(
  totalValue: number,
  data: {
    item_name: string;
    category_name: string;
    quantity: number;
    value: number;
    last_movement_at: string | null;
    days_since_movement: number;
  }[]
): void {
  exportToPdf({
    filename: 'dead_stock_report',
    title: 'Dead Stock Report',
    subtitle: 'Items with no movement in 30+ days',
    summary: [
      { label: 'Capital Tied Up', value: formatValue(totalValue, 'currency') },
      { label: 'Items Affected', value: String(data.length) },
      { label: '90+ Days', value: String(data.filter(d => d.days_since_movement >= 90).length) }
    ],
    columns: [
      { header: 'Item', key: 'item_name', width: 50 },
      { header: 'Category', key: 'category_name', width: 35 },
      { header: 'Quantity', key: 'quantity', width: 25, align: 'right', format: 'number' },
      { header: 'Value', key: 'value', width: 30, align: 'right', format: 'currency' },
      { header: 'Last Movement', key: 'last_movement_at', width: 30, format: 'date' },
      { header: 'Days Idle', key: 'days_since_movement', width: 25, align: 'right', format: 'number' }
    ],
    data
  });
}

/**
 * Pre-configured export for Price Changes Report
 */
export function exportPriceChangesPdf(
  data: {
    delivery_date: string;
    item_name: string;
    supplier_name: string;
    previous_price: number | null;
    unit_price: number;
    price_change_pct: number;
  }[]
): void {
  const increases = data.filter(d => d.price_change_pct > 0).length;
  const decreases = data.filter(d => d.price_change_pct < 0).length;
  
  exportToPdf({
    filename: 'price_changes_report',
    title: 'Price Tracking Report',
    subtitle: 'Price changes from recent deliveries',
    orientation: 'landscape',
    summary: [
      { label: 'Price Changes', value: String(data.length) },
      { label: 'Increases', value: String(increases) },
      { label: 'Decreases', value: String(decreases) }
    ],
    columns: [
      { header: 'Date', key: 'delivery_date', width: 28, format: 'date' },
      { header: 'Item', key: 'item_name', width: 60 },
      { header: 'Supplier', key: 'supplier_name', width: 50 },
      { header: 'Previous', key: 'previous_price', width: 28, align: 'right', format: 'currency' },
      { header: 'New Price', key: 'unit_price', width: 28, align: 'right', format: 'currency' },
      { header: 'Change', key: 'price_change_pct', width: 25, align: 'right', format: 'percentage' }
    ],
    data
  });
}
