'use client';

import { useCallback } from 'react';

// Hook for lazy Excel export functionality
export function useLazyExcelExport() {
  const exportToExcel = useCallback(async (data: any[], filename: string = 'export') => {
    try {
      // Dynamically import XLSX only when needed
      const XLSX = await import('xlsx');
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      // Generate and download the file
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Failed to export Excel file:', error);
      throw new Error('Excel export failed');
    }
  }, []);

  return { exportToExcel };
}

// Component for Excel export button with lazy loading
interface LazyExcelExportButtonProps {
  data: any[];
  filename?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

export default function LazyExcelExportButton({
  data,
  filename = 'export',
  children,
  className = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}: LazyExcelExportButtonProps) {
  const { exportToExcel } = useLazyExcelExport();

  const handleExport = async () => {
    if (disabled || !data.length) return;

    try {
      onExportStart?.();
      await exportToExcel(data, filename);
      onExportComplete?.();
    } catch (error) {
      onExportError?.(error as Error);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data.length}
      className={className}
    >
      {children}
    </button>
  );
}