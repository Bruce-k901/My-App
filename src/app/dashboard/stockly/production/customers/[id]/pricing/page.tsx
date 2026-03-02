"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Save, X } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';

interface Product {
  id: string;
  name: string;
  category?: string | null;
  unit: string;
  base_price: number;
  custom_price: number | null;
  discount_percent: number | null;
  has_custom_pricing: boolean;
}

export default function CustomPricingPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const customerId = params.id as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  useEffect(() => {
    if (customerId) {
      fetchCustomerName();
      fetchPricing();
    }
  }, [customerId]);

  const fetchCustomerName = async () => {
    try {
      const response = await fetch(`/api/stockly/customers/${customerId}`);
      const data = await response.json();
      if (response.ok && data.data) {
        setCustomerName(data.data.business_name);
      }
    } catch (error) {
      console.error('Error fetching customer name:', error);
    }
  };

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stockly/customers/${customerId}/pricing`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pricing');
      }

      setProducts(data.data || []);
    } catch (error: any) {
      console.error('Error fetching pricing:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to load pricing',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = (product: Product) => {
    setEditingProductId(product.id);
    setEditPrice(product.custom_price?.toString() || product.base_price.toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditPrice('');
  };

  const handleSavePrice = async (productId: string) => {
    try {
      const customPrice = parseFloat(editPrice);
      if (isNaN(customPrice) || customPrice < 0) {
        showToast({
          title: 'Invalid price',
          description: 'Please enter a valid price',
          type: 'error',
        });
        return;
      }

      const response = await fetch(`/api/stockly/customers/${customerId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          custom_price: customPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set custom price');
      }

      showToast({
        title: 'Price updated',
        description: 'Custom price has been set',
        type: 'success',
      });

      setEditingProductId(null);
      setEditPrice('');
      fetchPricing();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to save price',
        type: 'error',
      });
    }
  };

  const handleRemovePrice = async (productId: string) => {
    try {
      const response = await fetch(
        `/api/stockly/customers/${customerId}/pricing/${productId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove custom price');
      }

      showToast({
        title: 'Price removed',
        description: 'Reverted to standard pricing',
        type: 'success',
      });

      fetchPricing();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to remove price',
        type: 'error',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-theme-tertiary">Loading pricing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/stockly/production/customers/${customerId}`)}
              className="text-theme-tertiary hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {customerName || 'Customer'}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Custom Pricing</h1>
              <p className="text-theme-tertiary text-sm mt-1">
                Override standard prices for {customerName || 'this customer'}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.05] border-b border-white/[0.06]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-module-fg">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-module-fg">Standard Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-module-fg">Custom Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-module-fg">Discount</th>
                  <th className="text-right px-4 py-3 font-semibold text-module-fg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Product */}
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-theme-primary">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-theme-tertiary">{product.category}</div>
                        )}
                      </div>
                    </td>

                    {/* Standard Price */}
                    <td className="px-4 py-4">
                      <div className="text-theme-primary">{formatCurrency(product.base_price)}</div>
                      <div className="text-xs text-theme-tertiary">per {product.unit}</div>
                    </td>

                    {/* Custom Price */}
                    <td className="px-4 py-4">
                      {editingProductId === product.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-theme-tertiary">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 h-8 text-sm focus-visible:ring-emerald-500/50 focus-visible:border-module-fg/30"
                            autoFocus
                          />
                        </div>
                      ) : product.has_custom_pricing && product.custom_price !== null ? (
                        <div>
                          <div className="text-module-fg font-medium">
                            {formatCurrency(product.custom_price)}
                          </div>
                          <div className="text-xs text-theme-tertiary">per {product.unit}</div>
                        </div>
                      ) : (
                        <span className="text-theme-tertiary">—</span>
                      )}
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-4">
                      {product.discount_percent !== null && product.discount_percent > 0 ? (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-module-fg/10 text-emerald-500 border border-module-fg/30">
                          {product.discount_percent.toFixed(1)}% off
                        </span>
                      ) : (
                        <span className="text-theme-tertiary">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingProductId === product.id ? (
                          <>
                            <button
                              onClick={() => handleSavePrice(product.id)}
                              className="p-1.5 rounded-md hover:bg-module-fg/10 text-module-fg transition-colors"
                              aria-label="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded-md hover:bg-white/10 text-theme-tertiary transition-colors"
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {product.has_custom_pricing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleSetPrice(product)}
                                  className="px-2 py-1 text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleRemovePrice(product.id)}
                                  className="px-2 py-1 text-xs"
                                >
                                  Remove
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="secondary"
                                onClick={() => handleSetPrice(product)}
                                className="px-3 py-1.5 text-xs bg-transparent text-module-fg border border-emerald-500 hover:shadow-module-glow"
                              >
                                Set Custom Price
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-theme-tertiary">No products available</div>
          )}
        </div>
      </div>
    </div>
  );
}

