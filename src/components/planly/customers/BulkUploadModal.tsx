'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from '@/components/ui/icons';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siteId: string;
}

interface ParsedRow {
  'Customer Name'?: string;
  Address?: string;
  Postcode?: string;
  'Contact Name'?: string;
  Email?: string;
  Phone?: string;
  'Delivery Notes'?: string;
  'Destination Group'?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

type Step = 'upload' | 'preview' | 'processing' | 'complete';

export function BulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  siteId,
}: BulkUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: destinationGroups } = useDestinationGroups(siteId);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFile(null);
      setParsedData([]);
      setValidationResults([]);
      setImportResults({ success: 0, failed: 0 });
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Validate data when it changes
  useEffect(() => {
    if (parsedData.length > 0) {
      const results = parsedData.map(validateRow);
      setValidationResults(results);
    }
  }, [parsedData]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-[#0F1629] border-theme">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-theme-primary">
            Bulk Upload Customers
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <UploadStep
              onFileSelected={(f, data) => {
                setFile(f);
                setParsedData(data);
                setStep('preview');
              }}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              data={parsedData}
              validationResults={validationResults}
              destinationGroups={destinationGroups || []}
              onBack={() => {
                setStep('upload');
                setFile(null);
                setParsedData([]);
              }}
              onConfirm={async () => {
                setStep('processing');
                setIsProcessing(true);
                const results = await handleBulkInsert(
                  parsedData,
                  validationResults,
                  siteId,
                  destinationGroups || []
                );
                setImportResults(results);
                setIsProcessing(false);
                setStep('complete');
              }}
            />
          )}

          {step === 'processing' && <ProcessingStep />}

          {step === 'complete' && (
            <CompleteStep
              results={importResults}
              onClose={() => {
                onSuccess();
                onClose();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Upload Step
// ============================================================================

function UploadStep({
  onFileSelected,
}: {
  onFileSelected: (file: File, data: ParsedRow[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFileUpload(file: File) {
    if (!file) return;

    setParseError(null);

    // Check file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    // Parse CSV
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError('Error parsing file: ' + results.errors[0].message);
          console.error(results.errors);
          return;
        }

        if (results.data.length === 0) {
          setParseError('The file appears to be empty');
          return;
        }

        onFileSelected(file, results.data);
      },
      error: (error) => {
        setParseError('Failed to parse file: ' + error.message);
        console.error(error);
      },
    });
  }

  return (
    <div className="space-y-4 p-1">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-300">
          How to bulk upload:
        </h4>
        <ol className="text-sm space-y-1 list-decimal list-inside text-blue-800 dark:text-blue-200/80">
          <li>Download the CSV template below</li>
          <li>Fill in your customer data (keep the header row)</li>
          <li>Upload the completed file here</li>
          <li>Review and confirm the import</li>
        </ol>
      </div>

      {/* Download Template Button */}
      <Button
        variant="outline"
        className="w-full border-theme text-theme-secondary hover:bg-theme-hover"
        onClick={downloadCSVTemplate}
      >
        <Download className="w-4 h-4 mr-2" />
        Download CSV Template
      </Button>

      {/* Error Message */}
      {parseError && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {parseError}
        </div>
      )}

      {/* Drag-Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
          isDragging
            ? 'border-[#14B8A6] bg-[#14B8A6]/5'
            : 'border-gray-300 dark:border-white/20'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          handleFileUpload(f);
        }}
      >
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-theme-tertiary" />
        <h3 className="font-medium mb-2 text-theme-primary">
          Drop your CSV file here
        </h3>
        <p className="text-sm text-theme-tertiary mb-4">
          or click to browse
        </p>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="file-upload"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
          }}
        />

        <Button
          variant="outline"
          className="border-theme text-theme-secondary hover:bg-theme-hover"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Select File
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Preview Step
// ============================================================================

interface PreviewStepProps {
  data: ParsedRow[];
  validationResults: ValidationResult[];
  destinationGroups: { id: string; name: string }[];
  onBack: () => void;
  onConfirm: () => void;
}

function PreviewStep({
  data,
  validationResults,
  destinationGroups,
  onBack,
  onConfirm,
}: PreviewStepProps) {
  const validRows = validationResults.filter((r) => r.isValid).length;
  const invalidRows = validationResults.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-4 p-1">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-theme-button border border-theme rounded-lg p-4">
          <p className="text-sm text-theme-tertiary">Total Rows</p>
          <p className="text-2xl font-bold text-theme-primary">
            {data.length}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-400">Valid</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {validRows}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Invalid</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {invalidRows}
          </p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="border border-theme rounded-lg overflow-hidden">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-theme-button sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Customer Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Address
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Contact
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-theme-tertiary">
                  Destination
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const validation = validationResults[idx];
                const destGroupMatch = row['Destination Group']
                  ? destinationGroups.find(
                      (g) =>
                        g.name.toLowerCase() ===
                        row['Destination Group']?.toLowerCase()
                    )
                  : null;

                return (
                  <tr
                    key={idx}
                    className={cn(
                      'border-t border-theme',
                      !validation?.isValid && 'bg-red-50 dark:bg-red-500/10'
                    )}
                  >
                    <td className="px-4 py-2">
                      {validation?.isValid ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="group relative">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 dark:bg-white text-theme-primary dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap">
                            {validation?.errors.join(', ')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-theme-primary">
                      {row['Customer Name']}
                    </td>
                    <td className="px-4 py-2 text-sm text-theme-secondary">
                      {row['Address']}
                    </td>
                    <td className="px-4 py-2 text-sm text-theme-secondary">
                      {row['Contact Name']}
                    </td>
                    <td className="px-4 py-2 text-sm text-theme-secondary">
                      {row['Email']}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {row['Destination Group'] && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            destGroupMatch
                              ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          )}
                        >
                          {row['Destination Group']}
                          {!destGroupMatch && ' (not found)'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning if invalid rows */}
      {invalidRows > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {invalidRows} row{invalidRows > 1 ? 's have' : ' has'} errors and
            will be skipped. Only {validRows} valid row{validRows !== 1 && 's'}{' '}
            will be imported.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-theme text-theme-secondary hover:bg-theme-hover"
        >
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={validRows === 0}
          className="bg-[#14B8A6] hover:bg-[#0D9488] text-white disabled:opacity-50"
        >
          Import {validRows} Customer{validRows !== 1 && 's'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Processing Step
// ============================================================================

function ProcessingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-12 h-12 text-[#14B8A6] animate-spin mb-4" />
      <h3 className="text-lg font-medium text-theme-primary mb-2">
        Importing customers...
      </h3>
      <p className="text-sm text-theme-tertiary">
        This may take a moment
      </p>
    </div>
  );
}

// ============================================================================
// Complete Step
// ============================================================================

function CompleteStep({
  results,
  onClose,
}: {
  results: { success: number; failed: number };
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      <h3 className="text-lg font-medium text-theme-primary mb-2">
        Import Complete
      </h3>

      <div className="text-center mb-6">
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {results.success} customer{results.success !== 1 && 's'} imported
        </p>
        {results.failed > 0 && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {results.failed} failed
          </p>
        )}
      </div>

      <Button
        onClick={onClose}
        className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
      >
        Done
      </Button>
    </div>
  );
}

// ============================================================================
// Validation Logic
// ============================================================================

function validateRow(row: ParsedRow): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!row['Customer Name'] || row['Customer Name'].trim() === '') {
    errors.push('Customer Name is required');
  }

  if (!row['Address'] || row['Address'].trim() === '') {
    errors.push('Address is required');
  }

  if (!row['Postcode'] || row['Postcode'].trim() === '') {
    errors.push('Postcode is required');
  }

  // Email validation (if provided)
  if (row['Email'] && !isValidEmail(row['Email'])) {
    errors.push('Invalid email format');
  }

  // Phone validation (if provided)
  if (row['Phone'] && !isValidPhone(row['Phone'])) {
    errors.push('Invalid phone format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  // Basic phone validation - at least 10 digits/chars
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// ============================================================================
// Bulk Insert Logic
// ============================================================================

async function handleBulkInsert(
  data: ParsedRow[],
  validationResults: ValidationResult[],
  siteId: string,
  destinationGroups: { id: string; name: string }[]
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;

  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const validation = validationResults[i];

    // Skip invalid rows
    if (!validation?.isValid) {
      failedCount++;
      continue;
    }

    // Find destination group by name (if specified)
    let destinationGroupId = null;
    if (row['Destination Group']) {
      const group = destinationGroups.find(
        (g) => g.name.toLowerCase() === row['Destination Group']?.toLowerCase()
      );
      destinationGroupId = group?.id || null;
    }

    // Insert customer via API
    try {
      const response = await fetch('/api/planly/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          name: row['Customer Name']?.trim(),
          address: row['Address']?.trim(),
          postcode: row['Postcode']?.trim(),
          contact_name: row['Contact Name']?.trim() || null,
          email: row['Email']?.trim() || null,
          phone: row['Phone']?.trim() || null,
          delivery_instructions: row['Delivery Notes']?.trim() || null,
          destination_group_id: destinationGroupId,
          is_active: true,
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        console.error(
          'Failed to insert customer:',
          row['Customer Name'],
          await response.text()
        );
        failedCount++;
      }
    } catch (error) {
      console.error('Error inserting customer:', row['Customer Name'], error);
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}

// ============================================================================
// Download Template
// ============================================================================

function downloadCSVTemplate() {
  const headers = [
    'Customer Name',
    'Address',
    'Postcode',
    'Contact Name',
    'Email',
    'Phone',
    'Delivery Notes',
    'Destination Group',
  ];

  const exampleRows = [
    [
      'High Grade',
      '91 Brick Lane',
      'E1 6QL',
      'Stevie',
      'accounts@highgrade.coffee',
      '020 7123 4567',
      'Leave in the reception if no-one there.',
      'Wholesale',
    ],
    [
      '3rd Culture',
      '29 Broadway Market',
      'E8 4PH',
      'Tilen',
      'hi@thirdculturedeli.com',
      '',
      'Keys provided',
      'Wholesale',
    ],
  ];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...exampleRows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'customer_import_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
