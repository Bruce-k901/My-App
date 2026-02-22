'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, Plus, Search, Save, Layers, ChevronDown, ChevronRight, Thermometer } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriceChangeReviewModal } from '@/components/stockly/PriceChangeReviewModal';
import { PriceChange } from '@/lib/types/stockly';

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface StockItem {
  id: string;
  name: string;
  description?: string;
}

interface ProductVariant {
  id: string;
  stock_item_id: string;
  supplier_code?: string;
  product_name?: string;
  supplier_description?: string;
  stock_item?: StockItem;
}

interface DeliveryLine {
  id: string;
  delivery_id: string;
  product_variant_id?: string;
  stock_item_id?: string;
  description: string;
  supplier_code?: string;
  quantity_ordered: number;
  quantity_received?: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  rejection_notes?: string;
  rejection_photo_url?: string;
  unit_price: number;
  line_total: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total_inc_vat?: number;
  match_status: 'auto_matched' | 'manual_matched' | 'unmatched' | 'new_item';
  match_confidence?: number;
  suggested_stock_item?: {
    ingredient_id?: string;
    name?: string;
  };
  product_variant?: ProductVariant;
  // @salsa — Batch traceability fields (from delivery_lines table)
  supplier_batch_code?: string;
  temperature_reading?: number;
  condition_assessment?: any;
  batch_id?: string;
}

interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  product_variant_id: string;
  quantity_ordered: number;
  unit_price?: number;
  line_total?: number;
  quantity_received?: number;
  product_variant?: ProductVariant;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery?: string;
  status: string;
  subtotal?: number;
  total?: number;
  notes?: string;
  lines?: PurchaseOrderLine[];
}

interface Delivery {
  id: string;
  company_id: string;
  site_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  delivery_note_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  status: 'draft' | 'pending_review' | 'confirmed' | 'disputed' | 'cancelled';
  ai_processed: boolean;
  ai_confidence?: number;
  ai_extraction?: any;
  requires_review: boolean;
  document_urls?: string[];
  supplier?: Supplier;
  lines?: DeliveryLine[];
  purchase_order?: PurchaseOrder;
}

