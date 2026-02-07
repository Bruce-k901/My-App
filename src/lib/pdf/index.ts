// Shared PDF components
export { PDFHeader } from './components/PDFHeader';
export { PDFFooter } from './components/PDFFooter';
export { PDFTable, WriteInBox, Checkbox } from './components/PDFTable';
export type { PDFTableColumn } from './components/PDFTable';

// Styles and utilities
export {
  baseStyles,
  colours,
  fontSizes,
  formatUKDate,
  formatTimeRange,
} from './components/PDFStyles';

// PDF Templates
export { StockCountSheetPDF } from './templates/StockCountSheetPDF';
export type { StockCountSheetPDFProps } from './templates/StockCountSheetPDF';

export { ProductionPlanPDF } from './templates/ProductionPlanPDF';
export type { ProductionPlanPDFProps, ProductionPlanSection } from './templates/ProductionPlanPDF';

export { RotaPDF } from './templates/RotaPDF';
export type { RotaPDFProps } from './templates/RotaPDF';

export { DeliveryNotePDF } from './templates/DeliveryNotePDF';
export type { DeliveryNotePDFProps } from './templates/DeliveryNotePDF';

export { ComplianceReportPDF } from './templates/ComplianceReportPDF';
export type { ComplianceReportPDFProps } from './templates/ComplianceReportPDF';
