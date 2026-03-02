/**
 * Excel Export Utilities
 * Provides functions to export data to Excel format
 */

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: 'currency' | 'number' | 'date' | 'text';
}

interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  data: any[];
}

interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
}

export async function exportToExcelMultiSheet(options: ExcelExportOptions) {
  try {
    // Dynamically import XLSX only when needed
    const XLSX = await import('xlsx');
    
    const workbook = XLSX.utils.book_new();
    
    // Create a worksheet for each sheet definition
    options.sheets.forEach((sheet) => {
      // Prepare data with formatted values
      const formattedData = sheet.data.map((row) => {
        const formattedRow: any = {};
        sheet.columns.forEach((col) => {
          let value = row[col.key];
          
          // Apply formatting
          if (col.format === 'currency' && typeof value === 'number') {
            formattedRow[col.header] = value;
          } else {
            formattedRow[col.header] = value ?? '';
          }
        });
        return formattedRow;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Set column widths if specified
      if (sheet.columns.some(col => col.width)) {
        const colWidths = sheet.columns.map(col => ({ wch: col.width || 10 }));
        worksheet['!cols'] = colWidths;
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    // Generate and download the file
    XLSX.writeFile(workbook, `${options.filename}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Excel file:', error);
    throw new Error('Excel export failed');
  }
}

export async function exportToExcel(data: any[], filename: string = 'export', sheetName: string = 'Sheet1') {
  try {
    const XLSX = await import('xlsx');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Excel file:', error);
    throw new Error('Excel export failed');
  }
}

/**
 * Pre-configured export for Stock Value Report
 */
export async function exportStockValueReport(options: {
  byCategory: { category_name: string; item_count: number; total_value: number }[];
  byStorage: { storage_area_name: string; area_type: string; item_count: number; total_value: number }[];
  items: { name: string; category_name: string; storage_area_name: string; quantity: number; unit: string; value: number }[];
}) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: By Category
    const categoryData = options.byCategory.map(cat => ({
      'Category': cat.category_name,
      'Items': cat.item_count,
      'Total Value': cat.total_value
    }));
    const categoryWs = XLSX.utils.json_to_sheet(categoryData);
    categoryWs['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, categoryWs, 'By Category');
    
    // Sheet 2: By Storage Area
    const storageData = options.byStorage.map(storage => ({
      'Storage Area': storage.storage_area_name,
      'Type': storage.area_type.replace('_', ' '),
      'Items': storage.item_count,
      'Total Value': storage.total_value
    }));
    const storageWs = XLSX.utils.json_to_sheet(storageData);
    storageWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, storageWs, 'By Storage Area');
    
    // Sheet 3: All Items
    const itemsData = options.items.map(item => ({
      'Item': item.name,
      'Category': item.category_name,
      'Location': item.storage_area_name,
      'Quantity': item.quantity,
      'Unit': item.unit,
      'Value': item.value
    }));
    const itemsWs = XLSX.utils.json_to_sheet(itemsData);
    itemsWs['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, itemsWs, 'All Items');
    
    // Generate filename with date
    const datePrefix = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `stock_value_report_${datePrefix}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Stock Value Report:', error);
    throw new Error('Stock Value Report export failed');
  }
}

/**
 * Pre-configured export for Supplier Spend Report
 */
export async function exportSupplierSpendReport(data: {
  supplier_id: string;
  supplier_name: string;
  delivery_count: number;
  subtotal: number;
  vat_total: number;
  total: number;
  avg_delivery_value: number;
}[]) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const reportData = data.map(supplier => ({
      'Supplier': supplier.supplier_name,
      'Deliveries': supplier.delivery_count,
      'Net': supplier.subtotal,
      'VAT': supplier.vat_total,
      'Gross': supplier.total,
      'Avg Per Delivery': supplier.avg_delivery_value
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    worksheet['!cols'] = [
      { wch: 30 }, // Supplier
      { wch: 12 }, // Deliveries
      { wch: 15 }, // Net
      { wch: 12 }, // VAT
      { wch: 15 }, // Gross
      { wch: 18 }  // Avg Per Delivery
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Spend');
    
    // Generate filename with date
    const datePrefix = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `supplier_spend_report_${datePrefix}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Supplier Spend Report:', error);
    throw new Error('Supplier Spend Report export failed');
  }
}

/**
 * Pre-configured export for Wastage Report
 */
export async function exportWastageReport(data: {
  id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  unit: string;
  total_value: number;
  reason: string;
  wastage_date: string;
  notes?: string | null;
}[]) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const reportData = data.map(item => ({
      'Date': item.wastage_date,
      'Item': item.item_name,
      'Category': item.category_name,
      'Reason': item.reason,
      'Quantity': item.quantity,
      'Unit': item.unit,
      'Value': item.total_value,
      'Notes': item.notes || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 30 }, // Item
      { wch: 20 }, // Category
      { wch: 20 }, // Reason
      { wch: 12 }, // Quantity
      { wch: 10 }, // Unit
      { wch: 15 }, // Value
      { wch: 40 }  // Notes
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wastage');
    
    // Generate filename with date
    const datePrefix = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `wastage_report_${datePrefix}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Wastage Report:', error);
    throw new Error('Wastage Report export failed');
  }
}

/**
 * Pre-configured export for Dead Stock Report
 */
export async function exportDeadStockReport(data: {
  stock_item_id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  value: number;
  last_movement_at: string | null;
  days_since_movement: number;
}[]) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const reportData = data.map(item => ({
      'Item': item.item_name,
      'Category': item.category_name || 'Uncategorised',
      'Quantity': item.quantity,
      'Value': item.value,
      'Last Movement': item.last_movement_at || 'Never',
      'Days Idle': item.days_since_movement
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    worksheet['!cols'] = [
      { wch: 30 }, // Item
      { wch: 20 }, // Category
      { wch: 12 }, // Quantity
      { wch: 15 }, // Value
      { wch: 15 }, // Last Movement
      { wch: 12 }  // Days Idle
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dead Stock');
    
    // Generate filename with date
    const datePrefix = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `dead_stock_report_${datePrefix}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Dead Stock Report:', error);
    throw new Error('Dead Stock Report export failed');
  }
}

/**
 * Pre-configured export for Price History Report
 */
export async function exportPriceHistoryReport(data: {
  stock_item_id: string;
  item_name: string;
  supplier_name: string;
  delivery_date: string;
  unit_price: number;
  previous_price: number | null;
  price_change_pct: number;
}[]) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const reportData = data.map(item => ({
      'Date': item.delivery_date,
      'Item': item.item_name,
      'Supplier': item.supplier_name,
      'Previous Price': item.previous_price || 0,
      'New Price': item.unit_price,
      'Change %': item.price_change_pct
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 30 }, // Item
      { wch: 25 }, // Supplier
      { wch: 15 }, // Previous Price
      { wch: 15 }, // New Price
      { wch: 12 }  // Change %
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price Changes');
    
    // Generate filename with date
    const datePrefix = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `price_history_report_${datePrefix}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export Price History Report:', error);
    throw new Error('Price History Report export failed');
  }
}