export default function DeliveryReviewPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;
  const { companyId, userId } = useAppContext();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryFormData, setDeliveryFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    delivery_note_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [matchingStockItems, setMatchingStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingLineId, setMatchingLineId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [creatingItemLineId, setCreatingItemLineId] = useState<string | null>(null);
  const [lineAcceptanceStates, setLineAcceptanceStates] = useState<Record<string, {
    state: 'accept_all' | 'partial' | 'reject_all';
    received: number;
    rejected: number;
    rejection_reason?: string;
    rejection_notes?: string;
  }>>({});

  // @salsa — Goods-in / batch data per delivery line
  const [lineGoodsInData, setLineGoodsInData] = useState<Record<string, {
    supplier_batch_code: string;
    use_by_date: string;
    best_before_date: string;
    temperature_reading: string;
    condition_notes: string;
    expanded: boolean;
  }>>({});

  // Price change detection state (Phase 2)
  const [priceChangeModalOpen, setPriceChangeModalOpen] = useState(false);
  const [priceChangesToReview, setPriceChangesToReview] = useState<PriceChange[]>([]);

  // Purchase Order comparison
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [poLinesMap, setPoLinesMap] = useState<Map<string, PurchaseOrderLine>>(new Map());
  const [poLinesBySupplierCode, setPoLinesBySupplierCode] = useState<Map<string, PurchaseOrderLine>>(new Map());
  const [poLinesByIngredientName, setPoLinesByIngredientName] = useState<Map<string, PurchaseOrderLine>>(new Map());
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [showPOLinkModal, setShowPOLinkModal] = useState(false);
  const [suggestedPOs, setSuggestedPOs] = useState<Array<PurchaseOrder & { matchScore: number; matchReason: string }>>([]);
  const [autoMatchingPO, setAutoMatchingPO] = useState(false);

  useEffect(() => {
    if (deliveryId && companyId) {
      fetchDelivery();
      fetchStockItems();
    }
  }, [deliveryId, companyId]);

  async function fetchDelivery() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          lines:delivery_lines(
            *,
            product_variant:product_variants(
              id,
              supplier_code,
              product_name,
              supplier_description,
              stock_item:stock_items(id, name)
            )
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (error) throw error;
      const deliveryData = data as Delivery;
      setDelivery(deliveryData);
      setDeliveryFormData({
        invoice_number: deliveryData.invoice_number || '',
        invoice_date: deliveryData.invoice_date || '',
        delivery_note_number: deliveryData.delivery_note_number || '',
      });

      // Fetch linked purchase order if exists
      if (deliveryData.purchase_order_id) {
        console.log('🔗 [POLink] Fetching linked PO:', deliveryData.purchase_order_id);
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select(`
            id, order_number, order_date, expected_delivery, status, subtotal, total, notes,
            lines:purchase_order_lines(
              id, purchase_order_id, product_variant_id, quantity_ordered, unit_price, line_total, quantity_received
            )
          `)
          .eq('id', deliveryData.purchase_order_id)
          .single();

        if (poError) {
          console.error('🔗 [POLink] Error fetching PO:', poError);
        }

        if (!poError && poData) {
          console.log('🔗 [POLink] Successfully loaded PO:', poData.order_number, 'with', poData.lines?.length, 'lines');
          setPurchaseOrder(poData as PurchaseOrder);
          // Build a map of product_variant_id -> PO line for quick lookup
          const linesMap = new Map<string, PurchaseOrderLine>();
          (poData.lines || []).forEach((line: PurchaseOrderLine) => {
            if (line.product_variant_id) {
              linesMap.set(line.product_variant_id, line);
            }
          });
          setPoLinesMap(linesMap);

          // Fetch supplier codes AND ingredient names for PO line variants (separate query to avoid nested join issues)
          const variantIds = (poData.lines || [])
            .map((l: PurchaseOrderLine) => l.product_variant_id)
            .filter(Boolean);

          if (variantIds.length > 0) {
            const { data: variants } = await supabase
              .from('product_variants')
              .select('id, supplier_code, stock_item_id, product_name, stock_item:stock_items(id, name)')
              .in('id', variantIds);

            if (variants) {
              const codeMap = new Map<string, PurchaseOrderLine>();
              const ingredientMap = new Map<string, PurchaseOrderLine>();
              console.log('🔗 [POLink] Raw variants data:', JSON.stringify(variants, null, 2));

              // If stock_item join didn't work, fetch stock_items separately
              const stockItemIds = variants
                .map((v: any) => v.stock_item_id)
                .filter(Boolean);

              let stockItemsMap: Record<string, string> = {};
              if (stockItemIds.length > 0) {
                const { data: stockItems } = await supabase
                  .from('stock_items')
                  .select('id, name')
                  .in('id', stockItemIds);
                if (stockItems) {
                  stockItems.forEach((si: { id: string; name: string }) => {
                    stockItemsMap[si.id] = si.name;
                  });
                  console.log('🔗 [POLink] Stock items map:', stockItemsMap);
                }
              }

              variants.forEach((v: { id: string; supplier_code: string | null; stock_item: { id: string; name: string } | null; stock_item_id?: string; product_name?: string }) => {
                const poLine = linesMap.get(v.id);
                if (poLine) {
                  // Map by supplier_code
                  if (v.supplier_code) {
                    codeMap.set(v.supplier_code.toLowerCase(), poLine);
                    console.log(`🔗 [POLink] Mapped supplier_code "${v.supplier_code.toLowerCase()}" to PO line qty:${poLine.quantity_ordered}`);
                  }
                  // Map by ingredient name - try multiple sources, skip "Unknown Item"
                  const stockItemName = v.stock_item?.name || (v.stock_item_id ? stockItemsMap[v.stock_item_id] : null);
                  // Use product_name as primary, fall back to stock_item name only if it's not "Unknown Item"
                  const ingredientName = v.product_name ||
                    (stockItemName && stockItemName !== 'Unknown Item' ? stockItemName : null);

                  if (ingredientName) {
                    ingredientMap.set(ingredientName.toLowerCase(), poLine);
                    console.log(`🔗 [POLink] Mapped ingredient "${ingredientName.toLowerCase()}" to PO line qty:${poLine.quantity_ordered}, price:${poLine.unit_price}`);
                  } else {
                    console.warn(`🔗 [POLink] No ingredient name for variant ${v.id}, product_name:`, v.product_name, 'stock_item:', v.stock_item);
                  }
                }
              });
              setPoLinesBySupplierCode(codeMap);
              setPoLinesByIngredientName(ingredientMap);
              console.log('🔗 [POLink] Built supplier_code map with', codeMap.size, 'entries:', Array.from(codeMap.keys()));
              console.log('🔗 [POLink] Built ingredient map with', ingredientMap.size, 'entries:', Array.from(ingredientMap.keys()));
            }
          }

          // Clear suggested/available POs since we now have a linked PO
          setSuggestedPOs([]);
          setAvailablePOs([]);
        } else {
          console.warn('🔗 [POLink] PO not found or error occurred');
          setPurchaseOrder(null);
          setPoLinesMap(new Map());
          setPoLinesBySupplierCode(new Map());
          setPoLinesByIngredientName(new Map());
        }
      } else {
        setPurchaseOrder(null);
        setPoLinesMap(new Map());
        setPoLinesBySupplierCode(new Map());
        setPoLinesByIngredientName(new Map());

        // No PO linked - try to find matching POs automatically
        if (deliveryData.supplier_id && deliveryData.delivery_date && deliveryData.lines) {
          findMatchingPOs(
            deliveryData.supplier_id,
            deliveryData.delivery_date,
            deliveryData.lines
          );
        }

        // Also fetch ALL available POs from this supplier as a fallback
        if (deliveryData.supplier_id) {
          fetchAvailablePOs(deliveryData.supplier_id);
        }
      }

      // Initialize acceptance states from database values
      const states: Record<string, any> = {};
      deliveryData.lines?.forEach(line => {
        const rejected = line.quantity_rejected ?? 0;
        const received = line.quantity_received ?? line.quantity_ordered;
        // Determine state based on quantities
        let state: 'accept_all' | 'reject_all' | 'partial' = 'accept_all';
        if (rejected > 0 && received === 0) {
          state = 'reject_all';
        } else if (rejected > 0 && received > 0) {
          state = 'partial';
        }
        states[line.id] = {
          state,
          received,
          rejected,
          rejection_reason: line.rejection_reason,
          rejection_notes: line.rejection_notes,
        };
      });
      setLineAcceptanceStates(states);

      // @salsa — Initialize goods-in data from any existing delivery_line values
      const goodsIn: Record<string, any> = {};
      deliveryData.lines?.forEach(line => {
        goodsIn[line.id] = {
          supplier_batch_code: line.supplier_batch_code || '',
          use_by_date: '',
          best_before_date: '',
          temperature_reading: line.temperature_reading ? String(line.temperature_reading) : '',
          condition_notes: '',
          expanded: false,
        };
      });
      setLineGoodsInData(goodsIn);
    } catch (error: any) {
      console.error('Error fetching delivery:', error);
      toast.error('Failed to load delivery');
    } finally {
      setLoading(false);
    }
  }

  async function saveDeliveryHeader() {
    if (!delivery) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('deliveries')
        .update({
          invoice_number: deliveryFormData.invoice_number || null,
          invoice_date: deliveryFormData.invoice_date || null,
          delivery_note_number: deliveryFormData.delivery_note_number || null,
        })
        .eq('id', deliveryId);

      if (error) throw error;
      toast.success('Invoice details updated');
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error saving delivery:', error);
      toast.error('Failed to save invoice details');
    } finally {
      setSaving(false);
    }
  }

  async function fetchStockItems() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, description')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: any) {
      console.error('Error fetching stock items:', error);
    }
  }

  /**
   * Automatically find matching POs based on supplier, date proximity, and item overlap
   */
  async function findMatchingPOs(
    supplierId: string,
    deliveryDate: string,
    deliveryLines: DeliveryLine[]
  ) {
    try {
      setAutoMatchingPO(true);

      // Get all open POs from this supplier
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select(`
          id, order_number, order_date, expected_delivery, status, subtotal, total, notes,
          lines:purchase_order_lines(
            id, purchase_order_id, product_variant_id, quantity_ordered, unit_price, line_total, quantity_received
          )
        `)
        .eq('supplier_id', supplierId)
        .eq('company_id', companyId)
        .in('status', ['sent', 'confirmed', 'partial', 'draft'])
        .order('expected_delivery', { ascending: false });

      console.log('🔍 [POMatching] Query result:', { error, posCount: pos?.length, supplierId, companyId });

      if (error) {
        console.error('🔍 [POMatching] Query error:', error);
        throw error;
      }
      if (!pos || pos.length === 0) {
        console.log('🔍 [POMatching] No POs found for supplier:', supplierId);
        setSuggestedPOs([]);
        return;
      }

      console.log('🔍 [POMatching] Found POs:', pos.map((p: PurchaseOrder) => ({
        order_number: p.order_number,
        status: p.status,
        expected_delivery: p.expected_delivery,
        linesCount: p.lines?.length
      })));

      // Get product_variant_ids from delivery lines for matching
      const deliveryVariantIds = new Set(
        deliveryLines
          .map(l => l.product_variant_id)
          .filter(Boolean)
      );

      // Score each PO based on:
      // 1. Date proximity (expected_delivery vs delivery_date)
      // 2. Item overlap (by product_variant_id)
      const deliveryDateObj = new Date(deliveryDate);

      const scoredPOs = pos.map((po: PurchaseOrder) => {
        let score = 0;
        const reasons: string[] = [];

        // Date proximity scoring (max 40 points)
        if (po.expected_delivery) {
          const expectedDate = new Date(po.expected_delivery);
          const daysDiff = Math.abs(
            (deliveryDateObj.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 0) {
            score += 40;
            reasons.push('Exact date match');
          } else if (daysDiff <= 1) {
            score += 35;
            reasons.push('Date within 1 day');
          } else if (daysDiff <= 3) {
            score += 25;
            reasons.push(`Date within ${Math.round(daysDiff)} days`);
          } else if (daysDiff <= 7) {
            score += 15;
            reasons.push(`Date within ${Math.round(daysDiff)} days`);
          } else {
            score += 5;
          }
        } else {
          // No expected date - use order date proximity
          const orderDate = new Date(po.order_date);
          const daysDiff = Math.abs(
            (deliveryDateObj.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 14) {
            score += 20;
            reasons.push(`Ordered ${Math.round(daysDiff)} days before delivery`);
          }
        }

        // Item overlap scoring (max 50 points)
        // Match by product_variant_id (the primary matching method)
        const poVariantIds = new Set(
          (po.lines || [])
            .map((l: PurchaseOrderLine) => l.product_variant_id)
            .filter(Boolean)
        );

        let matchingByVariant = 0;
        deliveryVariantIds.forEach(vid => {
          if (poVariantIds.has(vid)) matchingByVariant++;
        });

        // Use variant ID matching (supplier_code matching requires additional query)
        const matchingItems = matchingByVariant;
        const totalDeliveryItems = deliveryLines.length;
        const overlapPercent = totalDeliveryItems > 0
          ? (matchingItems / totalDeliveryItems) * 100
          : 0;

        if (overlapPercent >= 80) {
          score += 50;
          reasons.push(`${matchingItems}/${totalDeliveryItems} items match (${Math.round(overlapPercent)}%)`);
        } else if (overlapPercent >= 50) {
          score += 35;
          reasons.push(`${matchingItems}/${totalDeliveryItems} items match (${Math.round(overlapPercent)}%)`);
        } else if (overlapPercent >= 25) {
          score += 20;
          reasons.push(`${matchingItems}/${totalDeliveryItems} items match (${Math.round(overlapPercent)}%)`);
        } else if (matchingItems > 0) {
          score += 10;
          reasons.push(`${matchingItems} item(s) match`);
        }

        // Status bonus (10 points)
        if (po.status === 'sent' || po.status === 'confirmed') {
          score += 10;
        }

        return {
          ...po,
          matchScore: score,
          matchReason: reasons.length > 0 ? reasons.join(' • ') : 'Same supplier',
        };
      });

      // Debug logging
      console.log('🔍 [POMatching] Delivery date:', deliveryDate);
      console.log('🔍 [POMatching] Delivery variant IDs:', Array.from(deliveryVariantIds));
      console.log('🔍 [POMatching] Found', scoredPOs.length, 'POs from this supplier');
      scoredPOs.forEach((po: PurchaseOrder & { matchScore: number; matchReason: string }) => {
        const poVariantIdsList = (po.lines || [])
          .map((l: PurchaseOrderLine) => l.product_variant_id)
          .filter(Boolean);
        console.log(`  - ${po.order_number}: score ${po.matchScore}, expected: ${po.expected_delivery}, status: ${po.status}`);
        console.log(`    PO variant IDs:`, poVariantIdsList);
        console.log(`    Reason: ${po.matchReason}`);
      });

      // Sort by score descending - NO minimum threshold
      // All POs from the same supplier are relevant
      const sortedPOs = scoredPOs
        .sort((a: { matchScore: number }, b: { matchScore: number }) => b.matchScore - a.matchScore)
        .slice(0, 5); // Top 5 matches

      setSuggestedPOs(sortedPOs);
      console.log('🔍 [POMatching] Showing', sortedPOs.length, 'suggestions');

    } catch (error: any) {
      console.error('Error finding matching POs:', error);
    } finally {
      setAutoMatchingPO(false);
    }
  }

  async function fetchAvailablePOs(supplierId: string) {
    try {
      console.log('🔍 [AvailablePOs] Fetching all POs for supplier:', supplierId);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id, order_number, order_date, expected_delivery, status, subtotal, total, notes,
          lines:purchase_order_lines(
            id, purchase_order_id, product_variant_id, quantity_ordered, unit_price, line_total, quantity_received
          )
        `)
        .eq('supplier_id', supplierId)
        .eq('company_id', companyId)
        .in('status', ['draft', 'sent', 'confirmed', 'partial']) // Include draft POs
        .order('expected_delivery', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      console.log('🔍 [AvailablePOs] Found:', data?.length, 'POs');
      setAvailablePOs(data as PurchaseOrder[] || []);
    } catch (error: any) {
      console.error('Error fetching available POs:', error);
    }
  }

  async function linkDeliveryToPO(poId: string) {
    if (!delivery) return;

    try {
      setSaving(true);
      console.log('🔗 [LinkPO] Starting link - deliveryId:', deliveryId, 'poId:', poId);

      // Update delivery with purchase_order_id
      const { data: updateData, error } = await supabase
        .from('deliveries')
        .update({ purchase_order_id: poId })
        .eq('id', deliveryId)
        .select('id, purchase_order_id');

      console.log('🔗 [LinkPO] Update result:', { updateData, error });

      if (error) throw error;

      toast.success('Delivery linked to Purchase Order');
      setShowPOLinkModal(false);

      console.log('🔗 [LinkPO] Calling fetchDelivery to refresh...');
      await fetchDelivery(); // Refresh to load PO data
      console.log('🔗 [LinkPO] fetchDelivery complete, purchaseOrder state:', purchaseOrder?.order_number);
    } catch (error: any) {
      console.error('Error linking PO:', error);
      toast.error('Failed to link Purchase Order');
    } finally {
      setSaving(false);
    }
  }

  async function unlinkDeliveryFromPO() {
    if (!delivery) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('deliveries')
        .update({ purchase_order_id: null })
        .eq('id', deliveryId);

      if (error) throw error;

      toast.success('Purchase Order unlinked');
      setPurchaseOrder(null);
      setPoLinesMap(new Map());
      setPoLinesBySupplierCode(new Map());
      setPoLinesByIngredientName(new Map());
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error unlinking PO:', error);
      toast.error('Failed to unlink Purchase Order');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Save line acceptance state to database
   */
  async function saveLineAcceptance(
    lineId: string,
    state: 'accept_all' | 'reject_all',
    line: DeliveryLine,
    rejectionReason?: string
  ) {
    try {
      const received = state === 'accept_all' ? line.quantity_ordered : 0;
      const rejected = state === 'reject_all' ? line.quantity_ordered : 0;

      const { error } = await supabase
        .from('delivery_lines')
        .update({
          quantity_received: received,
          quantity_rejected: rejected,
          rejection_reason: state === 'reject_all' ? (rejectionReason || 'wrong_item') : null,
        })
        .eq('id', lineId);

      if (error) throw error;

      // Update local state
      setLineAcceptanceStates(prev => ({
        ...prev,
        [lineId]: {
          state,
          received,
          rejected,
          rejection_reason: state === 'reject_all' ? (rejectionReason || 'wrong_item') : undefined,
        },
      }));

      toast.success(state === 'accept_all' ? 'Line accepted' : 'Line rejected');
    } catch (error: any) {
      console.error('Error saving line acceptance:', error);
      toast.error('Failed to save');
    }
  }

  /**
   * Save rejection details (reason & notes)
   */
  async function saveRejectionDetails(lineId: string, reason: string, notes?: string) {
    try {
      const { error } = await supabase
        .from('delivery_lines')
        .update({
          rejection_reason: reason,
          rejection_notes: notes || null,
        })
        .eq('id', lineId);

      if (error) throw error;

      // Update local state
      setLineAcceptanceStates(prev => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          rejection_reason: reason,
          rejection_notes: notes,
        },
      }));
    } catch (error: any) {
      console.error('Error saving rejection details:', error);
      toast.error('Failed to save rejection details');
    }
  }

  async function fetchProductVariants(supplierId: string, search?: string) {
    try {
      // First get the supplier name to search ingredients_library
      const supplierName = delivery?.supplier?.name;

      if (!supplierName) {
        setProductVariants([]);
        setMatchingStockItems([]);
        return;
      }

      // Query ingredients_library where supplier matches (text field)
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name, supplier, unit, unit_cost, pack_cost, pack_size, sku')
        .eq('company_id', companyId)
        .eq('supplier', supplierName)
        .order('ingredient_name');

      if (ingredientsError) throw ingredientsError;

      let filteredIngredients = ingredients || [];

      // If search term provided, filter the list
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredIngredients = filteredIngredients.filter((ing: any) => {
          const searchText = [
            ing.ingredient_name || '',
            ing.sku || '',
          ].join(' ').toLowerCase();
          return searchText.includes(searchLower);
        });
      }

      // Map to ProductVariant-like structure for compatibility with the UI
      const mappedVariants = filteredIngredients.map((ing: any) => ({
        id: ing.id,
        stock_item_id: ing.id, // Use ingredient id as stock_item_id for now
        supplier_code: ing.sku || null,
        supplier_description: ing.ingredient_name,
        stock_item: {
          id: ing.id,
          name: ing.ingredient_name,
        },
      }));

      setProductVariants(mappedVariants as ProductVariant[]);
      setMatchingStockItems([]);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  }

  async function matchLineToVariant(lineId: string, variantId: string) {
    // Guard against double-calls (React Strict Mode, double-clicks, etc.)
    if (saving) return;

    try {
      setSaving(true);

      const variant = productVariants.find((v) => v.id === variantId);
      if (!variant) return;

      const ingredientName = variant.stock_item?.name || variant.supplier_description;

      // The variantId is actually an ingredients_library ID (not a product_variants ID)
      // We need to find the corresponding stock_item that links to this ingredient
      const ingredientId = variantId;

      // Look up the stock_item by library_item_id
      // Note: library_type is 'ingredients_library' (the table name), not 'ingredient'
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('id, name')
        .eq('library_item_id', ingredientId)
        .eq('library_type', 'ingredients_library')
        .single();

      let stockItemId: string | null = null;
      let productVariantId: string | null = null;

      if (stockItem) {
        stockItemId = stockItem.id;

        // Check if a product_variant exists for this stock_item and supplier
        const { data: existingVariant } = await supabase
          .from('product_variants')
          .select('id')
          .eq('stock_item_id', stockItemId)
          .eq('supplier_id', delivery?.supplier_id)
          .limit(1)
          .single();

        if (existingVariant) {
          productVariantId = existingVariant.id;
        }
      }

      // Update the delivery line - only set IDs if they exist
      const updateData: Record<string, unknown> = {
        match_status: 'manual_matched',
        match_confidence: 1.0,
        rejection_notes: `Matched to: ${ingredientName} (ingredient_id: ${ingredientId})`,
      };

      if (productVariantId) {
        updateData.product_variant_id = productVariantId;
      }
      if (stockItemId) {
        updateData.stock_item_id = stockItemId;
      }

      const { error } = await supabase
        .from('delivery_lines')
        .update(updateData)
        .eq('id', lineId);

      if (error) throw error;

      toast.success(`Matched to: ${ingredientName}`);
      setMatchingLineId(null);
      setSelectedVariantId('');
      setSearchTerm('');
      setMatchingStockItems([]);
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error matching line:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(error?.message || 'Failed to match line item');
    } finally {
      setSaving(false);
    }
  }

  // Match line to an existing stock item by creating a new product variant
  async function matchLineToStockItem(lineId: string, stockItemId: string, line: DeliveryLine) {
    try {
      setSaving(true);

      // Get default UOM
      const { data: uoms } = await supabase
        .from('uom')
        .select('id')
        .or('abbreviation.eq.each,abbreviation.eq.EA,abbreviation.eq.unit')
        .limit(1);

      const defaultUomId = uoms && uoms.length > 0
        ? uoms[0].id
        : (await supabase.from('uom').select('id').limit(1).single()).data?.id;

      if (!defaultUomId) {
        throw new Error('No UOM found. Please configure units of measure first.');
      }

      // Create product variant linking the stock item to this supplier
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          stock_item_id: stockItemId,
          supplier_id: delivery!.supplier_id,
          supplier_code: line.supplier_code || null,
          supplier_description: line.description,
          pack_size: 1,
          pack_unit_id: defaultUomId,
          conversion_factor: 1,
          is_approved: true,
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // Update delivery line
      const { error: lineError } = await supabase
        .from('delivery_lines')
        .update({
          product_variant_id: variant.id,
          stock_item_id: stockItemId,
          match_status: 'manual_matched',
          match_confidence: 1.0,
        })
        .eq('id', lineId);

      if (lineError) throw lineError;

      toast.success('Line matched to stock item');
      setMatchingLineId(null);
      setSearchTerm('');
      setMatchingStockItems([]);
      await fetchDelivery();
    } catch (error: any) {
      console.error('Error matching to stock item:', error);
      toast.error(error.message || 'Failed to match line item');
    } finally {
      setSaving(false);
    }
  }

  async function createStockItemFromLine(lineId: string, line: DeliveryLine) {
    try {
      setSaving(true);

      // Get default UOM (try to get "each" or first available)
      const { data: uoms } = await supabase
        .from('uom')
        .select('id')
        .or('abbreviation.eq.each,abbreviation.eq.EA,abbreviation.eq.unit')
        .limit(1);

      const defaultUomId = uoms && uoms.length > 0 
        ? uoms[0].id 
        : (await supabase.from('uom').select('id').limit(1).single()).data?.id;

      if (!defaultUomId) {
        throw new Error('No UOM found. Please configure units of measure first.');
      }

      // Get default base unit (same as pack unit for now)
      const { data: baseUoms } = await supabase
        .from('uom')
        .select('id')
        .eq('id', defaultUomId)
        .single();

      if (!baseUoms) {
        throw new Error('Base UOM not found');
      }

      // Create stock item
      const { data: stockItem, error: itemError } = await supabase
        .from('stock_items')
        .insert({
          company_id: companyId,
          name: line.description,
          description: line.description,
          base_unit_id: baseUoms.id,
          is_purchasable: true,
          is_active: true,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create product variant
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          stock_item_id: stockItem.id,
          supplier_id: delivery!.supplier_id,
          supplier_code: line.supplier_code || null,
          supplier_description: line.description,
          pack_size: line.quantity_ordered,
          pack_unit_id: defaultUomId,
          conversion_factor: 1, // 1:1 for now, can be updated later
          is_approved: true,
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // Update delivery line
      const { error: lineError } = await supabase
        .from('delivery_lines')
        .update({
          product_variant_id: variant.id,
          stock_item_id: stockItem.id,
          matched_status: 'new_item',
          match_confidence: 1.0,
        })
        .eq('id', lineId);

      if (lineError) throw lineError;

      toast.success('Stock item created and matched');
      setShowCreateItemModal(false);
      setCreatingItemLineId(null);
      await fetchDelivery();
      await fetchStockItems();
    } catch (error: any) {
      console.error('Error creating stock item:', error);
      toast.error(error.message || 'Failed to create stock item');
    } finally {
      setSaving(false);
    }
  }

  async function generateCNRequestNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const { count } = await supabase
      .from('credit_note_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('request_number', `CN-${year}-%`);

    const nextNum = ((count || 0) + 1).toString().padStart(4, '0');
    return `CN-${year}-${nextNum}`;
  }

  async function createCNFromRejections(rejectedLines: DeliveryLine[]) {
    const subtotal = rejectedLines.reduce((sum, l) => {
      const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
      return sum + (rejectedQty * l.unit_price);
    }, 0);

    const vat = rejectedLines.reduce((sum, l) => {
      const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
      const lineTotal = rejectedQty * l.unit_price;
      return sum + (lineTotal * (l.vat_rate || 0) / 100);
    }, 0);

    const requestNumber = await generateCNRequestNumber();

    const { data: cn, error: cnError } = await supabase
      .from('credit_note_requests')
      .insert({
        company_id: companyId,
        site_id: delivery!.site_id,
        supplier_id: delivery!.supplier_id,
        delivery_id: deliveryId,
        request_number: requestNumber,
        request_date: new Date().toISOString().split('T')[0],
        subtotal,
        vat,
        total: subtotal + vat,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (cnError) throw cnError;

    const linesToInsert = rejectedLines.map(line => {
      const state = lineAcceptanceStates[line.id];
      const rejectedQty = state?.rejected || 0;
      const lineTotal = rejectedQty * line.unit_price;
      const vatAmount = lineTotal * (line.vat_rate || 0) / 100;

      return {
        credit_note_request_id: cn.id,
        delivery_line_id: line.id,
        stock_item_id: line.stock_item_id || null,
        product_variant_id: line.product_variant_id || null,
        description: line.description,
        quantity: rejectedQty,
        unit_price: line.unit_price,
        line_total: lineTotal,
        vat_rate: line.vat_rate || 0,
        vat_amount: vatAmount,
        line_total_inc_vat: lineTotal + vatAmount,
        reason: state?.rejection_reason || 'other',
        notes: state?.rejection_notes || null,
        photo_url: line.rejection_photo_url || null,
      };
    });

    const { error: linesError } = await supabase
      .from('credit_note_lines')
      .insert(linesToInsert);

    if (linesError) throw linesError;

    return cn.id;
  }

  /**
   * Detect price changes by comparing invoice prices to current ingredient costs
   * Returns array of price changes requiring user review
   */
  async function detectPriceChanges(
    deliveryLines: DeliveryLine[]
  ): Promise<PriceChange[]> {
    const priceChanges: PriceChange[] = [];
    console.log(`🔍 [PriceDetection] Processing ${deliveryLines.length} delivery lines`);

    for (const line of deliveryLines) {
      console.log(`🔍 [PriceDetection] Line: ${line.description}, price: ${line.unit_price}, status: ${line.match_status}`);

      // Skip lines without price or not matched
      if (!line.unit_price || line.unit_price <= 0) {
        console.log(`  ⏭️ Skipped - no price`);
        continue;
      }
      if (!line.match_status || line.match_status === 'unmatched') {
        console.log(`  ⏭️ Skipped - unmatched`);
        continue;
      }

      let ingredientId: string | null = null;
      let packSize: number = 1;
      let ingredientName: string = '';
      let currentUnitCost: number = 0;
      let currentPackCost: number = 0;
      let currentPackSize: number = 1;

      // Method 1: Via product_variant → stock_item → ingredient
      console.log(`  🔗 Method 1: product_variant_id = ${line.product_variant_id}`);
      if (line.product_variant_id) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock_item_id, pack_size')
          .eq('id', line.product_variant_id)
          .single();

        console.log(`    → variant:`, variant, variantError ? `Error: ${variantError.message}` : '');

        if (variant?.stock_item_id) {
          const { data: stockItem, error: stockItemError } = await supabase
            .from('stock_items')
            .select('library_item_id, library_type, pack_size')
            .eq('id', variant.stock_item_id)
            .single();

          console.log(`    → stockItem:`, stockItem, stockItemError ? `Error: ${stockItemError.message}` : '');

          if (stockItem?.library_item_id && stockItem.library_type === 'ingredient') {
            ingredientId = stockItem.library_item_id;
            packSize = variant.pack_size || stockItem.pack_size || 1;
            console.log(`    ✅ Method 1 found ingredient: ${ingredientId}, packSize: ${packSize}`);
          } else {
            console.log(`    ⚠️ Method 1: stock_item has no library_item_id or library_type != 'ingredient'`);
          }
        }
      }

      // Method 2: Fallback - fuzzy match on description
      if (!ingredientId && line.description) {
        const searchTerm = line.description.split('(')[0].trim();
        console.log(`  🔍 Method 2: Searching ingredients_library for "${searchTerm}"`);

        const { data: exactMatch, error: matchError } = await supabase
          .from('ingredients_library')
          .select('id, ingredient_name, pack_size, unit_cost, pack_cost')
          .eq('company_id', companyId)
          .ilike('ingredient_name', `%${searchTerm}%`)
          .limit(1);

        console.log(`    → matches:`, exactMatch, matchError ? `Error: ${matchError.message}` : '');

        if (exactMatch && exactMatch.length > 0) {
          ingredientId = exactMatch[0].id;
          ingredientName = exactMatch[0].ingredient_name;
          currentUnitCost = exactMatch[0].unit_cost || 0;
          currentPackCost = exactMatch[0].pack_cost || 0;
          currentPackSize = parseFloat(String(exactMatch[0].pack_size)) || 1;
          console.log(`    ✅ Method 2 found: ${ingredientName}, unit_cost: ${currentUnitCost}`);

          // Extract pack size from description
          const packMatch = line.description.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/i);
          if (packMatch) {
            const value = parseFloat(packMatch[1]);
            const unit = packMatch[2].toLowerCase();
            if (unit === 'kg') packSize = value * 1000;
            else if (unit === 'g') packSize = value;
            else if (unit === 'l') packSize = value * 1000;
            else if (unit === 'ml') packSize = value;
          } else {
            packSize = currentPackSize;
          }
        }
      }

      // If we found an ingredient, get its current cost
      if (ingredientId && !ingredientName) {
        const { data: ingredient } = await supabase
          .from('ingredients_library')
          .select('ingredient_name, unit_cost, pack_cost, pack_size')
          .eq('id', ingredientId)
          .single();

        if (ingredient) {
          ingredientName = ingredient.ingredient_name;
          currentUnitCost = ingredient.unit_cost || 0;
          currentPackCost = ingredient.pack_cost || 0;
          currentPackSize = parseFloat(String(ingredient.pack_size)) || 1;
        }
      }

      // Skip if no ingredient match or no current cost to compare
      if (!ingredientId) {
        console.log(`  ⏭️ Skipped - no ingredient found`);
        continue;
      }
      if (currentUnitCost === 0) {
        console.log(`  ⏭️ Skipped - first time purchase (no existing cost for ${ingredientName})`);
        continue;
      }
      console.log(`  ✅ Found ingredient: ${ingredientName}, current cost: £${currentUnitCost}/unit`);

      // Calculate new unit cost from invoice
      const invoiceUnitCost = line.unit_price / packSize;

      // Check if price has changed (allow 0.1% tolerance for rounding)
      const changePercent = ((invoiceUnitCost - currentUnitCost) / currentUnitCost) * 100;
      console.log(`  📊 Price comparison: invoice £${invoiceUnitCost.toFixed(4)}/unit vs current £${currentUnitCost.toFixed(4)}/unit = ${changePercent.toFixed(2)}% change`);

      if (Math.abs(changePercent) > 0.1) {
        console.log(`  🚨 PRICE CHANGE DETECTED: ${changePercent.toFixed(2)}%`);
        // Price has changed - add to review list
        priceChanges.push({
          deliveryLineId: line.id,
          ingredientId,
          ingredientName,
          currentUnitCost,
          currentPackCost,
          currentPackSize,
          invoiceUnitPrice: line.unit_price,
          invoicePackSize: packSize,
          invoiceUnitCost,
          unitCostChange: invoiceUnitCost - currentUnitCost,
          unitCostChangePercent: changePercent,
          packCostChange: line.unit_price - currentPackCost,
          isSignificantChange: Math.abs(changePercent) > 10,
          isPriceIncrease: invoiceUnitCost > currentUnitCost,
          accepted: true, // Default to accepting
        });
      }
    }

    console.log(`🔍 [PriceDetection] Found ${priceChanges.length} price changes requiring review`);
    return priceChanges;
  }

  async function confirmDelivery() {
    if (!delivery) return;

    // Check if all lines are matched
    // Note: Items are considered matched if matched_status is 'manual_matched' or 'auto_matched'
    const unmatchedLines = delivery.lines?.filter(
      (l) => !l.match_status || l.match_status === 'unmatched'
    );

    if (unmatchedLines && unmatchedLines.length > 0) {
      toast.error('Please match all line items before confirming');
      return;
    }

    try {
      setSaving(true);

      // ==========================================
      // PHASE 2: DETECT PRICE CHANGES
      // ==========================================
      console.log('💰 Checking for price changes...');

      const priceChanges = await detectPriceChanges(delivery.lines || []);

      if (priceChanges.length > 0) {
        console.log(`Found ${priceChanges.length} price changes requiring review`);
        setSaving(false);
        // Show price change modal and wait for user decision
        setPriceChangesToReview(priceChanges);
        setPriceChangeModalOpen(true);
        return; // Don't confirm yet - wait for user to review
      }

      console.log('No price changes detected - proceeding with confirmation');
      // ==========================================
      // END: PRICE CHANGE DETECTION
      // ==========================================

      // Continue with normal confirmation flow
      await executeDeliveryConfirmation();

    } catch (error: any) {
      console.error('Error in confirmDelivery:', error);
      toast.error('Failed to process delivery confirmation');
      setSaving(false);
    }
  }

  /**
   * Execute the actual delivery confirmation after price changes reviewed
   * Called by confirmDelivery() or by PriceChangeReviewModal
   */
  async function executeDeliveryConfirmation(
    approvedPriceChanges?: PriceChange[]
  ) {
    if (!delivery) return;

    try {
      setSaving(true);

      // Update delivery lines with received/rejected quantities
      for (const line of delivery.lines || []) {
        const state = lineAcceptanceStates[line.id];
        const received = state?.received ?? line.quantity_ordered;
        const rejected = state?.rejected ?? 0;

        await supabase
          .from('delivery_lines')
          .update({
            quantity_ordered: line.quantity_ordered,
            quantity_received: received,
            quantity_rejected: rejected,
            rejection_reason: state?.rejection_reason || null,
            rejection_notes: state?.rejection_notes || null,
            rejection_photo_url: line.rejection_photo_url || null,
          })
          .eq('id', line.id);
      }

      // Update delivery status
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (error) throw error;

      // ========================================
      // Update stock levels and create movements
      // ========================================
      console.log('📦 [StockUpdate] Calling update_stock_on_delivery_confirm RPC...');
      console.log('📦 [StockUpdate] Parameters:', { p_delivery_id: deliveryId, p_user_id: userId });

      const { data: stockResult, error: stockError } = await supabase.rpc(
        'update_stock_on_delivery_confirm',
        {
          p_delivery_id: deliveryId,
          p_user_id: userId,
        }
      );

      if (stockError) {
        console.error('❌ [StockUpdate] RPC Error:', stockError);
        console.error('❌ [StockUpdate] Error details:', {
          message: stockError.message,
          code: stockError.code,
          details: stockError.details,
          hint: stockError.hint,
        });
        // Don't throw - stock update failure shouldn't block confirmation
        toast.error('Warning: Stock levels may not have been updated');
      } else if (stockResult) {
        console.log('✅ [StockUpdate] RPC Success:', stockResult);
        if (stockResult.success) {
          console.log(`  - Lines processed: ${stockResult.lines_processed}`);
          console.log(`  - Movements created: ${stockResult.movements_created}`);
          console.log(`  - Price history created: ${stockResult.price_history_created || 0}`);
        } else {
          console.warn('Stock update returned error:', stockResult.error);
        }
      }

      // ========================================
      // @salsa — Create batch records for traceability
      // ========================================
      let batchesCreated = 0;

      for (const line of delivery.lines || []) {
        const state = lineAcceptanceStates[line.id];
        const received = state?.received ?? line.quantity_ordered;

        // Skip fully rejected or zero-qty lines
        if (received <= 0) continue;

        // Resolve stock_item_id (directly or via product_variant)
        let stockItemId = line.stock_item_id;
        let stockUnit = 'units';

        if (!stockItemId && line.product_variant_id) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock_item_id, stock_item:stock_items(stock_unit)')
            .eq('id', line.product_variant_id)
            .single();
          stockItemId = variant?.stock_item_id;
          stockUnit = (variant as any)?.stock_item?.stock_unit || 'units';
        } else if (stockItemId) {
          const { data: si } = await supabase
            .from('stock_items')
            .select('stock_unit')
            .eq('id', stockItemId)
            .single();
          stockUnit = si?.stock_unit || 'units';
        }

        // Skip lines without a stock item (non-stock/service items)
        if (!stockItemId) continue;

        // Check if batch already exists for this delivery line (prevent duplicates)
        const { data: existingBatch } = await supabase
          .from('stock_batches')
          .select('id')
          .eq('delivery_line_id', line.id)
          .limit(1);

        if (existingBatch && existingBatch.length > 0) continue;

        const goodsIn = lineGoodsInData[line.id];

        try {
          const response = await fetch('/api/stockly/batches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_id: delivery.company_id,
              site_id: delivery.site_id,
              stock_item_id: stockItemId,
              delivery_line_id: line.id,
              supplier_batch_code: goodsIn?.supplier_batch_code || null,
              quantity_received: received,
              unit: stockUnit,
              use_by_date: goodsIn?.use_by_date || null,
              best_before_date: goodsIn?.best_before_date || null,
              temperature_on_receipt: goodsIn?.temperature_reading ? parseFloat(goodsIn.temperature_reading) : null,
              condition_notes: goodsIn?.condition_notes || null,
            }),
          });

          if (response.ok) {
            batchesCreated++;
          } else {
            const err = await response.json();
            console.error('Failed to create batch for line:', line.id, err);
          }
        } catch (batchErr) {
          // Non-blocking — batch creation failure shouldn't prevent confirmation
          console.error('Error creating batch for line:', line.id, batchErr);
        }
      }

      // ========================================
      // Update ingredient costs from invoice
      // (Modified to respect user's price change decisions)
      // ========================================
      let pricesUpdated = 0;
      let pricesRejected = 0;

      for (const line of delivery.lines || []) {
        if (!line.unit_price || line.unit_price <= 0) continue;

        // Check if user rejected this price change
        if (approvedPriceChanges) {
          const priceChange = approvedPriceChanges.find(
            pc => pc.deliveryLineId === line.id
          );
          if (priceChange && !priceChange.accepted) {
            console.log(`Skipping price update for ${priceChange.ingredientName} - user rejected`);
            pricesRejected++;
            continue;
          }
        }

        let ingredientId: string | null = null;
        let packSize: number = 1;

        // Method 1: Try via product_variant -> stock_item -> ingredient link
        if (line.product_variant_id) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock_item_id, pack_size')
            .eq('id', line.product_variant_id)
            .single();

          if (variant?.stock_item_id) {
            const { data: stockItem } = await supabase
              .from('stock_items')
              .select('library_item_id, library_type, pack_size')
              .eq('id', variant.stock_item_id)
              .single();

            if (stockItem?.library_item_id && stockItem.library_type === 'ingredient') {
              ingredientId = stockItem.library_item_id;
              packSize = variant.pack_size || stockItem.pack_size || 1;
            }
          }
        }

        // Method 2: Fallback - try to match by description to ingredients_library
        if (!ingredientId && line.description) {
          const { data: exactMatch } = await supabase
            .from('ingredients_library')
            .select('id, ingredient_name, pack_size')
            .eq('company_id', companyId)
            .ilike('ingredient_name', `%${line.description.split('(')[0].trim()}%`)
            .limit(1);

          if (exactMatch && exactMatch.length > 0) {
            ingredientId = exactMatch[0].id;
            const packMatch = line.description.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/i);
            if (packMatch) {
              const value = parseFloat(packMatch[1]);
              const unit = packMatch[2].toLowerCase();
              if (unit === 'kg') packSize = value * 1000;
              else if (unit === 'g') packSize = value;
              else if (unit === 'l') packSize = value * 1000;
              else if (unit === 'ml') packSize = value;
            } else {
              packSize = exactMatch[0].pack_size || 1;
            }
          } else {
            // Try broader search with individual words
            const words = line.description
              .split(/[\s,()]+/)
              .filter(w => w.length > 3)
              .slice(0, 2);

            for (const word of words) {
              const { data: fuzzyMatch } = await supabase
                .from('ingredients_library')
                .select('id, ingredient_name, pack_size')
                .eq('company_id', companyId)
                .ilike('ingredient_name', `%${word}%`)
                .limit(3);

              if (fuzzyMatch && fuzzyMatch.length === 1) {
                ingredientId = fuzzyMatch[0].id;
                const packMatch = line.description.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/i);
                if (packMatch) {
                  const value = parseFloat(packMatch[1]);
                  const unit = packMatch[2].toLowerCase();
                  if (unit === 'kg') packSize = value * 1000;
                  else if (unit === 'g') packSize = value;
                  else if (unit === 'l') packSize = value * 1000;
                  else if (unit === 'ml') packSize = value;
                } else {
                  packSize = fuzzyMatch[0].pack_size || 1;
                }
                break;
              }
            }
          }
        }

        // Update ingredient cost if we found a match
        if (ingredientId && packSize > 0) {
          const newUnitCost = line.unit_price / packSize;

          console.log(`Updating ingredient ${ingredientId}: ${line.description}`);
          console.log(`  Invoice price: £${line.unit_price} / ${packSize} units = £${newUnitCost.toFixed(6)}/unit`);

          const { error: updateError } = await supabase
            .from('ingredients_library')
            .update({
              unit_cost: newUnitCost,
              pack_cost: line.unit_price,
              pack_size: packSize,
            })
            .eq('id', ingredientId);

          if (updateError) {
            console.error('Failed to update ingredient cost:', updateError);
          } else {
            console.log(`  ✓ Updated successfully - cascade should propagate to recipes`);
            pricesUpdated++;
          }
        } else {
          console.log(`Could not match line to ingredient: ${line.description}`);
        }
      }
      // ========================================
      // END: Update ingredient costs
      // ========================================

      // Check for rejections (rejected items, not rejected prices)
      const rejectedLines = delivery.lines?.filter(
        l => (lineAcceptanceStates[l.id]?.rejected || 0) > 0
      ) || [];

      if (rejectedLines.length > 0) {
        const rejectedTotal = rejectedLines.reduce((sum, l) => {
          const rejectedQty = lineAcceptanceStates[l.id]?.rejected || 0;
          const lineTotal = rejectedQty * l.unit_price;
          const vatAmount = lineTotal * (l.vat_rate || 0) / 100;
          return sum + lineTotal + vatAmount;
        }, 0);

        const createCN = confirm(
          `${rejectedLines.length} item(s) were rejected totalling ${formatCurrency(rejectedTotal)}. Would you like to create a Credit Note Request?`
        );

        if (createCN) {
          const cnId = await createCNFromRejections(rejectedLines);
          toast.success('Delivery confirmed and credit note created');
          router.push(`/dashboard/stockly/credit-notes/${cnId}`);
          return;
        }
      }

      // Build success message
      let message = 'Delivery confirmed successfully';
      if (batchesCreated > 0) {
        message += `. ${batchesCreated} batch${batchesCreated > 1 ? 'es' : ''} created`;
      }
      if (pricesUpdated > 0) {
        message += `. ${pricesUpdated} price${pricesUpdated > 1 ? 's' : ''} updated`;
      }
      if (pricesRejected > 0) {
        message += `. ${pricesRejected} price change${pricesRejected > 1 ? 's' : ''} rejected`;
      }

      toast.success(message);
      router.push('/dashboard/stockly/deliveries');
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setSaving(false);
    }
  }

  function getMatchStatusIcon(status: string | null | undefined) {
    // Treat null/undefined as 'unmatched'
    const effectiveStatus = status || 'unmatched';

    const tooltips: Record<string, string> = {
      auto_matched: 'Automatically matched to existing product',
      manual_matched: 'Manually matched by user',
      new_item: 'New stock item created from this line',
      unmatched: 'Not matched - needs attention',
    };

    const tooltip = tooltips[effectiveStatus] || 'Unknown status';

    switch (effectiveStatus) {
      case 'auto_matched':
        return <CheckCircle2 className="text-green-400" size={20} title={tooltip} />;
      case 'manual_matched':
        return <CheckCircle2 className="text-blue-400" size={20} title={tooltip} />;
      case 'new_item':
        return <Plus className="text-purple-400" size={20} title={tooltip} />;
      case 'unmatched':
        return <XCircle className="text-red-400" size={20} title={tooltip} />;
      default:
        return <AlertCircle className="text-amber-400" size={20} title={tooltip} />;
    }
  }

  function getMatchStatusBadge(status: string | null | undefined) {
    // Treat null/undefined as 'unmatched'
    const effectiveStatus = status || 'unmatched';

    const styles = {
      auto_matched: 'bg-green-500/20 text-green-400 border-green-500/30',
      manual_matched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      new_item: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      unmatched: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const labels = {
      auto_matched: 'Auto-matched',
      manual_matched: 'Manual-matched',
      new_item: 'New Item',
      unmatched: 'Unmatched',
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium border ${
          styles[effectiveStatus as keyof typeof styles] || styles.unmatched
        }`}
      >
        {labels[effectiveStatus as keyof typeof labels] || effectiveStatus}
      </span>
    );
  }

  function formatCurrency(amount?: number) {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  function formatDate(dateString?: string) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-theme-primary">Loading delivery...</div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-theme-primary">Delivery not found</div>
        </div>
      </div>
    );
  }

  const unmatchedLines = delivery.lines?.filter((l) => !l.match_status || l.match_status === 'unmatched') || [];
  const canConfirm = unmatchedLines.length === 0 && delivery.status !== 'confirmed';

  // Calculate total value of rejected items
  const rejectedTotal = delivery.lines?.reduce((sum, line) => {
    const state = lineAcceptanceStates[line.id];
    const rejectedQty = state?.rejected || 0;
    const lineTotal = rejectedQty * line.unit_price;
    const vatAmount = lineTotal * (line.vat_rate || 0) / 100;
    return sum + lineTotal + vatAmount;
  }, 0) || 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[95rem] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/stockly/deliveries')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Deliveries
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-theme-primary mb-2">
                Review Delivery
              </h1>
              <p className="text-theme-tertiary text-sm">
                {delivery.supplier?.name} • {formatDate(delivery.delivery_date)}
              </p>
            </div>
            {canConfirm && (
              <Button onClick={confirmDelivery} disabled={saving} variant="secondary">
                <Save size={18} className="mr-2" />
                {saving ? 'Confirming...' : 'Confirm Delivery'}
              </Button>
            )}
          </div>
        </div>

        {/* Order vs Invoice Comparison Section */}
        {!purchaseOrder && suggestedPOs.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Matching Purchase Orders Found</h2>
                <p className="text-sm text-theme-tertiary mt-1">
                  {suggestedPOs.length} order{suggestedPOs.length > 1 ? 's' : ''} from {delivery.supplier?.name} match this delivery
                </p>
              </div>
              {autoMatchingPO && (
                <div className="text-xs text-blue-400">Searching...</div>
              )}
            </div>

            <div className="space-y-3">
              {suggestedPOs.map((po, idx) => (
                <div
                  key={po.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    idx === 0
                      ? 'bg-blue-500/10 border-blue-500/40'
                      : 'bg-white/[0.03] border-theme hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-theme-primary">{po.order_number}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            Best Match
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                          Score: {po.matchScore}
                        </span>
                      </div>
                      <div className="text-sm text-theme-tertiary mt-1">
                        Ordered: {formatDate(po.order_date)}
                        {po.expected_delivery && (
                          <span> • Expected: {formatDate(po.expected_delivery)}</span>
                        )}
                        <span> • {po.lines?.length || 0} items • {formatCurrency(po.total)}</span>
                      </div>
                      <div className="text-xs text-theme-tertiary mt-1">{po.matchReason}</div>
                    </div>
                    <Button
                      onClick={() => linkDeliveryToPO(po.id)}
                      disabled={saving}
                      variant={idx === 0 ? 'secondary' : 'outline'}
                      className="ml-4"
                    >
                      {idx === 0 ? 'Link This Order' : 'Link'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-theme flex items-center justify-between">
              <span className="text-xs text-theme-tertiary">
                Not the right order? See all orders below or <button
                  onClick={() => {
                    fetchAvailablePOs(delivery.supplier_id);
                    setShowPOLinkModal(true);
                  }}
                  className="text-blue-400 hover:underline"
                >
                  open search
                </button>
              </span>
              <button
                onClick={() => setSuggestedPOs([])}
                className="text-xs text-theme-tertiary hover:text-theme-tertiary"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Fallback: All Orders from Supplier - Shows when no PO linked */}
        {!purchaseOrder && availablePOs.length > 0 && (
          <div className={`border rounded-xl p-6 mb-6 ${
            suggestedPOs.length === 0
              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
              : 'bg-white/[0.02] border-theme'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">
                  {suggestedPOs.length === 0
                    ? `Select Purchase Order from ${delivery.supplier?.name}`
                    : `All Orders from ${delivery.supplier?.name}`}
                </h2>
                <p className="text-sm text-theme-tertiary mt-1">
                  {suggestedPOs.length === 0
                    ? `No automatic matches found. ${availablePOs.length} order${availablePOs.length > 1 ? 's' : ''} available to link manually.`
                    : `${availablePOs.length - suggestedPOs.length} additional order${(availablePOs.length - suggestedPOs.length) !== 1 ? 's' : ''} available`}
                </p>
              </div>
              {autoMatchingPO && (
                <div className="text-xs text-blue-400">Searching...</div>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availablePOs.map((po) => {
                // Check if this PO is already in suggested list (avoid duplication)
                const isInSuggested = suggestedPOs.some(spo => spo.id === po.id);
                if (isInSuggested) return null;

                return (
                  <div
                    key={po.id}
                    className="p-3 rounded-lg border bg-white/[0.02] border-theme hover:border-neutral-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-theme-primary">{po.order_number}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            po.status === 'draft'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : po.status === 'sent'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : po.status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-neutral-500/20 text-theme-tertiary border border-neutral-500/30'
                          }`}>
                            {po.status}
                          </span>
                        </div>
                        <div className="text-sm text-theme-tertiary mt-1">
                          Ordered: {formatDate(po.order_date)}
                          {po.expected_delivery && (
                            <span> • Expected: {formatDate(po.expected_delivery)}</span>
                          )}
                          <span> • {po.lines?.length || 0} items</span>
                          {po.total && <span> • {formatCurrency(po.total)}</span>}
                        </div>
                      </div>
                      <Button
                        onClick={() => linkDeliveryToPO(po.id)}
                        disabled={saving}
                        variant="outline"
                        className="ml-4 h-9 px-4 text-xs"
                      >
                        Link
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linked PO Header - Minimal, just shows PO info and Unlink */}
        {purchaseOrder && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-6 py-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-theme-primary">
                  Linked to PO: <span className="text-blue-400">{purchaseOrder.order_number}</span>
                </span>
                <span className="text-xs text-theme-tertiary">
                  Ordered: {formatDate(purchaseOrder.order_date)}
                  {purchaseOrder.expected_delivery && (
                    <span> • Expected: {formatDate(purchaseOrder.expected_delivery)}</span>
                  )}
                </span>
              </div>
              <Button
                onClick={unlinkDeliveryFromPO}
                variant="outline"
                className="text-xs h-8 px-3"
                disabled={saving}
              >
                Unlink
              </Button>
            </div>
          </div>
        )}

        {/* Invoice Header Info */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Invoice Number</label>
              <Input
                value={deliveryFormData.invoice_number}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, invoice_number: e.target.value })
                }
                placeholder="Invoice #"
              />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Invoice Date</label>
              <Input
                type="date"
                value={deliveryFormData.invoice_date}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, invoice_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Delivery Note</label>
              <Input
                value={deliveryFormData.delivery_note_number}
                onChange={(e) =>
                  setDeliveryFormData({ ...deliveryFormData, delivery_note_number: e.target.value })
                }
                placeholder="DN #"
              />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Total</label>
              <div className="text-lg font-semibold text-theme-primary">
                {formatCurrency(delivery.total)}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <Button onClick={saveDeliveryHeader} disabled={saving} variant="outline">
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Line Items</h2>
                <p className="text-sm text-theme-tertiary mt-1">
                  {unmatchedLines.length > 0
                    ? `${unmatchedLines.length} item(s) need matching`
                    : 'All items matched'}
                </p>
              </div>
              {rejectedTotal > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  <div className="text-xs text-red-400">Rejected Total</div>
                  <div className="text-lg font-bold text-red-400">{formatCurrency(rejectedTotal)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-white/[0.05] border-b border-neutral-800">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-theme-tertiary uppercase">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-theme-tertiary uppercase">
                    Description
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-theme-tertiary uppercase">
                    Code
                  </th>
                  {purchaseOrder && (
                    <th className="px-2 py-2 text-right text-xs font-medium text-blue-400 uppercase">
                      Ord
                    </th>
                  )}
                  <th className="px-2 py-2 text-right text-xs font-medium text-theme-tertiary uppercase">
                    Rec
                  </th>
                  {purchaseOrder && (
                    <th className="px-2 py-2 text-center text-xs font-medium text-theme-tertiary uppercase">
                      Diff
                    </th>
                  )}
                  {purchaseOrder && (
                    <th className="px-2 py-2 text-right text-xs font-medium text-blue-400 uppercase">
                      PO £
                    </th>
                  )}
                  <th className="px-2 py-2 text-right text-xs font-medium text-theme-tertiary uppercase">
                    Price
                  </th>
                  {purchaseOrder && (
                    <th className="px-2 py-2 text-center text-xs font-medium text-theme-tertiary uppercase">
                      Diff
                    </th>
                  )}
                  <th className="px-2 py-2 text-right text-xs font-medium text-theme-tertiary uppercase">
                    Total
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-theme-tertiary uppercase">
                    Matched To
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-theme-tertiary uppercase">
                    {purchaseOrder ? 'Accept' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {delivery.lines?.map((line) => {
                  const acceptanceState = lineAcceptanceStates[line.id] || {
                    state: 'accept_all' as const,
                    received: line.quantity_ordered,
                    rejected: 0,
                  };
                  const isPartial = acceptanceState.state === 'partial';
                  
                  return (
                    <React.Fragment key={line.id}>
                      <tr className="hover:bg-white/[0.05] transition-colors">
                        <td className="px-2 py-2 whitespace-nowrap">
                          {getMatchStatusBadge(line.match_status)}
                        </td>
                        <td className="px-2 py-2 text-sm text-theme-primary">{line.description}</td>
                        <td className="px-2 py-2 text-sm text-theme-secondary">
                          {line.supplier_code || '—'}
                        </td>
                        {purchaseOrder && (() => {
                          // Find matching PO line - try by product_variant_id first, then supplier_code, then ingredient name
                          let poLine = line.product_variant_id ? poLinesMap.get(line.product_variant_id) : null;
                          if (!poLine && line.supplier_code) {
                            const lookupCode = line.supplier_code.toLowerCase();
                            poLine = poLinesBySupplierCode.get(lookupCode) || null;
                            if (!poLine) {
                              console.log(`🔍 [POMatch] No match for supplier_code "${lookupCode}"`);
                            }
                          }
                          // Fallback: Try to match by ingredient name (for manual-matched items)
                          if (!poLine) {
                            // Get ingredient name from various sources
                            const fromVariantStock = line.product_variant?.stock_item?.name;
                            const fromVariantDesc = line.product_variant?.supplier_description;
                            const fromRejectionNotes = line.rejection_notes?.startsWith('Matched to:')
                              ? line.rejection_notes.split('(')[0].replace('Matched to:', '').trim()
                              : null;

                            const ingredientName = fromVariantStock || fromVariantDesc || fromRejectionNotes;

                            console.log(`🔍 [POMatch] Manual match lookup for line "${line.description}":`, {
                              match_status: line.match_status,
                              rejection_notes: line.rejection_notes,
                              fromVariantStock,
                              fromVariantDesc,
                              fromRejectionNotes,
                              ingredientName,
                              availableIngredients: Array.from(poLinesByIngredientName.keys()),
                            });

                            if (ingredientName) {
                              poLine = poLinesByIngredientName.get(ingredientName.toLowerCase()) || null;
                              if (poLine) {
                                console.log(`🔍 [POMatch] ✅ Matched by ingredient name "${ingredientName}" - qty:${poLine.quantity_ordered}, price:${poLine.unit_price}`);
                              } else {
                                console.log(`🔍 [POMatch] ❌ No match for ingredient "${ingredientName.toLowerCase()}"`);
                              }
                            }
                          }
                          const poQty = poLine?.quantity_ordered || 0;
                          const poPrice = poLine?.unit_price || 0;
                          const deliveredQty = line.quantity_ordered;
                          const invoicePrice = line.unit_price || 0;
                          const qtyVariance = deliveredQty - poQty;
                          const priceVariance = invoicePrice - poPrice;
                          const hasQtyVariance = poLine && qtyVariance !== 0;
                          const hasPriceVariance = poLine && poPrice > 0 && Math.abs(priceVariance) > 0.01;
                          const isShort = qtyVariance < 0;
                          const priceUp = priceVariance > 0;

                          return (
                            <>
                              {/* Ordered (PO Qty) */}
                              <td className="px-2 py-2 text-sm text-blue-400 text-right">
                                {poLine ? poQty : '—'}
                              </td>
                              {/* Delivered */}
                              <td className="px-2 py-2 text-sm text-theme-primary text-right">
                                {deliveredQty}
                              </td>
                              {/* Qty Diff */}
                              <td className="px-2 py-2 text-center">
                                {poLine ? (
                                  hasQtyVariance ? (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                      isShort
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                      {isShort ? `${qtyVariance}` : `+${qtyVariance}`}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-green-400">—</span>
                                  )
                                ) : (
                                  <span className="text-xs text-theme-tertiary">—</span>
                                )}
                              </td>
                              {/* PO Price */}
                              <td className="px-2 py-2 text-sm text-blue-400 text-right">
                                {poLine && poPrice > 0 ? formatCurrency(poPrice) : '—'}
                              </td>
                              {/* Invoice Price */}
                              <td className="px-2 py-2 text-sm text-theme-primary text-right">
                                {formatCurrency(invoicePrice)}
                              </td>
                              {/* Price Diff */}
                              <td className="px-2 py-2 text-center">
                                {poLine && poPrice > 0 ? (
                                  hasPriceVariance ? (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                      priceUp
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                      {priceUp ? '+' : ''}{formatCurrency(priceVariance)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-green-400">—</span>
                                  )
                                ) : (
                                  <span className="text-xs text-theme-tertiary">—</span>
                                )}
                              </td>
                            </>
                          );
                        })()}
                        {!purchaseOrder && (
                          <>
                            {/* Delivered (no PO) */}
                            <td className="px-2 py-2 text-sm text-theme-primary text-right">
                              {line.quantity_ordered}
                            </td>
                            {/* Invoice Price (no PO) */}
                            <td className="px-2 py-2 text-sm text-theme-primary text-right">
                              {formatCurrency(line.unit_price)}
                            </td>
                          </>
                        )}
                        {/* Total */}
                        <td className="px-2 py-2 text-sm text-theme-primary font-medium text-right">
                          {formatCurrency(line.line_total_inc_vat || line.line_total)}
                        </td>
                        <td className="px-2 py-2 text-sm text-theme-secondary">
                          {(() => {
                            // Get the best available name, filtering out "Unknown Item"
                            const candidates = [
                              line.product_variant?.stock_item?.name,
                              line.product_variant?.product_name,
                              line.product_variant?.supplier_description,
                              line.suggested_stock_item?.name,
                              line.rejection_notes?.startsWith('Matched to:')
                                ? line.rejection_notes.split('(')[0].replace('Matched to:', '').trim()
                                : null,
                              line.description, // Use invoice description as final fallback
                            ];
                            const validName = candidates.find(
                              (name) => name && name !== 'Unknown Item' && name.trim() !== ''
                            );
                            return validName || '—';
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          {(!line.match_status || line.match_status === 'unmatched') ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                onClick={() => {
                                  setMatchingLineId(line.id);
                                  setSearchTerm('');
                                  fetchProductVariants(delivery.supplier_id);
                                }}
                                variant="outline"
                                className="text-xs h-7 px-2"
                              >
                                Match
                              </Button>
                              <Button
                                onClick={() => {
                                  setCreatingItemLineId(line.id);
                                  setShowCreateItemModal(true);
                                }}
                                variant="outline"
                                className="text-xs h-7 px-2"
                              >
                                New
                              </Button>
                            </div>
                          ) : purchaseOrder ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveLineAcceptance(line.id, 'accept_all', line)}
                                disabled={saving}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                                  acceptanceState.state === 'accept_all'
                                    ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                    : 'bg-white/5 text-theme-tertiary border border-theme hover:border-green-500/50'
                                }`}
                              >
                                ✓ Accept
                              </button>
                              <button
                                onClick={() => saveLineAcceptance(line.id, 'reject_all', line, 'wrong_item')}
                                disabled={saving}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                                  acceptanceState.state === 'reject_all'
                                    ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                                    : 'bg-white/5 text-theme-tertiary border border-theme hover:border-red-500/50'
                                }`}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-green-400">✓</span>
                          )}
                        </td>
                      </tr>
                      {/* Rejection Details Row - only show when rejected */}
                      {line.match_status && line.match_status !== 'unmatched' && acceptanceState.state === 'reject_all' && (
                        <tr className="bg-red-500/5 border-l-2 border-red-500">
                          <td colSpan={purchaseOrder ? 12 : 8} className="px-2 py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-red-400 font-medium">REJECTED:</span>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={acceptanceState.rejection_reason || 'wrong_item'}
                                  onValueChange={(val) => {
                                    setLineAcceptanceStates(prev => ({
                                      ...prev,
                                      [line.id]: {
                                        ...prev[line.id],
                                        rejection_reason: val,
                                      },
                                    }));
                                    saveRejectionDetails(line.id, val, acceptanceState.rejection_notes);
                                  }}
                                  options={[
                                    { value: 'wrong_item', label: 'Wrong Item' },
                                    { value: 'damaged', label: 'Damaged' },
                                    { value: 'short_delivery', label: 'Short Delivery' },
                                    { value: 'quality_issue', label: 'Quality Issue' },
                                    { value: 'temperature_breach', label: 'Temperature Breach' },
                                    { value: 'expired', label: 'Expired' },
                                    { value: 'price_dispute', label: 'Price Dispute' },
                                    { value: 'not_ordered', label: 'Not Ordered' },
                                    { value: 'other', label: 'Other' },
                                  ]}
                                />
                              </div>
                              <Input
                                value={acceptanceState.rejection_notes || ''}
                                onChange={(e) => {
                                  setLineAcceptanceStates(prev => ({
                                    ...prev,
                                    [line.id]: {
                                      ...prev[line.id],
                                      rejection_notes: e.target.value,
                                    },
                                  }));
                                }}
                                onBlur={(e) => {
                                  if (e.target.value !== line.rejection_notes) {
                                    saveRejectionDetails(line.id, acceptanceState.rejection_reason || 'wrong_item', e.target.value);
                                  }
                                }}
                                placeholder="Notes (optional)..."
                                className="flex-1 max-w-xs"
                              />
                              <button
                                onClick={() => saveLineAcceptance(line.id, 'accept_all', line)}
                                disabled={saving}
                                className="text-xs text-theme-tertiary hover:text-white underline disabled:opacity-50"
                              >
                                Undo
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* @salsa — Goods-In Check Row: batch data for SALSA traceability */}
                      {line.match_status && line.match_status !== 'unmatched' &&
                       acceptanceState.state !== 'reject_all' && delivery.status !== 'confirmed' && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={purchaseOrder ? 12 : 8} className="px-2 py-1.5">
                            {(() => {
                              const goodsIn = lineGoodsInData[line.id];
                              if (!goodsIn) return null;
                              const hasData = !!(goodsIn.supplier_batch_code || goodsIn.use_by_date || goodsIn.best_before_date || goodsIn.temperature_reading || goodsIn.condition_notes);

                              return (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setLineGoodsInData(prev => ({
                                      ...prev,
                                      [line.id]: { ...prev[line.id], expanded: !prev[line.id]?.expanded }
                                    }))}
                                    className="flex items-center gap-1.5 text-xs text-stockly-dark dark:text-stockly hover:opacity-80 transition-opacity"
                                  >
                                    {goodsIn.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <Layers size={14} />
                                    <span>Goods-In Check</span>
                                    {hasData && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-stockly-dark dark:bg-stockly ml-1" />
                                    )}
                                  </button>

                                  {goodsIn.expanded && (
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2">
                                      <div>
                                        <label className="block text-[10px] uppercase text-theme-tertiary mb-0.5">Supplier Batch Code</label>
                                        <input
                                          type="text"
                                          value={goodsIn.supplier_batch_code}
                                          onChange={(e) => setLineGoodsInData(prev => ({
                                            ...prev,
                                            [line.id]: { ...prev[line.id], supplier_batch_code: e.target.value }
                                          }))}
                                          placeholder="e.g. SUP-2026-001"
                                          className="w-full px-2 py-1.5 bg-theme-surface border border-theme rounded text-xs text-theme-primary placeholder:text-theme-tertiary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase text-theme-tertiary mb-0.5">Use By Date</label>
                                        <input
                                          type="date"
                                          value={goodsIn.use_by_date}
                                          onChange={(e) => setLineGoodsInData(prev => ({
                                            ...prev,
                                            [line.id]: { ...prev[line.id], use_by_date: e.target.value }
                                          }))}
                                          className="w-full px-2 py-1.5 bg-theme-surface border border-theme rounded text-xs text-theme-primary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase text-theme-tertiary mb-0.5">Best Before Date</label>
                                        <input
                                          type="date"
                                          value={goodsIn.best_before_date}
                                          onChange={(e) => setLineGoodsInData(prev => ({
                                            ...prev,
                                            [line.id]: { ...prev[line.id], best_before_date: e.target.value }
                                          }))}
                                          className="w-full px-2 py-1.5 bg-theme-surface border border-theme rounded text-xs text-theme-primary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase text-theme-tertiary mb-0.5 flex items-center gap-1">
                                          <Thermometer size={10} />
                                          Temp °C
                                        </label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={goodsIn.temperature_reading}
                                          onChange={(e) => setLineGoodsInData(prev => ({
                                            ...prev,
                                            [line.id]: { ...prev[line.id], temperature_reading: e.target.value }
                                          }))}
                                          placeholder="e.g. 3.5"
                                          className="w-full px-2 py-1.5 bg-theme-surface border border-theme rounded text-xs text-theme-primary placeholder:text-theme-tertiary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase text-theme-tertiary mb-0.5">Condition Notes</label>
                                        <input
                                          type="text"
                                          value={goodsIn.condition_notes}
                                          onChange={(e) => setLineGoodsInData(prev => ({
                                            ...prev,
                                            [line.id]: { ...prev[line.id], condition_notes: e.target.value }
                                          }))}
                                          placeholder="Packaging OK, etc."
                                          className="w-full px-2 py-1.5 bg-theme-surface border border-theme rounded text-xs text-theme-primary placeholder:text-theme-tertiary"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Match Modal */}
        {matchingLineId && (
          <Dialog open={!!matchingLineId} onOpenChange={() => {
            setMatchingLineId(null);
            setSearchTerm('');
            setSelectedVariantId('');
            setMatchingStockItems([]);
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-theme-primary">
                  Match Line Item
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Show which line we're matching */}
                {(() => {
                  const matchingLine = delivery.lines?.find(l => l.id === matchingLineId);
                  return matchingLine ? (
                    <div className="bg-white/[0.05] border border-theme rounded-lg p-3">
                      <div className="text-xs text-theme-tertiary mb-1">Matching invoice line:</div>
                      <div className="text-sm text-theme-primary font-medium">{matchingLine.description}</div>
                      {matchingLine.supplier_code && (
                        <div className="text-xs text-theme-tertiary mt-1">Code: {matchingLine.supplier_code}</div>
                      )}
                    </div>
                  ) : null;
                })()}

                <div>
                  <label className="block text-sm text-theme-secondary mb-2">
                    Products from {delivery.supplier?.name || 'this supplier'} ({productVariants.length})
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
                    <Input
                      placeholder="Filter products..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        fetchProductVariants(delivery.supplier_id, e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {productVariants.length > 0 ? (
                    productVariants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          matchLineToVariant(matchingLineId, variant.id);
                        }}
                        className="w-full text-left p-3 rounded-lg border border-theme hover:border-module-fg transition-colors bg-white/[0.03]"
                      >
                        <div className="font-medium text-theme-primary">{variant.stock_item?.name || variant.supplier_description}</div>
                        <div className="text-xs text-theme-tertiary mt-1">
                          {variant.supplier_description}
                          {variant.supplier_code && ` • Code: ${variant.supplier_code}`}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-theme-tertiary text-sm">
                      {searchTerm
                        ? 'No products match your search. Try a different term or create a new item.'
                        : `No products found from ${delivery.supplier?.name || 'this supplier'}. Use "Create New" to add one.`
                      }
                    </div>
                  )}
                </div>

                {/* Cancel button */}
                <div className="pt-4 border-t border-neutral-800">
                  <Button
                    onClick={() => {
                      setMatchingLineId(null);
                      setSearchTerm('');
                      setSelectedVariantId('');
                      setMatchingStockItems([]);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create New Item Modal */}
        {showCreateItemModal && creatingItemLineId && (
          <Dialog open={showCreateItemModal} onOpenChange={setShowCreateItemModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-theme-primary">
                  Create New Stock Item
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-sm text-theme-secondary">
                  This will create a new stock item and product variant from the invoice line item.
                </p>
                <Button
                  onClick={() => {
                    const line = delivery.lines?.find((l) => l.id === creatingItemLineId);
                    if (line) {
                      createStockItemFromLine(creatingItemLineId, line);
                    }
                  }}
                  disabled={saving}
                  variant="secondary"
                  className="w-full"
                >
                  {saving ? 'Creating...' : 'Create Stock Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Price Change Review Modal (Phase 2) */}
        <PriceChangeReviewModal
          isOpen={priceChangeModalOpen}
          onClose={() => {
            setPriceChangeModalOpen(false);
            setPriceChangesToReview([]);
          }}
          priceChanges={priceChangesToReview}
          onConfirm={(approvedChanges) => {
            setPriceChangeModalOpen(false);
            executeDeliveryConfirmation(approvedChanges);
          }}
          loading={saving}
        />

        {/* Link to Purchase Order Modal */}
        {showPOLinkModal && (
          <Dialog open={showPOLinkModal} onOpenChange={setShowPOLinkModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-theme-primary">
                  Link to Purchase Order
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-sm text-theme-secondary">
                  Select a Purchase Order from <span className="text-theme-primary font-medium">{delivery.supplier?.name}</span> to compare quantities and track variances.
                </p>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {availablePOs.length > 0 ? (
                    availablePOs.map((po) => (
                      <button
                        key={po.id}
                        onClick={() => linkDeliveryToPO(po.id)}
                        disabled={saving}
                        className="w-full text-left p-4 rounded-lg border border-theme hover:border-blue-500 transition-colors bg-white/[0.03]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-theme-primary">{po.order_number}</div>
                            <div className="text-xs text-theme-tertiary mt-1">
                              Ordered: {formatDate(po.order_date)}
                              {po.expected_delivery && (
                                <span> • Expected: {formatDate(po.expected_delivery)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-theme-primary">{formatCurrency(po.total)}</div>
                            <div className="text-xs text-theme-tertiary">{po.lines?.length || 0} items</div>
                          </div>
                        </div>
                        {/* Show first few items */}
                        {po.lines && po.lines.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-theme">
                            <div className="text-xs text-theme-tertiary space-y-1">
                              {po.lines.slice(0, 3).map((line, idx) => (
                                <div key={idx}>
                                  {line.product_variant?.product_name || line.product_variant?.supplier_description || 'Item'} × {line.quantity_ordered}
                                </div>
                              ))}
                              {po.lines.length > 3 && (
                                <div className="text-theme-tertiary">+{po.lines.length - 3} more items...</div>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-theme-tertiary">
                      <p>No active Purchase Orders found for this supplier.</p>
                      <p className="text-sm mt-2">Only POs with status &quot;sent&quot;, &quot;confirmed&quot;, or &quot;partial&quot; are shown.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-800">
                  <Button
                    onClick={() => setShowPOLinkModal(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}










