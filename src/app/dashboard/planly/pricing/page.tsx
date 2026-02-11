'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { CustomerSelector } from '@/components/planly/orders/CustomerSelector';
import { PricingGrid } from '@/components/planly/pricing/PricingGrid';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  list_price: number;
}

interface CustomerPrice {
  id: string;
  product_id: string;
  unit_price: number;
  effective_to: string | null;
}

interface PriceChange {
  product_id: string;
  unit_price: number | null;
  effective_to: string | null;
  no_expiry: boolean;
}

export default function PricingPage() {
  const { siteId } = useAppContext();
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load all products with list prices
  useEffect(() => {
    if (!siteId) return;

    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        // Get all active, non-archived products
        const productsRes = await fetch(
          `/api/planly/products?siteId=${siteId}&isActive=true&archived=false`
        );
        if (!productsRes.ok) throw new Error('Failed to load products');
        const productsData = await productsRes.json();

        // Get list prices for all products
        const productsWithPrices: Product[] = [];

        for (const product of productsData) {
          // Get list price
          const priceRes = await fetch(
            `/api/planly/products/${product.id}/prices`
          );
          const prices = priceRes.ok ? await priceRes.json() : [];
          const currentPrice = prices.find((p: any) => {
            const now = new Date();
            const from = new Date(p.effective_from);
            const to = p.effective_to ? new Date(p.effective_to) : null;
            return from <= now && (!to || to >= now);
          });

          productsWithPrices.push({
            id: product.id,
            name:
              product.stockly_product?.ingredient_name ||
              product.stockly_product?.name ||
              'Unknown Product',
            list_price: currentPrice?.list_price || 0,
          });
        }

        // Sort by name
        productsWithPrices.sort((a, b) => a.name.localeCompare(b.name));

        setProducts(productsWithPrices);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadProducts();
  }, [siteId]);

  // Load customer prices when customer changes
  useEffect(() => {
    if (!customerId) {
      setCustomerPrices([]);
      return;
    }

    async function loadCustomerPrices() {
      setIsLoadingPrices(true);
      try {
        const res = await fetch(`/api/planly/customers/${customerId}/prices`);
        if (!res.ok) throw new Error('Failed to load customer prices');
        const data = await res.json();

        // Filter to current prices only
        const now = new Date();
        const currentPrices = data.filter((p: any) => {
          const from = new Date(p.effective_from);
          const to = p.effective_to ? new Date(p.effective_to) : null;
          return from <= now && (!to || to >= now);
        });

        setCustomerPrices(currentPrices);
      } catch (error) {
        console.error('Error loading customer prices:', error);
        toast.error('Failed to load customer prices');
      } finally {
        setIsLoadingPrices(false);
      }
    }

    loadCustomerPrices();
  }, [customerId]);

  const handleCustomerChange = (id: string, name: string) => {
    setCustomerId(id);
    setCustomerName(name);
  };

  const handleSave = async (prices: PriceChange[]) => {
    if (!customerId) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/planly/pricing/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          prices: prices.map((p) => ({
            product_id: p.product_id,
            unit_price: p.unit_price,
            effective_to: p.effective_to,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save prices');
      }

      const result = await res.json();
      toast.success(`Updated ${result.updated} prices`);

      // Reload customer prices
      const pricesRes = await fetch(`/api/planly/customers/${customerId}/prices`);
      if (pricesRes.ok) {
        const data = await pricesRes.json();
        const now = new Date();
        const currentPrices = data.filter((p: any) => {
          const from = new Date(p.effective_from);
          const to = p.effective_to ? new Date(p.effective_to) : null;
          return from <= now && (!to || to >= now);
        });
        setCustomerPrices(currentPrices);
      }
    } catch (error) {
      console.error('Error saving prices:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save prices'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!siteId) {
    return (
      <div className="container mx-auto py-6 text-center text-gray-500 dark:text-white/60">
        Please select a site
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Product Pricing
        </h1>
        <p className="text-sm text-gray-500 dark:text-white/60">
          Manage list prices and customer-specific pricing
        </p>
      </div>

      {/* Customer Selector */}
      <div className="max-w-sm relative z-[100]">
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Select Customer
        </label>
        <CustomerSelector
          siteId={siteId}
          value={customerId}
          onChange={handleCustomerChange}
        />
      </div>

      {/* Content */}
      {!customerId ? (
        <div className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-12 text-center">
          <p className="text-gray-500 dark:text-white/60">
            Select a customer to configure pricing
          </p>
        </div>
      ) : isLoadingProducts || isLoadingPrices ? (
        <div className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#14B8A6]" />
          <span className="ml-2 text-gray-500 dark:text-white/60">
            Loading pricing data...
          </span>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-12 text-center">
          <p className="text-gray-500 dark:text-white/60">
            No products available. Please add products first.
          </p>
        </div>
      ) : (
        <>
          {/* Customer Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60">
            <span>Editing prices for:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {customerName}
            </span>
            <span className="text-gray-400 dark:text-white/40">
              ({customerPrices.length} custom{' '}
              {customerPrices.length === 1 ? 'price' : 'prices'})
            </span>
          </div>

          <PricingGrid
            customerId={customerId}
            products={products}
            customerPrices={customerPrices}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </>
      )}
    </div>
  );
}
