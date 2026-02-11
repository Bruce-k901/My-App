'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Snowflake, Flame, ChevronDown, Check, Search, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name?: string;
  stockly_product?: {
    name: string;
  };
  can_ship_frozen: boolean;
  default_ship_state: 'baked' | 'frozen';
  is_active: boolean;
}

interface OrderLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  ship_state: 'baked' | 'frozen';
  can_ship_frozen: boolean;
}

interface ProductLineItemProps {
  siteId: string;
  customerId: string;
  line: OrderLine;
  onUpdate: (updates: Partial<OrderLine>) => void;
  onRemove: () => void;
  autoFocus?: boolean;
}

export function ProductLineItem({
  siteId,
  customerId,
  line,
  onUpdate,
  onRemove,
  autoFocus,
}: ProductLineItemProps) {
  const [open, setOpen] = useState(autoFocus || false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (siteId) {
      loadProducts();
    }
  }, [siteId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/planly/products?siteId=${siteId}&isActive=true`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductName = (product: Product): string => {
    return product.stockly_product?.name || product.name || 'Unknown Product';
  };

  const filteredProducts = products.filter(p =>
    getProductName(p).toLowerCase().includes(search.toLowerCase())
  );

  const handleProductSelect = async (product: Product) => {
    const productName = getProductName(product);

    // Get price for this customer (or default price)
    let price = 0;

    try {
      const url = customerId
        ? `/api/planly/products/${product.id}/price?customerId=${customerId}`
        : `/api/planly/products/${product.id}/price`;
      const res = await fetch(url);
      if (res.ok) {
        const priceData = await res.json();
        price = priceData.unit_price || priceData.list_price || 0;
      }
    } catch (err) {
      console.error('Failed to get price:', err);
    }

    onUpdate({
      product_id: product.id,
      product_name: productName,
      unit_price: price,
      ship_state: product.default_ship_state,
      can_ship_frozen: product.can_ship_frozen,
    });
    setOpen(false);
    setSearch('');
  };

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value) || 0;
    onUpdate({ quantity: Math.max(0, qty) });
  };

  const incrementQuantity = () => {
    onUpdate({ quantity: line.quantity + 1 });
  };

  const decrementQuantity = () => {
    onUpdate({ quantity: Math.max(0, line.quantity - 1) });
  };

  const toggleShipState = () => {
    if (line.can_ship_frozen) {
      onUpdate({ ship_state: line.ship_state === 'baked' ? 'frozen' : 'baked' });
    }
  };

  const lineTotal = line.quantity * line.unit_price;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.06]">
      {/* Product Selector */}
      <div ref={containerRef} className="flex-1 relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2 rounded-lg text-left',
            'bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white',
            'hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors',
            open && 'ring-2 ring-[#14B8A6]/50'
          )}
        >
          {line.product_id ? (
            <div className="text-left min-w-0">
              <div className="font-medium truncate">{line.product_name}</div>
              <div className="text-xs text-gray-500 dark:text-white/60">
                {line.unit_price > 0 ? `£${line.unit_price.toFixed(2)} each` : 'No price set'}
              </div>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-white/40">Select product...</span>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 dark:text-white/60 transition-transform shrink-0 ml-2',
            open && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Product List */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 text-center text-gray-400 dark:text-white/40">Loading...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-white/40">No products found</div>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-white/[0.06]',
                      line.product_id === product.id && 'bg-gray-50 dark:bg-white/[0.03]'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      line.product_id === product.id
                        ? 'bg-[#14B8A6] border-[#14B8A6]'
                        : 'border-gray-300 dark:border-white/20'
                    )}>
                      {line.product_id === product.id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-white truncate">{getProductName(product)}</div>
                    </div>
                    {product.can_ship_frozen && (
                      <Snowflake className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ship State Toggle */}
      {line.product_id && line.can_ship_frozen && (
        <Button
          variant="ghost"
          onClick={toggleShipState}
          className={cn(
            'h-8 px-2 shrink-0',
            line.ship_state === 'frozen'
              ? 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
              : 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300'
          )}
          title={line.ship_state === 'frozen' ? 'Frozen' : 'Baked'}
        >
          {line.ship_state === 'frozen' ? (
            <Snowflake className="h-4 w-4" />
          ) : (
            <Flame className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Quantity Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          onClick={decrementQuantity}
          disabled={!line.product_id || line.quantity === 0}
          className="h-8 w-8 px-0 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.06]"
        >
          -
        </Button>
        <Input
          type="number"
          value={line.quantity || ''}
          onChange={(e) => handleQuantityChange(e.target.value)}
          disabled={!line.product_id}
          className="w-16 h-8 text-center bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
          min={0}
        />
        <Button
          variant="outline"
          onClick={incrementQuantity}
          disabled={!line.product_id}
          className="h-8 w-8 px-0 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.06]"
        >
          +
        </Button>
      </div>

      {/* Line Total */}
      <div className="w-24 text-right shrink-0">
        <div className="text-gray-900 dark:text-white font-medium">
          £{lineTotal.toFixed(2)}
        </div>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        onClick={onRemove}
        className="h-8 w-8 px-0 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
