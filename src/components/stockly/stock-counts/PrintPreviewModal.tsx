'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Download, Printer, ArrowRight, Loader2 } from 'lucide-react';
import { StockCountItem, LibraryType } from '@/lib/types/stockly';
import { generateCountSheetPDF } from '@/lib/utils/pdf-generator';
import { supabase } from '@/lib/supabase';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  countId: string;
  countName: string;
  countDate: string;
  librariesIncluded: LibraryType[];
  onContinue: () => void;
}

// Library name mapping - matches CreateCountModal
const LIBRARY_NAMES: Record<string, string> = {
  ingredients: 'Ingredients Library',
  packaging: 'Packaging Library',
  disposables: 'Disposables Library',
  drinks: 'Drinks Library',
  ppe: 'PPE Library',
  chemicals: 'Chemicals Library',
  glassware: 'Glassware Library',
  first_aid_supplies: 'First Aid Supplies',
  first_aid: 'First Aid Supplies',
};

const getLibraryName = (type: LibraryType): string => {
  return LIBRARY_NAMES[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function PrintPreviewModal({
  isOpen,
  onClose,
  countId,
  countName,
  countDate,
  librariesIncluded,
  onContinue,
}: PrintPreviewModalProps) {
  const [pdfPreviews, setPdfPreviews] = useState<Array<{
    libraryType: LibraryType;
    libraryName: string;
    itemCount: number;
    pdfUrl: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && countId) {
      generatePreviews();
    }

    // Cleanup blob URLs on unmount
    return () => {
      pdfPreviews.forEach(preview => {
        URL.revokeObjectURL(preview.pdfUrl);
      });
    };
  }, [isOpen, countId]);

  const generatePreviews = async () => {
    setLoading(true);
    
    try {
      // Small delay to ensure items are committed to database
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch count items - don't join library tables since we don't know which one
      // We'll get item names from the library tables separately if needed
      const { data: itemsData, error: itemsError } = await supabase
        .from('stock_count_items')
        .select(`
          *,
          storage_area:storage_areas!stock_count_items_storage_area_id_fkey(*)
        `)
        .eq('stock_count_id', countId);

      if (itemsError) {
        throw itemsError;
      }

      if (!itemsData || itemsData.length === 0) {
        setPdfPreviews([]);
        setLoading(false);
        return;
      }

      // Fetch item names from library tables based on library_type
      // Library types are stored as: ingredients, packaging, disposables, drinks, ppe, chemicals, glassware, first_aid_supplies
      const items: StockCountItem[] = [];
      const libraryTableMap: Record<string, string> = {
        ingredients: 'ingredients_library',
        packaging: 'packaging_library',
        disposables: 'disposables_library',
        drinks: 'drinks_library',
        ppe: 'ppe_library',
        chemicals: 'chemicals_library',
        glassware: 'glassware_library',
        first_aid: 'first_aid_supplies_library', // Database stores 'first_aid'
        first_aid_supplies: 'first_aid_supplies_library', // Handle variations
        firstaid: 'first_aid_supplies_library', // Handle variations
        'first_aid_supplies_library': 'first_aid_supplies_library', // Handle if full table name is stored
      };

      const nameColumnMap: Record<string, string> = {
        ingredients_library: 'ingredient_name',
        packaging_library: 'item_name',
        disposables_library: 'item_name',
        drinks_library: 'item_name',
        ppe_library: 'item_name',
        chemicals_library: 'product_name',
        glassware_library: 'item_name',
        first_aid_supplies_library: 'item_name',
      };

      // Group items by library type and fetch names in batches
      const itemsByLibrary: Record<string, typeof itemsData> = {};
      (itemsData || []).forEach((item: any) => {
        const libType = item.library_type;
        if (!itemsByLibrary[libType]) {
          itemsByLibrary[libType] = [];
        }
        itemsByLibrary[libType].push(item);
      });

      // Fetch names for each library type
      for (const [libType, libItems] of Object.entries(itemsByLibrary)) {
        const tableName = libraryTableMap[libType];
        const nameColumn = nameColumnMap[tableName] || 'item_name';
        
        if (!tableName || libItems.length === 0) continue;

        const itemIds = libItems.map((item: any) => item.ingredient_id);
        
        try {
          // Fetch name, supplier, and pack_size for PDF count sheets
          const { data: libraryItems } = await supabase
            .from(tableName)
            .select(`id, ${nameColumn}, supplier, pack_size`)
            .in('id', itemIds);

          // Create a map of id -> library item data
          const libraryItemMap = new Map(
            (libraryItems || []).map((libItem: any) => [
              libItem.id,
              {
                name: libItem[nameColumn] || 'Unknown',
                supplier: libItem.supplier || null,
                pack_size: libItem.pack_size || null,
              }
            ])
          );

          // Add names and additional fields to items
          libItems.forEach((item: any) => {
            const libItemData = libraryItemMap.get(item.ingredient_id) || {
              name: 'Unknown',
              supplier: null,
              pack_size: null,
            };
            items.push({
              ...item,
              ingredient: {
                id: item.ingredient_id,
                name: libItemData.name,
                ingredient_name: libItemData.name, // For compatibility
                supplier: libItemData.supplier,
                pack_size: libItemData.pack_size,
              } as any,
            });
          });
        } catch (err) {
          // If fetch fails, add items without names
          libItems.forEach((item: any) => {
            items.push({
              ...item,
              ingredient: {
                id: item.ingredient_id,
                name: 'Unknown',
              } as any,
            });
          });
        }
      }

      const previews = [];

      for (const libraryType of librariesIncluded) {
        const libraryItems = items.filter((item: StockCountItem) => item.library_type === libraryType);
        const libraryName = getLibraryName(libraryType);

        if (libraryItems.length === 0) continue;

        // Generate PDF
        const pdf = generateCountSheetPDF({
          countName,
          countDate,
          libraryType,
          libraryName,
          items: libraryItems,
        });

        // Convert to blob and URL
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        previews.push({
          libraryType,
          libraryName,
          itemCount: libraryItems.length,
          pdfUrl,
        });
      }

      setPdfPreviews(previews);
    } catch (error) {
      console.error('Error generating previews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  const handleDownload = (preview: typeof pdfPreviews[0]) => {
    const filename = `${preview.libraryName.replace(/\s+/g, '_')}_${countDate}.pdf`;
    const link = document.createElement('a');
    link.href = preview.pdfUrl;
    link.download = filename;
    link.click();
  };

  const handleDownloadAll = () => {
    pdfPreviews.forEach(preview => {
      handleDownload(preview);
    });
  };

  const handleContinue = () => {
    // Clean up blob URLs
    pdfPreviews.forEach(preview => {
      URL.revokeObjectURL(preview.pdfUrl);
    });
    onContinue();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0D13] border-white/[0.06] text-white max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Print Preview - Count Sheets</DialogTitle>
          <p className="text-gray-400">
            Review and print your count sheets below
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-400">Generating count sheets...</span>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Action Buttons at Top */}
            <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-lg font-semibold text-white">{countName}</h3>
                <p className="text-sm text-gray-400">
                  {new Date(countDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                  className="border-white/[0.06] text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </Button>
                <Button
                  onClick={handleContinue}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Continue to Data Entry
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* PDF Preview Cards */}
            <div className="space-y-4">
              {pdfPreviews.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <p className="text-gray-400">No count sheets to preview</p>
                </div>
              ) : (
                pdfPreviews.map((preview) => (
                  <div
                    key={preview.libraryType}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {preview.libraryName}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {preview.itemCount} items to count
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(preview)}
                          size="sm"
                          variant="outline"
                          className="border-white/[0.06] text-white"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handlePrint(preview.pdfUrl)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>

                    {/* PDF Preview */}
                    <div className="p-4">
                      <iframe
                        src={preview.pdfUrl}
                        className="w-full h-[600px] border border-white/[0.06] rounded"
                        title={`Preview: ${preview.libraryName}`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/[0.06] text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Continue to Data Entry
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

