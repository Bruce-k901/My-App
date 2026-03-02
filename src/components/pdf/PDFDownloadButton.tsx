'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface PDFDownloadButtonProps {
  fileName: string;
  generatePDF: () => Promise<Blob>;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
  className?: string;
  disabled?: boolean;
  onError?: (error: Error) => void;
}

export function PDFDownloadButton({
  fileName,
  generatePDF,
  variant = 'outline',
  size = 'default',
  label = 'Download PDF',
  className,
  disabled,
  onError,
}: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    default: '',
    sm: 'h-9 px-4 text-xs',
    lg: 'h-12 px-8',
  };

  const handleDownload = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      const blob = await generatePDF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
      onError?.(error instanceof Error ? error : new Error('PDF generation failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleDownload}
      disabled={disabled || loading}
      className={cn(sizeClasses[size], className)}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export default PDFDownloadButton;
